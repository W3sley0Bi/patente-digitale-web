// supabase/functions/calendar-feed/index.ts
// Per-student secret .ics subscription feed. Calendar apps (Apple/iCloud, Google)
// poll this URL with ?token=<calendar_feed_token>; we return a text/calendar
// VCALENDAR of the student's confirmed/completed lessons (future + recent past).
// Reads with the service role so it can resolve the token without a user session.
// Deploy: supabase functions deploy calendar-feed   (or via Supabase MCP)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CRLF = "\r\n";
const PRODID = "-//patentedigitale.it//Booking//IT";

// How far back to keep already-finished lessons in the feed.
const PAST_WINDOW_DAYS = 30;

interface BookingRow {
	id: string;
	school_id: string;
	starts_at: string;
	ends_at: string;
	status: string;
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

function toIcsUtc(d: Date): string {
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

function escapeText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r\n|\r|\n/g, "\\n");
}

function foldLine(line: string): string {
	if (line.length <= 75) return line;
	const parts: string[] = [line.slice(0, 75)];
	let rest = line.slice(75);
	while (rest.length > 74) {
		parts.push(` ${rest.slice(0, 74)}`);
		rest = rest.slice(74);
	}
	if (rest.length > 0) parts.push(` ${rest}`);
	return parts.join(CRLF);
}

/** Confirmed lessons whose end is in the past read as completed (mirror of effectiveStatus). */
function effectiveStatus(status: string, endsAt: string, now: Date): string {
	if (status === "confirmed" && new Date(endsAt).getTime() <= now.getTime())
		return "completed";
	return status;
}

serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
	if (req.method !== "GET")
		return new Response("method", { status: 405, headers: CORS });

	const token = new URL(req.url).searchParams.get("token");
	if (!token)
		return new Response("missing token", { status: 400, headers: CORS });

	const url = Deno.env.get("SUPABASE_URL");
	const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!url || !serviceKey)
		return new Response("no provider", { status: 500, headers: CORS });

	const admin = createClient(url, serviceKey, {
		auth: { persistSession: false },
	});

	// Resolve the secret token → student profile.
	const { data: profile, error: profileError } = await admin
		.from("profiles")
		.select("id")
		.eq("calendar_feed_token", token)
		.maybeSingle();
	if (profileError)
		return new Response(profileError.message, { status: 500, headers: CORS });
	if (!profile)
		return new Response("unknown token", { status: 404, headers: CORS });

	const now = new Date();
	const since = new Date(
		now.getTime() - PAST_WINDOW_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();

	// bookings.student_id is a students.id — collect this user's student rows first
	const { data: studentRows, error: studentRowsError } = await admin
		.from("students")
		.select("id")
		.eq("auth_user_id", (profile as { id: string }).id);
	if (studentRowsError)
		return new Response(studentRowsError.message, {
			status: 500,
			headers: CORS,
		});
	const studentIds = ((studentRows ?? []) as { id: string }[]).map((r) => r.id);

	const { data: bookings, error: bookingsError } = await admin
		.from("bookings")
		.select("id, school_id, starts_at, ends_at, status")
		.in(
			"student_id",
			studentIds.length > 0
				? studentIds
				: ["00000000-0000-0000-0000-000000000000"],
		)
		.in("status", ["confirmed", "completed"])
		.gte("ends_at", since)
		.order("starts_at", { ascending: true });
	if (bookingsError)
		return new Response(bookingsError.message, { status: 500, headers: CORS });

	const rows = (bookings ?? []) as BookingRow[];

	// Resolve school names in one round-trip for the SUMMARY line.
	const schoolIds = [...new Set(rows.map((b) => b.school_id))];
	const schoolNames = new Map<string, string>();
	if (schoolIds.length > 0) {
		const { data: schools } = await admin
			.from("driving_schools")
			.select("id, name")
			.in("id", schoolIds);
		for (const s of (schools ?? []) as { id: string; name: string | null }[])
			if (s.name) schoolNames.set(s.id, s.name);
	}

	const dtstamp = toIcsUtc(now);
	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		`PRODID:${PRODID}`,
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:Patentedigitale",
	];

	for (const b of rows) {
		const status = effectiveStatus(b.status, b.ends_at, now);
		if (status !== "confirmed" && status !== "completed") continue;
		const school = schoolNames.get(b.school_id);
		const title = school ? `Guida — ${school}` : "Guida";
		lines.push(
			"BEGIN:VEVENT",
			`UID:booking-${b.id}@patentedigitale.it`,
			`DTSTAMP:${dtstamp}`,
			`DTSTART:${toIcsUtc(new Date(b.starts_at))}`,
			`DTEND:${toIcsUtc(new Date(b.ends_at))}`,
			`SUMMARY:${escapeText(title)}`,
		);
		if (school) lines.push(`LOCATION:${escapeText(school)}`);
		lines.push("END:VEVENT");
	}

	lines.push("END:VCALENDAR");
	const body = lines.map(foldLine).join(CRLF) + CRLF;

	return new Response(body, {
		headers: {
			...CORS,
			"Content-Type": "text/calendar; charset=utf-8",
			"Cache-Control": "no-cache, max-age=0",
		},
	});
});
