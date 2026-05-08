import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{t("auth.forgotSent")}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-ink-muted hover:text-ink self-start transition-colors"
        >
          {t("auth.back")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("auth.form.email")}
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
        />
      </label>
      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? t("auth.form.loading") : t("auth.sendResetLink")}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-ink-muted hover:text-ink self-start transition-colors"
      >
        {t("auth.back")}
      </button>
    </form>
  );
}
