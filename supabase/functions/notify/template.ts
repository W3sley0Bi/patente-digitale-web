// supabase/functions/notify/template.ts
// Branded, email-client-safe HTML builders for booking emails. Table-based layout
// with inline styles only (no <style> blocks, no external CSS). Italian copy.
// Two variants: student confirmation ("Guida confermata", add-to-calendar + link to
// the guide section) and school new-request notice ("Nuova richiesta di guida", link
// to the admin calendar view). CTA URLs are passed in so they can be built from a
// configurable base URL.

const BRAND_GREEN = "#1f9e63";
const DARK_INK = "#1f2922";
const MUTED = "#5c6b63";
const BORDER = "#e2e8e4";
const CARD_BG = "#f6faf7";
// Alert accent for negative outcomes (rejection / cancellation): red header bar,
// red heading, and a tinted alert banner above the details card.
const ALERT_RED = "#d64545";
const ALERT_BG = "#fdf2f2";
const ALERT_BORDER = "#f5c2c2";
// TODO: swap this text wordmark for the hosted mascot logo once it lives at a
// stable public URL (e.g. a public Supabase Storage bucket). See docs spec.

export interface DriveDetails {
	schoolName: string;
	instructorName: string;
	/** Lesson start. Formatted for Europe/Rome in Italian. */
	start: Date;
	durationMin: number;
	schoolAddress: string;
}

/** A call-to-action button. The first button renders filled, the rest outlined. */
export interface EmailButton {
	label: string;
	url: string;
}

/** Capitalize the first letter (Intl returns e.g. "lunedì 30 giugno 2026"). */
function capitalize(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Format a Date as "Lunedì 30 giugno 2026 alle 14:30" in the Europe/Rome zone.
 */
export function formatRomeDateTime(d: Date): string {
	const date = new Intl.DateTimeFormat("it-IT", {
		timeZone: "Europe/Rome",
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(d);
	const time = new Intl.DateTimeFormat("it-IT", {
		timeZone: "Europe/Rome",
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
	return `${capitalize(date)} alle ${time}`;
}

/** Minimal HTML escaping for interpolated text values. */
function esc(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

interface EmailContent {
	heading: string;
	intro: string;
	details: DriveDetails;
	buttons: EmailButton[];
	/** Show the "an .ics is attached" note (only when we actually attach one). */
	showIcsNote: boolean;
	/** Negative outcome (rejection/cancellation): switch to the red alert theme. */
	alert?: boolean;
}

/** One label/value row inside the details card. */
function detailRow(label: string, value: string): string {
	return `
				<tr>
					<td style="padding:6px 0;font-size:13px;color:${MUTED};width:38%;vertical-align:top;">${esc(label)}</td>
					<td style="padding:6px 0;font-size:14px;color:${DARK_INK};font-weight:600;vertical-align:top;">${esc(value)}</td>
				</tr>`;
}

/** One CTA button; first is filled green, the rest are outlined. */
function buttonRow(b: EmailButton, primary: boolean): string {
	const style = primary
		? `background-color:${BRAND_GREEN};color:#ffffff;border:1px solid ${BRAND_GREEN};`
		: `background-color:#ffffff;color:${BRAND_GREEN};border:1px solid ${BRAND_GREEN};`;
	return `
						<tr>
							<td align="center" style="padding:6px 0;">
								<a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;${style}">${esc(b.label)}</a>
							</td>
						</tr>`;
}

/** Shared shell: branded header, body, details card, CTAs, footer. */
function renderShell(c: EmailContent): string {
	const d = c.details;
	const headerBg = c.alert ? ALERT_RED : BRAND_GREEN;
	const headingColor = c.alert ? ALERT_RED : DARK_INK;
	const buttons = c.buttons.map((b, i) => buttonRow(b, i === 0)).join("");
	// Red alert banner shown above the details card on negative outcomes.
	const alertBanner = c.alert
		? `
					<tr>
						<td style="padding:0 32px 4px 32px;">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ALERT_BG};border:1px solid ${ALERT_BORDER};border-radius:10px;">
								<tr>
									<td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${ALERT_RED};font-weight:600;">${esc(c.heading)}</td>
								</tr>
							</table>
						</td>
					</tr>`
		: "";
	const icsNote = c.showIcsNote
		? `
					<tr>
						<td align="center" style="padding:4px 32px 28px 32px;">
							<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">Trovi anche un file <strong>.ics</strong> in allegato da aprire con Apple Calendar o Outlook.</p>
						</td>
					</tr>`
		: "";
	return `<!DOCTYPE html>
<html lang="it">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#eef2ef;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ef;padding:24px 0;">
		<tr>
			<td align="center">
				<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
					<tr>
						<td align="center" style="background-color:${headerBg};padding:26px 24px;">
							<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:0.3px;color:#ffffff;">patentedigitale<span style="font-weight:600;opacity:0.75;">.it</span></span>
						</td>
					</tr>
					<tr>
						<td style="padding:32px 32px 8px 32px;">
							<h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${headingColor};">${esc(c.heading)}</h1>
							<p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${MUTED};">${esc(c.intro)}</p>
						</td>
					</tr>${alertBanner}
					<tr>
						<td style="padding:0 32px;">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:10px;">
								<tr>
									<td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
											${detailRow("Autoscuola", d.schoolName)}
											${detailRow("Istruttore", d.instructorName)}
											${detailRow("Data e ora", formatRomeDateTime(d.start))}
											${detailRow("Durata", `${d.durationMin} min`)}
											${detailRow("Indirizzo", d.schoolAddress)}
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td align="center" style="padding:24px 32px 8px 32px;">
							<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
								${buttons}
							</table>
						</td>
					</tr>${icsNote}
					<tr>
						<td style="border-top:1px solid ${BORDER};padding:20px 32px;margin-top:8px;">
							<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">— Patentedigitale.it</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

/**
 * Student "Guida confermata" confirmation email: add-to-calendar (Google) plus a
 * link to the student's guide section. An .ics is also attached by the caller.
 */
export function studentConfirmationEmail(
	details: DriveDetails,
	opts: { googleUrl: string; guideUrl: string },
): string {
	return renderShell({
		heading: "Guida confermata",
		intro:
			"La tua guida è stata confermata. Trovi qui sotto tutti i dettagli, puoi aggiungerla al calendario o aprire le tue guide.",
		details,
		buttons: [
			{ label: "Aggiungi al calendario", url: opts.googleUrl },
			{ label: "Vai alle tue guide", url: opts.guideUrl },
		],
		showIcsNote: true,
	});
}

/**
 * Student "Guida rifiutata" rejection email: no calendar; a link back to the
 * guide section so the student can request another slot. Optional reason.
 */
export function studentDeclinedEmail(
	details: DriveDetails,
	opts: { guideUrl: string; reason?: string | null },
): string {
	const reason = opts.reason?.trim();
	return renderShell({
		heading: "Guida rifiutata",
		intro: reason
			? `La tua richiesta di guida non è stata accettata. Motivo: ${reason}. Puoi richiedere un altro orario dalle tue guide.`
			: "La tua richiesta di guida non è stata accettata. Puoi richiedere un altro orario dalle tue guide.",
		details,
		buttons: [{ label: "Vai alle tue guide", url: opts.guideUrl }],
		showIcsNote: false,
		alert: true,
	});
}

/**
 * Student "Guida annullata" cancellation email (sent when the school cancels a
 * drive, including drives it created directly). Link back to the guide section.
 */
export function studentCancelledEmail(
	details: DriveDetails,
	opts: { guideUrl: string; reason?: string | null },
): string {
	const reason = opts.reason?.trim();
	return renderShell({
		heading: "Guida annullata",
		intro: reason
			? `La tua guida è stata annullata. Motivo: ${reason}. Puoi richiedere un nuovo orario dalle tue guide.`
			: "La tua guida è stata annullata. Puoi richiedere un nuovo orario dalle tue guide.",
		details,
		buttons: [{ label: "Vai alle tue guide", url: opts.guideUrl }],
		showIcsNote: false,
		alert: true,
	});
}

/**
 * School "Guida annullata" cancellation notice (sent when the student cancels a
 * drive). Link to the admin calendar view.
 */
export function schoolCancelledEmail(
	details: DriveDetails,
	opts: { calendarUrl: string; reason?: string | null },
): string {
	const reason = opts.reason?.trim();
	return renderShell({
		heading: "Guida annullata",
		intro: reason
			? `Lo studente ha annullato una guida. Motivo: ${reason}. Trovi i dettagli qui sotto.`
			: "Lo studente ha annullato una guida. Trovi i dettagli qui sotto.",
		details,
		buttons: [{ label: "Vai al calendario", url: opts.calendarUrl }],
		showIcsNote: false,
		alert: true,
	});
}

/**
 * School "Nuova richiesta di guida" notice email: a single button to the admin
 * calendar view (no calendar attachment for the school).
 */
export function schoolRequestEmail(
	details: DriveDetails,
	opts: { calendarUrl: string },
): string {
	return renderShell({
		heading: "Nuova richiesta di guida",
		intro:
			"Hai ricevuto una nuova richiesta di guida. Trovi qui sotto i dettagli; aprila nel calendario per gestirla.",
		details,
		buttons: [{ label: "Vai al calendario", url: opts.calendarUrl }],
		showIcsNote: false,
	});
}
