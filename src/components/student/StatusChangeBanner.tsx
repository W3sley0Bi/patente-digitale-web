import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "@/components/booking/StatusPill";
import { listMyBookings } from "@/lib/booking/api";
import { effectiveStatus } from "@/lib/booking/helpers";
import type { Booking, BookingStatus } from "@/lib/booking/types";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SURFACED: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
	"confirmed",
	"declined",
	"cancelled",
]);

/** Timestamp the change was decided (falls back to last update). */
function changedAt(b: Booking): number {
	return new Date(b.decided_at ?? b.updated_at).getTime();
}

/** Localized relative time ("2 days ago") using native Intl, no date libs. */
function relativeTime(rtf: Intl.RelativeTimeFormat, fromMs: number): string {
	const diffMs = fromMs - Date.now();
	const abs = Math.abs(diffMs);
	const minute = 60 * 1000;
	const hour = 60 * minute;
	const day = 24 * hour;
	if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
	if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
	return rtf.format(Math.round(diffMs / day), "day");
}

export function StatusChangeBanner(): React.JSX.Element | null {
	const { t, i18n } = useTranslation();
	const [bookings, setBookings] = useState<Booking[]>([]);

	useEffect(() => {
		listMyBookings()
			.then(setBookings)
			.catch(() => setBookings([]));
	}, []);

	const recent = useMemo(() => {
		const now = Date.now();
		let best: { booking: Booking; status: BookingStatus; when: number } | null =
			null;
		for (const b of bookings) {
			const status = effectiveStatus(b);
			if (!SURFACED.has(status)) continue;
			const when = changedAt(b);
			if (Number.isNaN(when) || now - when > FOURTEEN_DAYS_MS) continue;
			if (!best || when > best.when) best = { booking: b, status, when };
		}
		return best;
	}, [bookings]);

	if (!recent) return null;

	const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });
	const when = relativeTime(rtf, recent.when);
	const datetime = new Date(recent.booking.starts_at).toLocaleString(
		i18n.language,
		{ dateStyle: "medium", timeStyle: "short" },
	);
	const messageKey = `student.dashboard.change.${recent.status}` as const;

	return (
		<div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg-raised px-5 py-4">
			<StatusPill status={recent.status} />
			<p className="text-sm text-ink">{t(messageKey, { when, datetime })}</p>
		</div>
	);
}
