import { useState } from "react";
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

    const { error: err } = await supabase.from("claimed_schools").upsert(
      { ...form, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "place_id" }
    );

    if (err) setError(err.message);
    else { setSaved(true); onSaved?.(); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      {saved && (
        <p className="text-green-700 text-sm">
          Saved. Changes visible on the map within minutes.
        </p>
      )}

      {TEXT_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-sm capitalize">
          {field}
          <input
            value={(form[field] as string) ?? ""}
            onChange={(e) => setField(field, e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
      ))}

      <fieldset>
        <legend className="text-sm font-medium mb-2">Licenses offered</legend>
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
        Opening hours (one per line, e.g. "Lunedì: 9:00–19:00")
        <textarea
          rows={7}
          value={(form.opening_hours ?? []).join("\n")}
          onChange={(e) => setField("opening_hours", e.target.value.split("\n"))}
          className="border rounded px-3 py-2 text-sm font-mono"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
