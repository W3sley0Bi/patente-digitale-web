import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup" | "magic-link";

interface AuthFormProps {
  mode: AuthMode;
  role?: "student" | "autoscuola";
  fullName?: string;
  emailRedirectTo?: string;
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function AuthForm({ mode, role = "student", fullName, emailRedirectTo, onSuccess, onForgotPassword }: AuthFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const metadata = { role, full_name: fullName ?? "" };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "magic-link") {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { data: metadata, ...(emailRedirectTo ? { emailRedirectTo } : {}) },
      });
      if (err) setError(err.message);
      else { setMagicSent(true); onSuccess?.(); }
    } else if (mode === "signup") {
      const { data: signUpData, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: emailRedirectTo ?? window.location.href,
        },
      });
      if (err) setError(err.message);
      else if (!signUpData.session) setMagicSent(true); // email confirmation pending
      else onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else onSuccess?.();
    }

    setLoading(false);
  };

  if (magicSent) {
    return (
      <p
        className="text-center text-sm text-ink-muted"
        dangerouslySetInnerHTML={{ __html: t("auth.form.magicSent", { email }) }}
      />
    );
  }

  const errorMessage = (() => {
    if (!error) return null;
    const lower = error.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("429")) return t("auth.errors.rateLimit");
    if (lower.includes("email not confirmed")) return t("auth.errors.emailNotConfirmed");
    return error;
  })();

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {errorMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        {mode !== "magic-link" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
              {t("auth.form.password")}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
            />
          </label>
        )}
        <Button type="submit" disabled={loading} className="mt-1">
          {loading
            ? t("auth.form.loading")
            : mode === "magic-link"
            ? t("auth.form.sendMagicLink")
            : mode === "signup"
            ? t("auth.form.createAccount")
            : t("auth.form.login")}
        </Button>
        {mode === "login" && onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-ink-muted hover:text-ink self-end transition-colors"
          >
            {t("auth.forgotPassword")}
          </button>
        )}
      </form>
    </div>
  );
}
