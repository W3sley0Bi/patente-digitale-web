import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listAvailableSlots, requestBooking } from "@/lib/booking/api";
import { nextDays } from "@/lib/booking/helpers";

export function BookLessonForm({
	schoolId,
	durationMin,
	schoolEmail,
	onBooked,
}: {
	schoolId: string;
	durationMin: number;
	schoolEmail?: string;
	onBooked?: () => void;
}) {
	const { t, i18n } = useTranslation();
	const days = nextDays(14);
	const [day, setDay] = useState(days[0]);
	const [slots, setSlots] = useState<string[]>([]);
	const [loadingSlots, setLoadingSlots] = useState(false);
	const [picked, setPicked] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		setLoadingSlots(true);
		setPicked(null);
		setMsg(null);
		listAvailableSlots(schoolId, day)
			.then(setSlots)
			.catch(() => setSlots([]))
			.finally(() => setLoadingSlots(false));
	}, [schoolId, day]);

	const fmtDay = (iso: string) =>
		new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, {
			weekday: "short",
			day: "2-digit",
			month: "short",
		});
	const fmtTime = (iso: string) =>
		new Date(iso).toLocaleTimeString(i18n.language, {
			hour: "2-digit",
			minute: "2-digit",
		});

	const submit = async () => {
		if (!picked) return;
		setBusy(true);
		setErr(null);
		setMsg(null);
		try {
			await requestBooking(schoolId, picked, schoolEmail);
			setMsg(t("booking.book.success"));
			setPicked(null);
			setSlots((s) => s.filter((x) => x !== picked));
			onBooked?.();
		} catch (e) {
			const code = (e as Error).message;
			const map: Record<string, string> = {
				not_enrolled: t("booking.book.notEnrolled"),
				booking_disabled: t("booking.book.disabled"),
				slot_unavailable: t("booking.book.slotUnavailable"),
			};
			setErr(map[code] ?? t("booking.book.error"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-6">
			<h3 className="font-sans text-lg font-black text-ink">
				{t("booking.book.title")}
			</h3>
			<p className="mt-1 text-xs text-ink-muted">
				{t("booking.book.duration", { min: durationMin })}
			</p>

			<label className="mt-4 block text-sm">
				{t("booking.book.pickDay")}
				<select
					value={day}
					onChange={(e) => setDay(e.target.value)}
					className="mt-1 block rounded-md border border-line bg-bg px-3 py-1.5 text-sm"
				>
					{days.map((d) => (
						<option key={d} value={d}>
							{fmtDay(d)}
						</option>
					))}
				</select>
			</label>

			<p className="mt-4 text-xs font-bold text-ink-muted">
				{t("booking.book.chooseSlot")}
			</p>
			<div className="mt-2 flex flex-wrap gap-2">
				{loadingSlots ? (
					<span className="text-sm text-ink-faint">…</span>
				) : slots.length === 0 ? (
					<span className="rounded-md bg-bg px-3 py-1.5 text-sm text-ink-faint">
						{t("booking.book.noSlots")}
					</span>
				) : (
					slots.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setPicked(s)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								picked === s
									? "border-brand bg-brand text-white"
									: "border-line bg-bg text-ink hover:border-brand/40"
							}`}
						>
							{fmtTime(s)}
						</button>
					))
				)}
			</div>

			{msg && <p className="mt-3 text-sm text-brand-ink">{msg}</p>}
			{err && <p className="mt-3 text-sm text-red-600">{err}</p>}
			<button
				type="button"
				onClick={submit}
				disabled={busy || !picked}
				className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
			>
				{t("booking.book.submit")}
			</button>
		</div>
	);
}
