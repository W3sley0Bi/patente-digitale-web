import { Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmPendingRequests, setServiceSettings } from "@/lib/booking/api";

export function ServiceSettings({
	schoolId,
	initialDuration,
	initialAutoConfirm,
	pendingCount,
	onSaved,
}: {
	schoolId: string;
	initialDuration: number | null;
	initialAutoConfirm: boolean;
	pendingCount: number;
	onSaved?: (next: { duration: number; autoConfirm: boolean }) => void;
}) {
	const { t } = useTranslation();
	// baseline = last persisted values; Save stays disabled until they diverge
	const [base, setBase] = useState({
		duration: initialDuration ?? 60,
		autoConfirm: initialAutoConfirm,
	});
	const [duration, setDuration] = useState(base.duration);
	const [autoConfirm, setAutoConfirm] = useState(base.autoConfirm);
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const dirty = duration !== base.duration || autoConfirm !== base.autoConfirm;

	const toggleAutoConfirm = () => {
		setErr(null);
		// turning ON with a pending backlog: warn that saving will confirm them all
		if (!autoConfirm && pendingCount > 0) {
			const ok = window.confirm(
				t("booking.school.autoConfirmBacklogWarn", { count: pendingCount }),
			);
			if (!ok) return;
		}
		setAutoConfirm((v) => !v);
	};

	const save = async () => {
		setSaving(true);
		setErr(null);
		const turnedOn = autoConfirm && !base.autoConfirm;
		try {
			// booking stays enabled; the on/off toggle was removed.
			await setServiceSettings(schoolId, duration, true, autoConfirm);
			if (turnedOn) await confirmPendingRequests(schoolId);
			setBase({ duration, autoConfirm });
			onSaved?.({ duration, autoConfirm });
		} catch (e) {
			setErr((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
			<h3 className="text-base font-bold tracking-tight text-ink">
				{t("booking.school.settings")}
			</h3>

			<label className="mt-4 block text-sm">
				{t("booking.school.durationLabel")}
				<input
					type="number"
					min={15}
					step={15}
					value={duration}
					onChange={(e) => setDuration(Number(e.target.value))}
					className="mt-1 block w-32 rounded-md border border-line bg-bg px-3 py-1.5"
				/>
			</label>

			{/* auto-confirm — Apple-style toggle, hint behind an (i) tooltip */}
			<div className="mt-5 border-t border-line pt-4">
				<div className="flex items-center gap-3">
					<label className="relative inline-block h-[25px] w-[50px] shrink-0">
						<input
							type="checkbox"
							checked={autoConfirm}
							onChange={toggleAutoConfirm}
							className="peer sr-only"
						/>
						<span
							aria-hidden
							className="absolute inset-0 rounded-full bg-gradient-to-b from-[#b3b3b3] to-[#e6e6e6] transition-colors peer-checked:from-[#4cd964] peer-checked:to-[#5de24e]"
						/>
						<span
							aria-hidden
							className="absolute top-px left-px h-[23px] w-[23px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform peer-checked:translate-x-[25px]"
						/>
					</label>
					<span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
						{t("booking.school.autoConfirmLabel")}
						<span className="group relative inline-flex">
							<button
								type="button"
								aria-label={t("booking.school.autoConfirmHint")}
								className="grid h-4 w-4 place-items-center rounded-full text-ink-faint transition-colors hover:text-brand"
							>
								<Info size={14} aria-hidden />
							</button>
							<span
								role="tooltip"
								className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink px-2.5 py-2 text-xs leading-snug font-normal text-bg opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
							>
								{t("booking.school.autoConfirmHint")}
							</span>
						</span>
					</span>
				</div>
			</div>

			{err && <p className="mt-3 text-sm text-red-600">{err}</p>}
			<button
				type="button"
				onClick={save}
				disabled={saving || !dirty}
				className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
			>
				{t("booking.school.save")}
			</button>
		</div>
	);
}
