import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";

interface ClaimFormProps {
  placeId?: string;
  schoolName?: string;
  onSuccess?: () => void;
}

type Step = "auth" | "details";

export function ClaimForm({ placeId, schoolName = "", onSuccess }: ClaimFormProps) {
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
    });

    if (err) setError(err.message);
    else onSuccess?.();
    setLoading(false);
  };

  if (step === "auth") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{t("school.claimForm.createAccount")}</p>
        <AuthForm mode="signup" role="autoscuola" onSuccess={handleAuthSuccess} />
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

      {!placeId && (
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
      )}

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
