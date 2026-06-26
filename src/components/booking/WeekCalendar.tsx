import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { groupByDay } from "@/lib/booking/helpers";
import type { Booking, Instructor } from "@/lib/booking/types";

function weekDays(from: Date): string[] {
	const monday = new Date(from);
	const day = (monday.getUTCDay() + 6) % 7; // 0 = Monday
	monday.setUTCDate(monday.getUTCDate() - day);
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(monday);
		d.setUTCDate(monday.getUTCDate() + i);
		return d.toISOString().slice(0, 10);
	});
}

export function WeekCalendar({
	bookings,
	instructors,
	weekStart,
}: {
	bookings: Booking[];
	instructors: Instructor[];
	weekStart: Date;
}) {
	const { t } = useTranslation();
	const confirmed = useMemo(
		() => bookings.filter((b) => b.status === "confirmed"),
		[bookings],
	);
	const byDay = useMemo(() => groupByDay(confirmed), [confirmed]);
	const days = useMemo(() => weekDays(weekStart), [weekStart]);
	const nameOf = (id: string | null) =>
		instructors.find((i) => i.id === id)?.name ?? "—";

	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-4">
			<h3 className="mb-3 font-sans text-lg font-black text-ink">
				{t("booking.school.calendar")}
			</h3>
			<div className="grid grid-cols-7 gap-2 text-xs">
				{days.map((day) => (
					<div key={day} className="min-h-24 rounded-lg border border-line p-2">
						<div className="mb-1 font-bold text-ink-muted">{day.slice(5)}</div>
						{(byDay[day] ?? []).map((b) => (
							<div
								key={b.id}
								className="mb-1 rounded bg-brand-soft px-1.5 py-1 text-brand-ink"
							>
								{new Date(b.starts_at).toISOString().slice(11, 16)} ·{" "}
								{nameOf(b.instructor_id)}
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
