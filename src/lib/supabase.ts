import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local",
	);
}

// GoTrue serializes auth operations through navigator.locks with an INFINITE
// timeout. Mobile browsers suspend tabs mid-operation, orphaning the lock, and
// every subsequent auth/REST call then queues behind it forever (spinner never
// resolves until a full reload — and even then data fetches re-deadlock).
// See supabase-js #1594 / #2111. Bound the lock: try to acquire briefly, and
// if the lock is stuck, proceed without it rather than hanging the whole app.
// Trade-off: concurrent token refreshes across tabs lose serialization, which
// at worst causes a redundant refresh — vastly better than a deadlock.
async function boundedLock<R>(
	name: string,
	_acquireTimeout: number,
	fn: () => Promise<R>,
): Promise<R> {
	if (typeof navigator === "undefined" || !navigator.locks) return await fn();
	try {
		return await navigator.locks.request(
			name,
			{ mode: "exclusive", signal: AbortSignal.timeout(3000) },
			async () => await fn(),
		);
	} catch (err) {
		// AbortError => lock is orphaned/held by a suspended tab. Run anyway.
		if (err instanceof DOMException && err.name === "AbortError")
			return await fn();
		throw err;
	}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { lock: boundedLock },
});
