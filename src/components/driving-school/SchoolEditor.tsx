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
  mobile?: string | null;
  email?: string | null;
  whatsapp_business?: string | null;
  website?: string | null;
  piva?: string | null;
  founded_year?: number | null;
  description?: string | null;
  instructor_count?: number | null;
  opening_hours?: string[] | null;
  licenses?: string[] | null;
  prices?: Record<string, number> | null;
  social?: Record<string, string> | null;
  lat?: number | null;
  lng?: number | null;
}

interface SchoolEditorProps {
  initial: SchoolEditorData;
  userId: string;
  onSaved?: () => void;
}

const ALL_LICENSES = [
  "AM", "A1", "A2", "A", "B1", "B", "BE", "C1", "C", "CE", "D1", "D", "DE", "CQC", "CAP", "recupero_punti",
];
const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube"] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const sectionHeader = "text-sm font-bold uppercase tracking-wider text-ink-faint mb-3";
const inputCls =
  "border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition";
const labelSpan = "text-xs font-medium text-ink-muted uppercase tracking-wide";

export function SchoolEditor({ initial, userId, onSaved }: SchoolEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<SchoolEditorData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof SchoolEditorData>(key: K, value: SchoolEditorData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const licensesArr = Array.isArray(form.licenses) ? form.licenses : [];
  const openingHoursArr = Array.isArray(form.opening_hours) ? form.opening_hours : [];
  const pricesObj: Record<string, number> = isRecord(form.prices)
    ? (form.prices as Record<string, number>)
    : {};
  const socialObj: Record<string, string> = isRecord(form.social)
    ? (form.social as Record<string, string>)
    : {};

  const toggleLicense = (l: string, checked: boolean) => {
    const next = checked ? [...licensesArr, l] : licensesArr.filter((x) => x !== l);
    setField("licenses", next);
    if (!checked) {
      const { [l]: _omit, ...rest } = pricesObj;
      void _omit;
      setField("prices", rest);
    }
  };

  const setPrice = (l: string, raw: string) => {
    const next = { ...pricesObj };
    if (raw.trim() === "") delete next[l];
    else {
      const n = Number(raw);
      if (!Number.isNaN(n)) next[l] = n;
    }
    setField("prices", next);
  };

  const setSocial = (key: SocialKey, raw: string) => {
    const next = { ...socialObj };
    if (raw.trim() === "") delete next[key];
    else next[key] = raw.trim();
    setField("social", next);
  };

  const trimToNull = (v: unknown): string | null => {
    if (typeof v !== "string") return v == null ? null : String(v);
    const t = v.trim();
    return t === "" ? null : t;
  };

  const intOrNull = (v: unknown): number | null => {
    if (v === "" || v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.name.trim()) return;
    setLoading(true);
    setError(null);
    setSaved(false);

    const cleanLicenses = Array.isArray(form.licenses) ? form.licenses : [];
    const cleanPrices: Record<string, number> = {};
    for (const [k, v] of Object.entries(pricesObj)) {
      if (cleanLicenses.includes(k) && typeof v === "number" && Number.isFinite(v)) {
        cleanPrices[k] = v;
      }
    }
    const cleanSocial: Record<string, string> = {};
    for (const k of SOCIAL_KEYS) {
      const v = socialObj[k];
      if (typeof v === "string" && v.trim() !== "") cleanSocial[k] = v.trim();
    }

    const payload = {
      place_id: form.place_id,
      user_id: userId,
      name: trimToNull(form.name),
      address: trimToNull(form.address),
      city: trimToNull(form.city),
      zip: trimToNull(form.zip),
      region: trimToNull(form.region),
      phone: trimToNull(form.phone),
      mobile: trimToNull(form.mobile),
      email: trimToNull(form.email),
      whatsapp_business: trimToNull(form.whatsapp_business),
      website: trimToNull(form.website),
      piva: trimToNull(form.piva),
      founded_year: intOrNull(form.founded_year),
      description: trimToNull(form.description),
      instructor_count: intOrNull(form.instructor_count),
      opening_hours: openingHoursArr,
      licenses: cleanLicenses,
      prices: cleanPrices,
      social: cleanSocial,
      updated_at: new Date().toISOString(),
    };

    const { error: err } = await supabase
      .from("driving_schools")
      .upsert(payload, { onConflict: "place_id" });

    if (err) setError(err.message);
    else {
      setSaved(true);
      onSaved?.();
    }
    setLoading(false);
  };

  const currentYear = new Date().getFullYear();
  const submitDisabled = loading || !form.name || !form.name.trim();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
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

      {/* Identità */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.identity")}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.name")}</span>
            <input
              required
              value={form.name ?? ""}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.piva")}</span>
            <input
              value={form.piva ?? ""}
              onChange={(e) => setField("piva", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.founded_year")}</span>
            <input
              type="number"
              min={1900}
              max={currentYear + 1}
              value={form.founded_year ?? ""}
              onChange={(e) => setField("founded_year", e.target.value === "" ? null : Number(e.target.value))}
              className={inputCls}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm mt-4">
          <span className={labelSpan}>{t("school.editor.fields.description")}</span>
          <textarea
            rows={5}
            value={form.description ?? ""}
            onChange={(e) => setField("description", e.target.value)}
            className={inputCls}
          />
        </label>
      </fieldset>

      {/* Contatti */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.contacts")}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.phone")}</span>
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.mobile")}</span>
            <input
              type="tel"
              value={form.mobile ?? ""}
              onChange={(e) => setField("mobile", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.email")}</span>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setField("email", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={`${labelSpan} flex items-center gap-1.5`}>
              <svg viewBox="0 0 24 24" fill="#25D366" className="h-3 w-3" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {t("school.editor.fields.whatsapp_business")}
            </span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+39 333 1234567"
              value={form.whatsapp_business ?? ""}
              onChange={(e) => setField("whatsapp_business", e.target.value)}
              className={inputCls}
            />
            <span className="font-sans text-[10px] text-ink-faint mt-0.5">
              {t("school.editor.fields.whatsapp_businessHint")}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className={labelSpan}>{t("school.editor.fields.website")}</span>
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => setField("website", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </fieldset>

      {/* Indirizzo */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.address")}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className={labelSpan}>{t("school.editor.fields.address")}</span>
            <input
              value={form.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.city")}</span>
            <input
              value={form.city ?? ""}
              onChange={(e) => setField("city", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelSpan}>{t("school.editor.fields.zip")}</span>
            <input
              value={form.zip ?? ""}
              onChange={(e) => setField("zip", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className={labelSpan}>{t("school.editor.fields.region")}</span>
            <input
              value={form.region ?? ""}
              onChange={(e) => setField("region", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </fieldset>

      {/* Orari */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.hours")}</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span className={labelSpan}>{t("school.editor.openingHours")}</span>
          <textarea
            rows={7}
            value={openingHoursArr.join("\n")}
            onChange={(e) => setField("opening_hours", e.target.value.split("\n"))}
            className={`${inputCls} font-mono`}
          />
        </label>
      </fieldset>

      {/* Patenti e prezzi */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.licenses")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
          {ALL_LICENSES.map((l) => (
            <label key={l} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={licensesArr.includes(l)}
                onChange={(e) => toggleLicense(l, e.target.checked)}
              />
              {l}
            </label>
          ))}
        </div>
        {licensesArr.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {licensesArr.map((l) => (
              <label key={l} className="flex flex-col gap-1 text-sm">
                <span className={labelSpan}>
                  {t("school.editor.priceFor", { licence: l })}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={typeof pricesObj[l] === "number" ? pricesObj[l] : ""}
                  onChange={(e) => setPrice(l, e.target.value)}
                  className={inputCls}
                />
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {/* Staff */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.staff")}</legend>
        <label className="flex flex-col gap-1 text-sm md:w-1/2">
          <span className={labelSpan}>{t("school.editor.fields.instructor_count")}</span>
          <input
            type="number"
            min={0}
            value={form.instructor_count ?? ""}
            onChange={(e) => setField("instructor_count", e.target.value === "" ? null : Number(e.target.value))}
            className={inputCls}
          />
        </label>
      </fieldset>

      {/* Social */}
      <fieldset>
        <legend className={sectionHeader}>{t("school.editor.sections.social")}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className={labelSpan}>{t(`school.editor.fields.social_${key}`)}</span>
              <input
                type="url"
                value={socialObj[key] ?? ""}
                onChange={(e) => setSocial(key, e.target.value)}
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={submitDisabled}>
        {loading ? t("school.editor.saving") : t("school.editor.save")}
      </Button>
    </form>
  );
}
