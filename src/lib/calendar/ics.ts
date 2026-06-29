// RFC 5545 (iCalendar) helpers — no date libraries, native Date + Intl only.
// Produces a single-event VCALENDAR string, triggers an .ics download, and
// builds a Google Calendar "add event" URL. Shared by AddToCalendar (one-tap)
// and the calendar-feed edge function (which folds multiple VEVENTs itself).

const PRODID = "-//patentedigitale.it//Booking//IT";
const CRLF = "\r\n";

/** Two-digit zero-pad. */
function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/**
 * Format a Date as a UTC iCalendar timestamp: `YYYYMMDDTHHMMSSZ`.
 * Always emitted in Zulu (UTC) form so the event is timezone-unambiguous.
 */
export function toIcsUtc(d: Date): string {
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

/**
 * Escape a value for a TEXT property per RFC 5545 §3.3.11:
 * backslash, semicolon, comma escaped; newlines become literal `\n`.
 */
export function escapeIcsText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a single content line to <=75 octets per RFC 5545 §3.1.
 * Continuation lines start with a single space. We fold on character count
 * (a safe upper bound for the ASCII-leaning content we emit).
 */
export function foldIcsLine(line: string): string {
	if (line.length <= 75) return line;
	const parts: string[] = [];
	let rest = line;
	parts.push(rest.slice(0, 75));
	rest = rest.slice(75);
	while (rest.length > 74) {
		// 74 because the leading space counts toward the 75-octet limit.
		parts.push(` ${rest.slice(0, 74)}`);
		rest = rest.slice(74);
	}
	if (rest.length > 0) parts.push(` ${rest}`);
	return parts.join(CRLF);
}

/** Join property lines into a CRLF-terminated, folded block. */
function joinLines(lines: string[]): string {
	return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

export interface IcsEventOptions {
	uid: string;
	start: Date;
	end: Date;
	title: string;
	description?: string;
	location?: string;
}

/**
 * Build one VEVENT block (no VCALENDAR wrapper). Used by the feed function to
 * concatenate many events into a single calendar.
 */
export function buildIcsVevent(opts: IcsEventOptions, dtstamp: Date): string {
	const lines: string[] = [
		"BEGIN:VEVENT",
		`UID:${opts.uid}`,
		`DTSTAMP:${toIcsUtc(dtstamp)}`,
		`DTSTART:${toIcsUtc(opts.start)}`,
		`DTEND:${toIcsUtc(opts.end)}`,
		`SUMMARY:${escapeIcsText(opts.title)}`,
	];
	if (opts.description)
		lines.push(`DESCRIPTION:${escapeIcsText(opts.description)}`);
	if (opts.location) lines.push(`LOCATION:${escapeIcsText(opts.location)}`);
	lines.push("END:VEVENT");
	return joinLines(lines).trimEnd();
}

/**
 * Build a complete single-event VCALENDAR text (RFC 5545).
 * VERSION:2.0, PRODID, one VEVENT with UTC DTSTART/DTEND, CRLF endings,
 * folded long lines, escaped TEXT values.
 */
export function buildIcsEvent(opts: IcsEventOptions): string {
	const dtstamp = new Date();
	const blocks = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		`PRODID:${PRODID}`,
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		buildIcsVevent(opts, dtstamp),
		"END:VCALENDAR",
	];
	// Each block already CRLF-internally; join with CRLF and terminate.
	return (
		blocks.map((b) => (b.includes(CRLF) ? b : foldIcsLine(b))).join(CRLF) + CRLF
	);
}

/**
 * Wrap many VEVENT blocks into one VCALENDAR. Used by the feed function.
 * `events` are pre-rendered VEVENT strings (e.g. from buildIcsVevent).
 */
export function buildIcsCalendar(events: string[]): string {
	const blocks = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		`PRODID:${PRODID}`,
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		...events,
		"END:VCALENDAR",
	];
	return (
		blocks.map((b) => (b.includes(CRLF) ? b : foldIcsLine(b))).join(CRLF) + CRLF
	);
}

/** Create a text/calendar Blob and trigger a browser download. */
export function downloadIcs(filename: string, ics: string): void {
	const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Defer revoke so the click has a chance to start the download.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface GoogleCalendarOptions {
	start: Date;
	end: Date;
	title: string;
	details?: string;
	location?: string;
}

/**
 * Build a Google Calendar "create event" URL. Google expects the dates packed
 * as `YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ` in the `dates` param (UTC form).
 */
export function googleCalendarUrl(opts: GoogleCalendarOptions): string {
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: opts.title,
		dates: `${toIcsUtc(opts.start)}/${toIcsUtc(opts.end)}`,
	});
	if (opts.details) params.set("details", opts.details);
	if (opts.location) params.set("location", opts.location);
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
