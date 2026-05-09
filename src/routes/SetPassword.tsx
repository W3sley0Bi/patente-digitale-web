import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/nav/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface HashError {
  code: string;
  description: string;
}

function parseHashError(): HashError | null {
  const hash = window.location.hash;
  if (!hash.includes("error=")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code") ?? params.get("error") ?? "unknown";
  const description = decodeURIComponent((params.get("error_description") ?? "").replace(/\+/g, " "));
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return { code, description };
}

export default function SetPassword() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { role, refresh } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [hashError] = useState<HashError | null>(() => parseHashError());
  const [sessionExpired, setSessionExpired] = useState(false);

  const dashboardHref = role === "autoscuola" ? "/driving-school/dashboard" : "/student/dashboard";

  // Redirect to /login if not authenticated and no hash error (ProtectedRoute defence-in-depth)
  useEffect(() => {
    if (!authLoading && !user && !hashError) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, hashError, navigate]);

  // Auto-navigate after done when no `next`
  useEffect(() => {
    if (!done || next) return;
    if (countdown <= 0) {
      navigate(dashboardHref, { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, next, countdown, navigate, dashboardHref]);

  const hashErrorMessage = (() => {
    if (!hashError) return null;
    if (hashError.code === "otp_expired") return t("auth.errors.otpExpired");
    if (hashError.code === "access_denied") return t("auth.errors.accessDenied");
    return t("auth.errors.generic", { description: hashError.description || hashError.code });
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSessionExpired(false);

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      const lower = err.message.toLowerCase();
      if (lower.includes("session") || lower.includes("not authenticated") || lower.includes("jwt")) {
        setSessionExpired(true);
      } else {
        setError(err.message);
      }
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 pt-20 pb-8">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.setPasswordTitle")}</h1>
            <p className="text-sm text-ink-muted">{t("auth.setPasswordDesc")}</p>
          </div>

          {hashErrorMessage && (
            <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3" role="alert">
              <p className="text-amber-800 text-sm">{hashErrorMessage}</p>
              <Link
                to="/login"
                className="text-xs font-medium text-amber-900 underline underline-offset-2 self-start hover:opacity-70 transition-opacity"
              >
                {t("auth.requestNewLink")}
              </Link>
            </div>
          )}

          {!hashError && done ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {t("auth.passwordUpdated")}
              </p>
              {next ? (
                <Link to={dashboardHref} className="text-sm underline text-ink-muted">
                  {t("auth.backToDashboard")}
                </Link>
              ) : (
                <p className="text-xs text-ink-muted">
                  {t("auth.redirecting", { seconds: countdown })}
                </p>
              )}
            </div>
          ) : !hashError ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {sessionExpired && (
                <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3" role="alert">
                  <p className="text-amber-800 text-xs">{t("auth.errors.sessionExpired")}</p>
                  <Link
                    to="/login"
                    className="text-xs font-medium text-amber-900 underline underline-offset-2 self-start hover:opacity-70 transition-opacity"
                  >
                    {t("auth.requestNewLink")}
                  </Link>
                </div>
              )}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
