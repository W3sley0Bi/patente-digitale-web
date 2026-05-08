import { ImapFlow } from "imapflow";

interface ImapConfig {
	host: string;
	port: number;
	user: string;
	pass: string;
}

function config(): ImapConfig {
	return {
		host: process.env.E2E_IMAP_HOST ?? "imaps.aruba.it",
		port: Number(process.env.E2E_IMAP_PORT ?? 993),
		user: process.env.E2E_EMAIL_USER!,
		pass: process.env.E2E_EMAIL_PASS!,
	};
}

/**
 * Connects to IMAP, polls INBOX for an email from Supabase that arrived after
 * `since`, extracts the verification URL, replaces the redirect_to param with
 * `localRedirect` so the browser lands on localhost, then deletes the email.
 *
 * Retries every 3 s for up to `timeoutMs` ms.
 */
export async function waitForSupabaseLink(
	since: Date,
	localRedirect: string,
	timeoutMs = 60_000,
): Promise<string> {
	const cfg = config();
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const client = new ImapFlow({
			host: cfg.host,
			port: cfg.port,
			secure: true,
			auth: { user: cfg.user, pass: cfg.pass },
			logger: false,
		});

		await client.connect();
		let found: string | null = null;

		try {
			const lock = await client.getMailboxLock("INBOX");
			try {
				const uids = await client.search({ since }, { uid: true });

				for (const uid of uids) {
					const msg = await client.fetchOne(
						String(uid),
						{ source: true },
						{ uid: true },
					);
					const body = msg.source.toString("utf-8");

					// Match the Supabase verify URL — works for both signup confirm and magic link
					const match = body.match(
						/https?:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1\/verify[^"'\s<>]*/,
					);
					if (match) {
						const href = match[0]
							.replace(/=\r?\n/g, "")   // quoted-printable soft line breaks
							.replace(/=3D/gi, "=")     // quoted-printable encoded =
							.replace(/&amp;/gi, "&");  // HTML entity encoding
						const url = new URL(href);
						url.searchParams.set("redirect_to", localRedirect);
						found = url.toString();

						// Delete the email so next test run starts clean
						await client.messageDelete(String(uid), { uid: true });
						break;
					}
				}
			} finally {
				lock.release();
			}
		} finally {
			await client.logout();
		}

		if (found) return found;

		// Not found yet — wait before retrying
		await new Promise((r) => setTimeout(r, 3_000));
	}

	throw new Error(
		`Timed out after ${timeoutMs / 1000}s waiting for Supabase email in ${cfg.user}`,
	);
}
