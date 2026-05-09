import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/nav/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export default function SetPassword() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { role, refresh } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dashboardHref = role === "autoscuola" ? "/driving-school/dashboard" : "/student/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // If the user came through the autoscuola claim flow but their profile.role
    // is still "student" (existing user, or trigger metadata mismatch), upgrade it.
    // The trigger already does this for new users; this handles the existing-user case.
    const wantsAutoscuola =
      (next?.includes("driving-school") ?? false) || !!localStorage.getItem("domain_claim");
    if (wantsAutoscuola && user && role !== "autoscuola") {
      await supabase.from("profiles").update({ role: "autoscuola", approved: false }).eq("id", user.id);
      await refresh();
    }

    if (next) {
      navigate(next);
    } else {
      setDone(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.setPasswordTitle")}</h1>
            <p className="text-sm text-ink-muted">{t("auth.setPasswordDesc")}</p>
          </div>

          {done ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {t("auth.passwordUpdated")}
              </p>
              <Link to={dashboardHref} className="text-sm underline text-ink-muted">
                {t("auth.backToDashboard")}
              </Link>
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
                {loading ? t("auth.form.loading") : t("auth.setPasswordSave")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
