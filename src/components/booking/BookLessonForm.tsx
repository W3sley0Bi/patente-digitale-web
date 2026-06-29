import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listAvailableSlots, requestBooking } from "@/lib/booking/api";
import { MiniCalendar } from "./MiniCalendar";

const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
	const n = new Date();
	return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

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
	const today = todayISO();
	const [day, setDay] = useState(today);
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

	const fmtTime = (iso: string) =>
		new Date(iso).toLocaleTimeString(i18n.language, {
			hour: "2-digit",
			minute: "2-digit",
		});
	const fmtPickedDay = (iso: string) =>
		new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, {
			weekday: "long",
			day: "2-digit",
			month: "long",
		});

	// group available slots into morning / afternoon / evening
	const groups = useMemo(() => {
		const g: { key: string; label: string; items: string[] }[] = [
			{ key: "morning", label: t("booking.book.morning"), items: [] },
			{ key: "afternoon", label: t("booking.book.afternoon"), items: [] },
			{ key: "evening", label: t("booking.book.evening"), items: [] },
		];
		for (const s of slots) {
			const h = new Date(s).getHours();
			const bucket = h < 12 ? 0 : h < 18 ? 1 : 2;
			g[bucket].items.push(s);
		}
		return g.filter((x) => x.items.length > 0);
	}, [slots, t]);

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

			{/* day picker — month calendar */}
			<p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-muted">
				{t("booking.book.pickDay")}
			</p>
			<div className="mt-2">
				<MiniCalendar value={day} onChange={setDay} minISO={today} />
			</div>

			{/* slots, grouped by part of day */}
			<p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-muted">
				{t("booking.book.chooseSlot")}
			</p>
			{loadingSlots ? (
				<div className="mt-2 flex gap-2">
					{[0, 1, 2, 3].map((k) => (
						<div
							key={k}
							className="h-9 w-16 animate-pulse rounded-md bg-bg-sunken"
						/>
					))}
				</div>
			) : groups.length === 0 ? (
				<p className="mt-2 rounded-md bg-bg px-3 py-2 text-sm text-ink-faint">
					{t("booking.book.noSlots")}
				</p>
			) : (
				<div className="mt-2 space-y-3">
					{groups.map((grp) => (
						<div key={grp.key}>
							<p className="mb-1.5 text-[11px] font-semibold text-ink-faint">
								{grp.label}
							</p>
							<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
								{grp.items.map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setPicked(s)}
										className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
											picked === s
												? "border-brand bg-brand text-white"
												: "border-line bg-bg text-ink hover:border-brand/40"
										}`}
									>
										{fmtTime(s)}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{/* selection summary + confirm */}
			{picked && (
				<div className="mt-5 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3">
					<p className="text-xs text-ink-muted">
						{t("booking.book.selectedSummary")}
					</p>
					<p className="text-sm font-bold text-brand-ink">
						{fmtPickedDay(day)} · {fmtTime(picked)}
					</p>
				</div>
			)}

			{msg && <p className="mt-3 text-sm text-brand-ink">{msg}</p>}
			{err && <p className="mt-3 text-sm text-red-600">{err}</p>}

			<button
				type="button"
				onClick={submit}
				disabled={busy || !picked}
				className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
			>
				{t("booking.book.submit")}
			</button>
		</div>
	);
}
