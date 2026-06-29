import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setServiceSettings } from "@/lib/booking/api";

export function ServiceSettings({
	schoolId,
	initialDuration,
	initialAutoConfirm,
	onSaved,
}: {
	schoolId: string;
	initialDuration: number | null;
	initialAutoConfirm: boolean;
	onSaved?: () => void;
}) {
	const { t } = useTranslation();
	const [duration, setDuration] = useState(initialDuration ?? 60);
	const [autoConfirm, setAutoConfirm] = useState(initialAutoConfirm);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const save = async () => {
		setSaving(true);
		setErr(null);
		try {
			// booking stays enabled; the on/off toggle was removed.
			await setServiceSettings(schoolId, duration, true, autoConfirm);
			setSaved(true);
			onSaved?.();
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
					onChange={(e) => {
						setSaved(false);
						setDuration(Number(e.target.value));
					}}
					className="mt-1 block w-32 rounded-md border border-line bg-bg px-3 py-1.5"
				/>
			</label>

			{/* auto-confirm — Apple-style toggle */}
			<div className="mt-5 border-t border-line pt-4">
				<label className="flex cursor-pointer items-start gap-3 text-sm">
					<span className="relative mt-0.5 inline-block h-[25px] w-[50px] shrink-0">
						<input
							type="checkbox"
							checked={autoConfirm}
							onChange={() => {
								setSaved(false);
								setAutoConfirm((v) => !v);
							}}
							className="peer sr-only"
						/>
						<span
							aria-hidden
							className="absolute inset-0 rounded-full bg-gradient-to-b from-[#b3b3b3] to-[#e6e6e6] transition-colors peer-checked:from-[#4cd964] peer-checked:to-[#5de24e]"
						/>
						<span
							aria-hidden
							className="absolute left-px top-px h-[23px] w-[23px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform peer-checked:translate-x-[25px]"
						/>
					</span>
					<span>
						<span className="font-semibold text-ink">
							{t("booking.school.autoConfirmLabel")}
						</span>
						<span className="mt-0.5 block text-xs text-ink-muted">
							{t("booking.school.autoConfirmHint")}
						</span>
					</span>
				</label>
			</div>

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
