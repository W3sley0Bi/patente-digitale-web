import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestBooking } from "@/lib/booking/api";

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
	const { t } = useTranslation();
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		if (!date || !time) return;
		setBusy(true);
		setErr(null);
		setMsg(null);
		const startsAt = new Date(`${date}T${time}:00`).toISOString();
		try {
			await requestBooking(schoolId, startsAt, schoolEmail);
			setMsg(t("booking.book.success"));
			onBooked?.();
		} catch (e) {
			const code = (e as Error).message;
			const map: Record<string, string> = {
				not_enrolled: t("booking.book.notEnrolled"),
				booking_disabled: t("booking.book.disabled"),
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
			<div className="mt-4 flex gap-2">
				<label className="text-sm">
					{t("booking.book.date")}
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="mt-1 block rounded-md border border-line bg-bg px-3 py-1.5"
					/>
				</label>
				<label className="text-sm">
					{t("booking.book.time")}
					<input
						type="time"
						step={900}
						value={time}
						onChange={(e) => setTime(e.target.value)}
						className="mt-1 block rounded-md border border-line bg-bg px-3 py-1.5"
					/>
				</label>
			</div>
			{msg && <p className="mt-3 text-sm text-brand-ink">{msg}</p>}
			{err && <p className="mt-3 text-sm text-red-600">{err}</p>}
			<button
				type="button"
				onClick={submit}
				disabled={busy}
				className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
			>
				{t("booking.book.submit")}
			</button>
		</div>
	);
}
