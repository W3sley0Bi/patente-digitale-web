import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setServiceSettings } from "@/lib/booking/api";

export function ServiceSettings({ schoolId, initialDuration, initialEnabled, onSaved }: {
  schoolId: string; initialDuration: number | null; initialEnabled: boolean; onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const [duration, setDuration] = useState(initialDuration ?? 60);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    try { await setServiceSettings(schoolId, duration, enabled); onSaved?.(); }
    catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.settings")}</h3>
      <label className="mt-4 block text-sm">
        {t("booking.school.durationLabel")}
        <input type="number" min={15} step={15} value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-1 block w-32 rounded-md border border-line bg-bg px-3 py-1.5" />
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("booking.school.enabledLabel")}
      </label>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button type="button" onClick={save} disabled={saving}
        className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {t("booking.school.save")}
      </button>
    </div>
  );
}
