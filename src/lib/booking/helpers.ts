import type { Booking, BookingStatus } from "./types";

export function isCancellable(b: Booking): boolean {
	return b.status === "pending" || b.status === "confirmed";
}

/** Confirmed lessons whose end is in the past read as completed; everything else unchanged. */
export function effectiveStatus(
	b: Booking,
	now: Date = new Date(),
): BookingStatus {
	if (
		b.status === "confirmed" &&
		new Date(b.ends_at).getTime() <= now.getTime()
	)
		return "completed";
	return b.status;
}

/** Half-open interval overlap [start, end). Touching edges do not overlap. */
export function overlaps(a: Booking, b: Booking): boolean {
	return (
		new Date(a.starts_at) < new Date(b.ends_at) &&
		new Date(b.starts_at) < new Date(a.ends_at)
	);
}

/** n consecutive YYYY-MM-DD dates (UTC) starting at `from`. */
export function nextDays(n: number, from: Date = new Date()): string[] {
	const out: string[] = [];
	for (let i = 0; i < n; i++) {
		const d = new Date(
			Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + i),
		);
		out.push(d.toISOString().slice(0, 10));
	}
	return out;
}

/** Group bookings by UTC date (YYYY-MM-DD), each bucket sorted by start time. */
export function groupByDay(bookings: Booking[]): Record<string, Booking[]> {
	const out: Record<string, Booking[]> = {};
	for (const b of bookings) {
		const day = b.starts_at.slice(0, 10);
		(out[day] ??= []).push(b);
	}
	for (const day of Object.keys(out)) {
		out[day].sort((x, y) => x.starts_at.localeCompare(y.starts_at));
	}
	return out;
}
