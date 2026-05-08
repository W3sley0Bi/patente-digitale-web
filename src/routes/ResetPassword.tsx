import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/nav/Nav";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-8">

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.forgotTitle")}</h1>
          </div>

          {done ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-ink-muted">{t("auth.passwordUpdated")}</p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-ink-muted hover:text-ink self-start transition-colors"
              >
                {t("auth.loginLink")} →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {error}
                </p>
              )}
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                  {t("auth.newPassword")}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition"
                />
              </label>
              <Button type="submit" disabled={loading} className="mt-1">
                {loading ? t("auth.form.loading") : t("auth.updatePassword")}
              </Button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
