import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export interface SchoolEditorData {
  place_id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  region?: string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string[] | null;
  licenses?: string[] | null;
  lat?: number | null;
  lng?: number | null;
}

interface SchoolEditorProps {
  initial: SchoolEditorData;
  userId: string;
  onSaved?: () => void;
}

const ALL_LICENSES = ["AM", "A1", "A2", "A", "B1", "B", "BE", "C1", "C", "CE", "D1", "D", "DE", "CQC", "CAP", "recupero_punti"];
const TEXT_FIELDS = ["name", "address", "city", "zip", "region", "phone", "website"] as const;

export function SchoolEditor({ initial, userId, onSaved }: SchoolEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<SchoolEditorData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof SchoolEditorData>(key: K, value: SchoolEditorData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleLicense = (l: string, checked: boolean) => {
    const curr = form.licenses ?? [];
    setField("licenses", checked ? [...curr, l] : curr.filter((x) => x !== l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const { error: err } = await supabase.from("driving_schools").upsert(
      { ...form, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "place_id" }
    );

    if (err) setError(err.message);
    else { setSaved(true); onSaved?.(); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-green-700 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {t("school.editor.saved")}
        </p>
      )}

      {TEXT_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {t(`school.editor.fields.${field}`)}
          </span>
          <input
            value={(form[field] as string) ?? ""}
            onChange={(e) => setField(field, e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
      ))}

      <fieldset>
        <legend className="text-sm font-medium mb-2">{t("school.editor.licenses")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ALL_LICENSES.map((l) => (
            <label key={l} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={(form.licenses ?? []).includes(l)}
                onChange={(e) => toggleLicense(l, e.target.checked)}
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.editor.openingHours")}
        </span>
        <textarea
          rows={7}
          value={(form.opening_hours ?? []).join("\n")}
          onChange={(e) => setField("opening_hours", e.target.value.split("\n"))}
          className="border rounded-lg px-3 py-2.5 text-sm font-mono bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? t("school.editor.saving") : t("school.editor.save")}
      </Button>
    </form>
  );
}
