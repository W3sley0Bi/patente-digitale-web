import type { Booking, BookingStatus } from "./types";

export function isCancellable(b: Booking, now: Date = new Date()): boolean {
	if (b.status !== "pending" && b.status !== "confirmed") {
		return false;
	}

	if (b.driving_school) {
		const { cancellation_policy, cancellation_cutoff_hours } = b.driving_school;
		if (cancellation_policy === "no_cancel") {
			return false;
		}
		if (cancellation_policy === "custom") {
			const starts = new Date(b.starts_at).getTime();
			const limit = starts - cancellation_cutoff_hours * 60 * 60 * 1000;
			if (now.getTime() >= limit) {
				return false;
			}
		}
	}

	return true;
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
			Date.UTC(
				from.getUTCFullYear(),
				from.getUTCMonth(),
				from.getUTCDate() + i,
			),
		);
		out.push(d.toISOString().slice(0, 10));
	}
	return out;
}

/** True if `iso` falls within the Monday–Sunday calendar week containing `now` (local time). */
export function isInCurrentWeek(iso: string, now: Date = new Date()): boolean {
	const day = now.getDay(); // 0=Sun..6=Sat
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const weekStart = new Date(now);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(now.getDate() + mondayOffset);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 7);
	const target = new Date(iso).getTime();
	return target >= weekStart.getTime() && target < weekEnd.getTime();
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
