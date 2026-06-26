import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type BookingHours,
	getBookingHours,
	setBookingHours,
} from "@/lib/booking/api";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function AvailabilityEditor({
	schoolId,
	onSaved,
}: {
	schoolId: string;
	onSaved?: () => void;
}) {
	const { t } = useTranslation();
	const [hours, setHours] = useState<BookingHours>({});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		getBookingHours(schoolId)
			.then(setHours)
			.catch(() => {});
	}, [schoolId]);

	const ranges = (d: number): [string, string][] => hours[String(d)] ?? [];
	const update = (d: number, next: [string, string][]) => {
		setSaved(false);
		setHours((h) => {
			const copy = { ...h };
			if (next.length === 0) delete copy[String(d)];
			else copy[String(d)] = next;
			return copy;
		});
	};
	const addRange = (d: number) => update(d, [...ranges(d), ["09:00", "13:00"]]);
	const removeRange = (d: number, idx: number) =>
		update(
			d,
			ranges(d).filter((_, i) => i !== idx),
		);
	const setRange = (d: number, idx: number, pos: 0 | 1, val: string) =>
		update(
			d,
			ranges(d).map((r, i) =>
				i === idx
					? ((pos === 0 ? [val, r[1]] : [r[0], val]) as [string, string])
					: r,
			),
		);

	const save = async () => {
		setSaving(true);
		setErr(null);
		try {
			await setBookingHours(schoolId, hours);
			setSaved(true);
			onSaved?.();
		} catch (e) {
			setErr((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-6">
			<h3 className="font-sans text-lg font-black text-ink">
				{t("booking.school.availability")}
			</h3>
			<ul className="mt-4 space-y-2">
				{WEEKDAYS.map((d) => (
					<li key={d} className="flex flex-wrap items-start gap-2 text-xs">
						<span className="w-10 pt-1.5 text-ink-muted">
							{t(`booking.school.weekday.${d}`)}
						</span>
						<div className="flex flex-1 flex-col gap-1.5">
							{ranges(d).length === 0 && (
								<span className="pt-1.5 text-ink-faint">
									{t("booking.school.closed")}
								</span>
							)}
							{ranges(d).map((r, idx) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: ranges are positional, no stable id
									key={`${d}-${idx}`}
									className="flex items-center gap-1.5"
								>
									<input
										type="time"
										step={900}
										value={r[0]}
										onChange={(e) => setRange(d, idx, 0, e.target.value)}
										className="rounded border border-line bg-bg px-1.5 py-0.5"
									/>
									<span className="text-ink-faint">–</span>
									<input
										type="time"
										step={900}
										value={r[1]}
										onChange={(e) => setRange(d, idx, 1, e.target.value)}
										className="rounded border border-line bg-bg px-1.5 py-0.5"
									/>
									<button
										type="button"
										onClick={() => removeRange(d, idx)}
										className="text-ink-faint hover:text-red-600"
										aria-label={t("booking.school.removeRange")}
									>
										✕
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => addRange(d)}
								className="self-start text-brand hover:underline"
							>
								+ {t("booking.school.addRange")}
							</button>
						</div>
					</li>
				))}
			</ul>
			{err && <p className="mt-3 text-sm text-red-600">{err}</p>}
			<button
				type="button"
				onClick={save}
				disabled={saving}
				className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
			>
				{saved ? "✓ " : ""}
				{t("booking.school.save")}
			</button>
		</div>
	);
}
