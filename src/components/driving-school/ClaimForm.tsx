import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";
import { DraggableMarkerMap } from "@/components/driving-school/DraggableMarkerMap";
import { AddressAutocomplete } from "@/components/driving-school/AddressAutocomplete";

interface SchoolData {
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  region?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  openingHours?: string[] | null;
}

interface ClaimFormProps {
  placeId?: string;
  schoolName?: string;
  schoolData?: SchoolData;
  emailRedirectTo?: string;
  onSuccess?: () => void;
}

type Step = "auth" | "details";

// ── sessionStorage draft helpers ────────────────────────────────────────────
const DRAFT_KEY = "claim_form_draft";

interface DraftState {
  fullName: string;
  piva: string;
  manualName: string;
  manualAddress: string;
  manualCity: string;
  manualZip: string;
  manualRegion: string;
  manualPhone: string;
  manualWebsite: string;
  pinLat: number | null;
  pinLng: number | null;
}

function readDraft(): DraftState | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftState) : null;
  } catch {
    return null;
  }
}

function writeDraft(state: DraftState): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function deleteDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// ── URL / phone validation helpers ──────────────────────────────────────────

/** Returns the normalised URL string (prefixes https:// if scheme missing),
 *  or null if the value is non-empty and unparseable as http(s). */
function normaliseWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return withScheme;
  } catch {
    return null;
  }
}

function sanitisePhone(raw: string): string {
  // strip anything that isn't a digit, space, +, -, (, )
  return raw.replace(/[^\d\s+\-()/]/g, "");
}

// ── Component ────────────────────────────────────────────────────────────────

export function ClaimForm({ placeId, schoolName = "", schoolData, emailRedirectTo, onSuccess }: ClaimFormProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("auth");

  // User returned from email confirmation link — skip the auth step
  useEffect(() => {
    if (!authLoading && user) setStep("details");
  }, [user, authLoading]);

  // Hydrate from draft on mount; fall back to props
  const draft = readDraft();

  const [fullName, setFullName] = useState(draft?.fullName ?? "");
  const [piva, setPiva] = useState(draft?.piva ?? "");
  const [manualName, setManualName] = useState(draft?.manualName ?? schoolName);
  const [manualAddress, setManualAddress] = useState(draft?.manualAddress ?? (schoolData?.address ?? ""));
  const [manualCity, setManualCity] = useState(draft?.manualCity ?? (schoolData?.city ?? ""));
  const [manualZip, setManualZip] = useState(draft?.manualZip ?? (schoolData?.zip ?? ""));
  const [manualRegion, setManualRegion] = useState(draft?.manualRegion ?? (schoolData?.region ?? ""));
  const [manualPhone, setManualPhone] = useState(draft?.manualPhone ?? (schoolData?.phone ?? ""));
  const [manualWebsite, setManualWebsite] = useState(draft?.manualWebsite ?? (schoolData?.website ?? ""));
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(() => {
    if (draft?.pinLat != null && draft?.pinLng != null) return [draft.pinLat, draft.pinLng];
    if (schoolData?.lat && schoolData?.lng) return [schoolData.lat, schoolData.lng];
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; schoolName?: string }>({});

  // Persist draft on every state change
  useEffect(() => {
    writeDraft({
      fullName,
      piva,
      manualName,
      manualAddress,
      manualCity,
      manualZip,
      manualRegion,
      manualPhone,
      manualWebsite,
      pinLat: pinPosition ? pinPosition[0] : null,
      pinLng: pinPosition ? pinPosition[1] : null,
    });
  }, [fullName, piva, manualName, manualAddress, manualCity, manualZip, manualRegion, manualPhone, manualWebsite, pinPosition]);

  const handleAuthSuccess = () => setStep("details");

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWebsiteError(null);

    // ── Field validation ──────────────────────────────────────────────────
    const newFieldErrors: { fullName?: string; schoolName?: string } = {};

    if (!fullName.trim()) {
      newFieldErrors.fullName = t("school.claimForm.errors.requiredField");
    }
    if (!manualName.trim()) {
      newFieldErrors.schoolName = t("school.claimForm.errors.requiredField");
    }

    const normalisedWebsite = normaliseWebsite(manualWebsite);
    if (normalisedWebsite === null) {
      setWebsiteError(t("school.claimForm.errors.websiteInvalid"));
      setFieldErrors(newFieldErrors);
      return;
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setError(t("school.claimForm.notAuthenticated")); setLoading(false); return; }

    // ── Duplicate-claim guard ─────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("pending_claims")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      setError(t("school.claimForm.errors.alreadyHavePending"));
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.from("pending_claims").insert({
      user_id: authUser.id,
      email: authUser.email ?? "",
      full_name: fullName.trim(),
      piva: piva.trim() || null,
      place_id: placeId ?? null,
      school_name: manualName.trim() || schoolName,
      address: manualAddress || null,
      city: manualCity || null,
      zip: manualZip || null,
      region: manualRegion || null,
      phone: sanitisePhone(manualPhone) || null,
      website: normalisedWebsite || null,
      lat: pinPosition ? pinPosition[0] : null,
      lng: pinPosition ? pinPosition[1] : null,
      opening_hours: schoolData?.openingHours ?? null,
    });

    if (err) {
      setError(err.message);
    } else {
      // Clean up all persisted state on success
      deleteDraft();
      localStorage.removeItem("claim_manual_school");
      localStorage.removeItem("domain_claim");
      onSuccess?.();
    }
    setLoading(false);
  };

  if (step === "auth") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{t("school.claimForm.createAccount")}</p>
        <AuthForm mode="signup" role="autoscuola" emailRedirectTo={emailRedirectTo} onSuccess={handleAuthSuccess} />
        <p className="text-center text-sm text-ink-muted">
          {t("school.claimForm.hasAccount")}{" "}
          <a href="/login" className="underline">{t("school.claimForm.login")}</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitClaim} className="flex flex-col gap-4">
      {error && (
        <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          <p>{error}</p>
          {error === t("school.claimForm.errors.alreadyHavePending") && (
            <Link to="/driving-school/dashboard" className="underline font-medium">
              {t("school.claimForm.errors.alreadyHavePendingCta")}
            </Link>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.claimForm.fullName")}
        </span>
        <input
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: undefined })); }}
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
        {fieldErrors.fullName && (
          <span className="text-xs text-red-600">{fieldErrors.fullName}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.claimForm.schoolName")}
        </span>
        <input
          value={manualName}
          onChange={(e) => { setManualName(e.target.value); setFieldErrors((p) => ({ ...p, schoolName: undefined })); }}
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
        {fieldErrors.schoolName && (
          <span className="text-xs text-red-600">{fieldErrors.schoolName}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.editor.fields.address")}
        </span>
        <AddressAutocomplete
          value={manualAddress}
          onChange={setManualAddress}
          onSelect={(r) => {
            setManualAddress(r.address);
            setManualCity(r.city);
            setManualZip(r.zip);
            setManualRegion(r.region);
            setPinPosition([r.lat, r.lng]);
          }}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {t("school.editor.fields.city")}
          </span>
          <input
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {t("school.editor.fields.zip")}
          </span>
          <input
            value={manualZip}
            onChange={(e) => setManualZip(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {t("school.editor.fields.region")}
          </span>
          <input
            value={manualRegion}
            onChange={(e) => setManualRegion(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {t("school.editor.fields.phone")}
          </span>
          <input
            type="tel"
            value={manualPhone}
            onChange={(e) => setManualPhone(sanitisePhone(e.target.value))}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.editor.fields.website")}
        </span>
        <input
          value={manualWebsite}
          onChange={(e) => { setManualWebsite(e.target.value); setWebsiteError(null); }}
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          inputMode="url"
        />
        {websiteError && (
          <span className="text-xs text-red-600">{websiteError}</span>
        )}
      </label>

      <DraggableMarkerMap position={pinPosition} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.claimForm.piva")}
        </span>
        <input
          value={piva}
          onChange={(e) => setPiva(e.target.value)}
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? t("school.claimForm.submitting") : t("school.claimForm.submit")}
      </Button>
    </form>
  );
}
