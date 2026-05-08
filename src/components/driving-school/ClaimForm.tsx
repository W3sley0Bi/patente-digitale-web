import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";

interface ClaimFormProps {
  placeId?: string;
  schoolName?: string;
  onSuccess?: () => void;
}

type Step = "auth" | "details";

export function ClaimForm({ placeId, schoolName = "", onSuccess }: ClaimFormProps) {
  const [step, setStep] = useState<Step>("auth");
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
    if (!user) { setError("Not authenticated."); setLoading(false); return; }

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
        <p className="text-sm text-ink-muted">First, create your account:</p>
        <AuthForm mode="signup" role="autoscuola" onSuccess={handleAuthSuccess} />
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="underline">Log in</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitClaim} className="flex flex-col gap-4">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      <label className="flex flex-col gap-1 text-sm">
        Your full name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </label>

      {!placeId && (
        <label className="flex flex-col gap-1 text-sm">
          School name
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            required
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        P.IVA (optional, helps speed up review)
        <input
          value={piva}
          onChange={(e) => setPiva(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit claim"}
      </Button>
    </form>
  );
}
