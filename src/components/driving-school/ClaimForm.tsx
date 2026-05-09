import { useEffect, useState } from "react";
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

export function ClaimForm({ placeId, schoolName = "", schoolData, emailRedirectTo, onSuccess }: ClaimFormProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("auth");

  // User returned from email confirmation link — skip the auth step
  useEffect(() => {
    if (!authLoading && user) setStep("details");
  }, [user, authLoading]);
  const [fullName, setFullName] = useState("");
  const [piva, setPiva] = useState("");
  const [manualName, setManualName] = useState(schoolName);
  const [manualAddress, setManualAddress] = useState(schoolData?.address ?? "");
  const [manualCity, setManualCity] = useState(schoolData?.city ?? "");
  const [manualZip, setManualZip] = useState(schoolData?.zip ?? "");
  const [manualRegion, setManualRegion] = useState(schoolData?.region ?? "");
  const [manualPhone, setManualPhone] = useState(schoolData?.phone ?? "");
  const [manualWebsite, setManualWebsite] = useState(schoolData?.website ?? "");
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(
    schoolData?.lat && schoolData?.lng ? [schoolData.lat, schoolData.lng] : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSuccess = () => setStep("details");

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError(t("school.claimForm.notAuthenticated")); setLoading(false); return; }

    const { error: err } = await supabase.from("pending_claims").insert({
      user_id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      piva: piva || null,
      place_id: placeId ?? null,
      school_name: manualName || schoolName,
      address: manualAddress || null,
      city: manualCity || null,
      zip: manualZip || null,
      region: manualRegion || null,
      phone: manualPhone || null,
      website: manualWebsite || null,
      lat: pinPosition ? pinPosition[0] : null,
      lng: pinPosition ? pinPosition[1] : null,
      opening_hours: schoolData?.openingHours ?? null,
    });

    if (err) setError(err.message);
    else onSuccess?.();
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
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.claimForm.fullName")}
        </span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.claimForm.schoolName")}
        </span>
        <input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          required
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
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
            onChange={(e) => setManualPhone(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("school.editor.fields.website")}
        </span>
        <input
          type="url"
          value={manualWebsite}
          onChange={(e) => setManualWebsite(e.target.value)}
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
      </label>

      <DraggableMarkerMap
        position={pinPosition}
        onChange={(lat, lng) => setPinPosition([lat, lng])}
      />

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
