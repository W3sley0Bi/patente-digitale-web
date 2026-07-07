// supabase/functions/notify/index.ts
// Transactional email for booking events. Best-effort: callers ignore failures.
//
// Two request shapes (backward compatible):
//   a) booking-aware: { event: "booking_confirmed" | "booking_requested", bookingId }
//   b) legacy:        { event, to, body }  (enrollment_*, booking_declined, booking_cancelled)
//
// For booking events the function is booking-aware: it authorizes the caller via a
// user-scoped client (RLS), loads details with the service role, gates the school
// notice on the school's toggle and the student confirmation on the student's own
// preference, renders a branded HTML email, and attaches an .ics for confirmations.
//
// Sends over the Resend HTTP API (https://resend.com). A plain fetch() — no SMTP
// socket, no denomailer — so it stays well inside the edge worker's memory/CPU
// budget (the old SMTP path intermittently tripped WORKER_RESOURCE_LIMIT). Secrets:
//   RESEND_API_KEY  (required, "re_...")
//   RESEND_FROM     (optional display From, defaults to
//                    "Patentedigitale <noreply@patentedigitale.it>"; the domain
//                    must be verified in Resend for delivery to succeed)
// Deploy: supabase functions deploy notify   (or via Supabase MCP)

import { encodeBase64 as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildIcsEvent, googleCalendarUrl } from "./ics.ts";
import { decideRecipients } from "./routing.ts";
import {
	type DriveDetails,
	schoolCancelledEmail,
	schoolRequestEmail,
	studentCancelledEmail,
	studentConfirmationEmail,
	studentDeclinedEmail,
} from "./template.ts";

type Event =
	| "enrollment_requested"
	| "enrollment_approved"
	| "booking_requested"
	| "booking_confirmed"
	| "booking_declined"
	| "booking_cancelled";

const SUBJECTS: Record<Event, string> = {
	enrollment_requested: "Nuova richiesta di iscrizione",
	enrollment_approved: "Iscrizione approvata",
	booking_requested: "Nuova richiesta di guida",
	booking_confirmed: "Guida confermata",
	booking_declined: "Guida rifiutata",
	booking_cancelled: "Guida annullata",
};

const BOOKING_EVENTS = new Set<Event>([
	"booking_requested",
	"booking_confirmed",
	"booking_declined",
	"booking_cancelled",
]);

// App base URL for in-email links. Configurable via the APP_BASE_URL secret so
// changing the domain later needs no code change; trailing slashes trimmed.
const APP_BASE_URL = (
	Deno.env.get("APP_BASE_URL") ?? "https://patentedigitale.it"
).replace(/\/+$/, "");
const SCHOOL_CALENDAR_URL = `${APP_BASE_URL}/app/driving-school/drive-bookings`;
const STUDENT_GUIDE_URL = `${APP_BASE_URL}/app/student/drive-bookings`;

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BookingRow {
	id: string;
	starts_at: string;
	ends_at: string;
	duration_min: number;
	status: string;
	school_id: string;
	instructor_id: string | null;
	preferred_instructor_id: string | null;
	student_id: string;
	cancel_reason: string | null;
	cancelled_by: string | null;
}

interface SchoolRow {
	user_id: string;
	name: string | null;
	email: string | null;
	address: string | null;
	email_school_request: boolean;
}

interface MailSpec {
	to: string;
	subject: string;
	html: string;
	ics?: string; // raw .ics text; base64-encoded when attached
}

/** Read Resend config from edge secrets. Throws a clear error if unset. */
function resendConfig() {
	const apiKey = Deno.env.get("RESEND_API_KEY");
	if (!apiKey) throw new Error("resend_not_configured");
	const from =
		Deno.env.get("RESEND_FROM") ??
		"Patentedigitale <noreply@patentedigitale.it>";
	return { apiKey, from };
}

/** Send all queued emails via the Resend HTTP API, one request each. */
async function sendAll(specs: MailSpec[]): Promise<void> {
	if (specs.length === 0) return;
	const cfg = resendConfig();
	for (const m of specs) {
		const payload: Record<string, unknown> = {
			from: cfg.from,
			to: [m.to],
			subject: m.subject,
			html: m.html,
			...(m.ics
				? {
						attachments: [
							{
								filename: "guida.ics",
								content: base64Encode(m.ics), // base64 string
								content_type: "text/calendar; charset=utf-8; method=PUBLISH",
							},
						],
					}
				: {}),
		};
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${cfg.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const detail = await res.text();
			throw new Error(`resend_send_failed ${res.status}: ${detail}`);
		}
	}
}

/** Build the .ics text + Google Calendar URL for a drive. */
function buildCalendar(bookingId: string, details: DriveDetails, end: Date) {
	const title = `Guida — ${details.schoolName}`;
	const description = [
		`Istruttore: ${details.instructorName}`,
		`Durata: ${details.durationMin} min`,
	].join("\n");
	const ics = buildIcsEvent({
		uid: `booking-${bookingId}@patentedigitale.it`,
		start: details.start,
		end,
		title,
		description,
		location: details.schoolAddress,
	});
	const googleUrl = googleCalendarUrl({
		start: details.start,
		end,
		title,
		details: description,
		location: details.schoolAddress,
	});
	return { googleUrl, ics };
}

/** Booking-aware path: authorize, load, gate on toggles, render and send. */
async function handleBookingEvent(
	req: Request,
	event:
		| "booking_requested"
		| "booking_confirmed"
		| "booking_declined"
		| "booking_cancelled",
	bookingId: string,
): Promise<Response> {
	const url = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!url || !serviceKey)
		return new Response("missing supabase env", { status: 500, headers: CORS });

	// 1. Authorize: user-scoped client must be able to read the booking via RLS.
	const authHeader = req.headers.get("Authorization");
	if (!authHeader)
		return new Response("unauthorized", { status: 401, headers: CORS });

	const userClient = createClient(url, anonKey ?? "", {
		global: { headers: { Authorization: authHeader } },
		auth: { persistSession: false },
	});
	const { data: visible, error: visibleError } = await userClient
		.from("bookings")
		.select("id")
		.eq("id", bookingId)
		.maybeSingle();
	if (visibleError)
		return new Response(visibleError.message, { status: 500, headers: CORS });
	if (!visible)
		return new Response("forbidden", { status: 403, headers: CORS });

	// 2. Load details with the service role.
	const admin = createClient(url, serviceKey, {
		auth: { persistSession: false },
	});

	const { data: bookingData, error: bookingError } = await admin
		.from("bookings")
		.select(
			"id, starts_at, ends_at, duration_min, status, school_id, instructor_id, preferred_instructor_id, student_id, cancel_reason, cancelled_by",
		)
		.eq("id", bookingId)
		.maybeSingle();
	if (bookingError)
		return new Response(bookingError.message, { status: 500, headers: CORS });
	if (!bookingData)
		return new Response("not found", { status: 404, headers: CORS });
	const booking = bookingData as BookingRow;

	const { data: schoolData, error: schoolError } = await admin
		.from("driving_schools")
		.select("user_id, name, email, address, email_school_request")
		.eq("id", booking.school_id)
		.maybeSingle();
	if (schoolError)
		return new Response(schoolError.message, { status: 500, headers: CORS });
	if (!schoolData)
		return new Response("school not found", { status: 404, headers: CORS });
	const school = schoolData as SchoolRow;

	// Prefer the assigned instructor; on a still-pending request none is assigned
	// yet, so fall back to the student's preferred pick so the school's request
	// email shows who the student asked for.
	let instructorName = "";
	const instructorId = booking.instructor_id ?? booking.preferred_instructor_id;
	if (instructorId) {
		const { data: instructor } = await admin
			.from("instructors")
			.select("name")
			.eq("id", instructorId)
			.maybeSingle();
		instructorName = (instructor as { name: string | null } | null)?.name ?? "";
	}

	// booking.student_id is a students.id. Email resolution rule:
	// claimed row → auth.users email; unclaimed → students.email.
	const { data: studentData, error: studentRowError } = await admin
		.from("students")
		.select("auth_user_id, email")
		.eq("id", booking.student_id)
		.maybeSingle();
	if (studentRowError)
		return new Response(studentRowError.message, {
			status: 500,
			headers: CORS,
		});
	const studentRow = studentData as {
		auth_user_id: string | null;
		email: string | null;
	} | null;

	let studentEmail = "";
	let studentWantsConfirmation = true;
	if (studentRow?.auth_user_id) {
		const { data: userData, error: userError } =
			await admin.auth.admin.getUserById(studentRow.auth_user_id);
		if (userError)
			return new Response(userError.message, { status: 500, headers: CORS });
		studentEmail = userData?.user?.email ?? "";

		// Student-controlled preference; unclaimed students have no account to
		// opt out with, so they default to receiving confirmations.
		const { data: studentProfile } = await admin
			.from("profiles")
			.select("email_confirmations")
			.eq("id", studentRow.auth_user_id)
			.maybeSingle();
		studentWantsConfirmation =
			(studentProfile as { email_confirmations: boolean } | null)
				?.email_confirmations ?? true;
	} else {
		studentEmail = studentRow?.email ?? "";
	}

	// School recipient: prefer the configured address, else fall back to the
	// owner's login email so the notice always has somewhere to go.
	let schoolRecipient = school.email ?? "";
	if (!schoolRecipient) {
		const { data: ownerData } = await admin.auth.admin.getUserById(
			school.user_id,
		);
		schoolRecipient = ownerData?.user?.email ?? "";
	}

	const start = new Date(booking.starts_at);
	const end = new Date(booking.ends_at);
	const details: DriveDetails = {
		schoolName: school.name ?? "Autoscuola",
		instructorName: instructorName || "Da assegnare",
		start,
		durationMin: booking.duration_min,
		schoolAddress: school.address ?? "",
	};

	// 3. Route by event. Rules live in the pure, tested decideRecipients().
	const decision = decideRecipients({
		event,
		bookingStatus: booking.status,
		cancelledBy: booking.cancelled_by,
		emailSchoolRequest: school.email_school_request,
		schoolRecipient,
		studentWantsConfirmation,
		studentEmail,
	});

	const specs: MailSpec[] = [];
	const studentConfirmation = () => {
		// Add-to-calendar (Google + .ics) and a link to the student's guides.
		const { googleUrl, ics } = buildCalendar(booking.id, details, end);
		specs.push({
			to: studentEmail,
			subject: SUBJECTS.booking_confirmed,
			html: studentConfirmationEmail(details, {
				googleUrl,
				guideUrl: STUDENT_GUIDE_URL,
			}),
			ics,
		});
	};

	switch (event) {
		case "booking_requested":
			if (decision.school)
				specs.push({
					to: schoolRecipient,
					subject: SUBJECTS.booking_requested,
					html: schoolRequestEmail(details, {
						calendarUrl: SCHOOL_CALENDAR_URL,
					}),
				});
			if (decision.student) studentConfirmation(); // auto-confirm path
			break;
		case "booking_confirmed":
			if (decision.student) studentConfirmation();
			break;
		case "booking_declined":
			if (decision.student)
				specs.push({
					to: studentEmail,
					subject: SUBJECTS.booking_declined,
					html: studentDeclinedEmail(details, {
						guideUrl: STUDENT_GUIDE_URL,
						reason: booking.cancel_reason,
					}),
				});
			break;
		case "booking_cancelled":
			// Notify the counterparty of whoever cancelled.
			if (decision.student)
				specs.push({
					to: studentEmail,
					subject: SUBJECTS.booking_cancelled,
					html: studentCancelledEmail(details, {
						guideUrl: STUDENT_GUIDE_URL,
						reason: booking.cancel_reason,
					}),
				});
			if (decision.school)
				specs.push({
					to: schoolRecipient,
					subject: SUBJECTS.booking_cancelled,
					html: schoolCancelledEmail(details, {
						calendarUrl: SCHOOL_CALENDAR_URL,
						reason: booking.cancel_reason,
					}),
				});
			break;
	}

	if (specs.length === 0)
		return new Response(JSON.stringify({ ok: true, skipped: true }), {
			headers: { ...CORS, "Content-Type": "application/json" },
		});

	await sendAll(specs);
	return new Response(JSON.stringify({ ok: true }), {
		headers: { ...CORS, "Content-Type": "application/json" },
	});
}

/** Legacy path: simple <p> email to an explicit recipient. */
async function handleLegacyEvent(
	event: Event,
	to: string | undefined,
	body: string | undefined,
): Promise<Response> {
	const subject = SUBJECTS[event];
	if (!subject || !to)
		return new Response("bad request", { status: 400, headers: CORS });

	await sendAll([
		{
			to,
			subject,
			html: `<p>${subject}.</p>${body ? `<p>${body}</p>` : ""}<p>— Patentedigitale.it</p>`,
		},
	]);
	return new Response(JSON.stringify({ ok: true }), {
		headers: { ...CORS, "Content-Type": "application/json" },
	});
}

serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
	if (req.method !== "POST")
		return new Response("method", { status: 405, headers: CORS });
	try {
		const payload = (await req.json()) as {
			event: Event;
			bookingId?: string;
			to?: string;
			body?: string;
		};
		const { event } = payload;
		if (!event || !SUBJECTS[event])
			return new Response("bad request", { status: 400, headers: CORS });

		// Booking-aware path when a bookingId is supplied for a booking event.
		if (BOOKING_EVENTS.has(event) && payload.bookingId) {
			return await handleBookingEvent(
				req,
				event as
					| "booking_requested"
					| "booking_confirmed"
					| "booking_declined"
					| "booking_cancelled",
				payload.bookingId,
			);
		}

		// Legacy path (enrollment_*, booking_declined, booking_cancelled, or
		// booking events still invoked with { to, body }).
		return await handleLegacyEvent(event, payload.to, payload.body);
	} catch (e) {
		return new Response(String(e), { status: 500, headers: CORS });
	}
});
