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
// Sends over SMTP (e.g. Aruba). Required edge secrets:
//   SMTP_HOST  (e.g. smtps.aruba.it)
//   SMTP_PORT  (e.g. 465)
//   SMTP_USER  (full mailbox address, e.g. noreply@patentedigitale.it)
//   SMTP_PASS  (mailbox password)
//   SMTP_FROM  (optional display From, defaults to "Patentedigitale <SMTP_USER>")
// Deploy: supabase functions deploy notify   (or via Supabase MCP)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { buildIcsEvent, googleCalendarUrl } from "./ics.ts";
import { decideRecipients } from "./routing.ts";
import {
	schoolRequestEmail,
	studentConfirmationEmail,
	studentDeclinedEmail,
	type DriveDetails,
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
]);

// App base URL for in-email links. Configurable via the APP_BASE_URL secret so
// changing the domain later needs no code change; trailing slashes trimmed.
const APP_BASE_URL = (
	Deno.env.get("APP_BASE_URL") ?? "https://patentedigitale.it"
).replace(/\/+$/, "");
const SCHOOL_CALENDAR_URL = `${APP_BASE_URL}/driving-school/dashboard/guide`;
const STUDENT_GUIDE_URL = `${APP_BASE_URL}/student/dashboard/guide`;

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
	student_id: string;
	cancel_reason: string | null;
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

/** Read SMTP config from edge secrets. Throws a clear error if unset. */
function smtpConfig() {
	const host = Deno.env.get("SMTP_HOST");
	const portRaw = Deno.env.get("SMTP_PORT");
	const user = Deno.env.get("SMTP_USER");
	const pass = Deno.env.get("SMTP_PASS");
	if (!host || !portRaw || !user || !pass)
		throw new Error("smtp_not_configured");
	const port = Number(portRaw);
	const from = Deno.env.get("SMTP_FROM") ?? `Patentedigitale <${user}>`;
	return { host, port, user, pass, from };
}

/** Send all queued emails over a single SMTP connection. */
async function sendAll(specs: MailSpec[]): Promise<void> {
	if (specs.length === 0) return;
	const cfg = smtpConfig();
	const client = new SMTPClient({
		connection: {
			hostname: cfg.host,
			port: cfg.port,
			tls: cfg.port === 465, // implicit TLS on 465; STARTTLS otherwise
			auth: { username: cfg.user, password: cfg.pass },
		},
	});
	try {
		for (const m of specs) {
			await client.send({
				from: cfg.from,
				to: m.to,
				subject: m.subject,
				html: m.html,
				...(m.ics
					? {
							attachments: [
								{
									filename: "guida.ics",
									content: base64Encode(m.ics),
									encoding: "base64",
									contentType: "text/calendar; charset=utf-8; method=PUBLISH",
								},
							],
						}
					: {}),
			});
		}
	} finally {
		await client.close();
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
	event: "booking_requested" | "booking_confirmed" | "booking_declined",
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
			"id, starts_at, ends_at, duration_min, status, school_id, instructor_id, student_id, cancel_reason",
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

	let instructorName = "";
	if (booking.instructor_id) {
		const { data: instructor } = await admin
			.from("instructors")
			.select("name")
			.eq("id", booking.instructor_id)
			.maybeSingle();
		instructorName = (instructor as { name: string | null } | null)?.name ?? "";
	}

	// Student email lives in auth.users; read via the auth admin API.
	const { data: userData, error: userError } =
		await admin.auth.admin.getUserById(booking.student_id);
	if (userError)
		return new Response(userError.message, { status: 500, headers: CORS });
	const studentEmail = userData?.user?.email ?? "";

	// Student-controlled preference for receiving confirmation emails.
	const { data: studentProfile } = await admin
		.from("profiles")
		.select("email_confirmations")
		.eq("id", booking.student_id)
		.maybeSingle();
	const studentWantsConfirmation =
		(studentProfile as { email_confirmations: boolean } | null)
			?.email_confirmations ?? true;

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
		emailSchoolRequest: school.email_school_request,
		schoolRecipient,
		studentWantsConfirmation,
		studentEmail,
	});

	const specs: MailSpec[] = [];
	if (decision.school) {
		// School gets a link to the admin calendar view — no calendar attachment.
		specs.push({
			to: schoolRecipient,
			subject: SUBJECTS.booking_requested,
			html: schoolRequestEmail(details, { calendarUrl: SCHOOL_CALENDAR_URL }),
		});
	}
	if (decision.student) {
		if (event === "booking_declined") {
			// Rejection: no calendar; link back to the guide section to rebook.
			specs.push({
				to: studentEmail,
				subject: SUBJECTS.booking_declined,
				html: studentDeclinedEmail(details, {
					guideUrl: STUDENT_GUIDE_URL,
					reason: booking.cancel_reason,
				}),
			});
		} else {
			// Confirmation: add-to-calendar (Google + .ics) and a link to their guides.
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
		}
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
				event as "booking_requested" | "booking_confirmed" | "booking_declined",
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
