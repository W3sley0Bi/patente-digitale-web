import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/nav/Nav";
import { AuthForm } from "@/components/auth/AuthForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

type View = "login" | "forgot-password" | "login-magic-link" | "signup-pick" | "signup-student";

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

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { role, loading } = useProfile();

  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<View>(tabParam === "signup" ? "signup-pick" : "login");
  const [hashError] = useState<HashError | null>(() => parseHashError());

  useEffect(() => {
    if (!user || loading) return;
    const next = searchParams.get("next");
    if (next) { navigate(next, { replace: true }); return; }
    if (role === "autoscuola") navigate("/driving-school/dashboard", { replace: true });
    else if (role === "student") navigate("/student/dashboard", { replace: true });
  }, [user, role, loading, navigate, searchParams]);

  const goLogin = () => {
    setView("login");
    setSearchParams({}, { replace: true });
  };

  const goSignup = () => {
    setView("signup-pick");
    setSearchParams({ tab: "signup" }, { replace: true });
  };

  const heading = view === "login"
    ? t("auth.login")
    : view === "forgot-password"
    ? t("auth.forgotTitle")
    : view === "login-magic-link"
    ? t("auth.magicLinkTitle")
    : t("auth.signup");

  const hashErrorMessage = (() => {
    if (!hashError) return null;
    if (hashError.code === "otp_expired") return t("auth.errors.otpExpired");
    if (hashError.code === "access_denied") return t("auth.errors.accessDenied");
    return t("auth.errors.generic", { description: hashError.description || hashError.code });
  })();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-8">

          {hashErrorMessage && (
            <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3" role="alert">
              <p className="text-amber-800 text-sm">{hashErrorMessage}</p>
              {hashError?.code === "otp_expired" && (
                <button
                  type="button"
                  onClick={() => setView("login-magic-link")}
                  className="text-xs font-medium text-amber-900 underline underline-offset-2 self-start hover:opacity-70 transition-opacity"
                >
                  {t("auth.requestNewLink")}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
            <p className="text-sm text-ink-muted">
              {view === "login" && (
                <>
                  {t("auth.noAccount")}{" "}
                  <button type="button" onClick={goSignup}
                    className="text-ink underline underline-offset-2 hover:opacity-70 transition-opacity">
                    {t("auth.signupLink")}
                  </button>
                </>
              )}
              {view === "forgot-password" && t("auth.forgotDesc")}
              {view === "login-magic-link" && t("auth.magicLinkDesc")}
              {(view === "signup-pick" || view === "signup-student") && (
                <>
                  {t("auth.hasAccount")}{" "}
                  <button type="button" onClick={goLogin}
                    className="text-ink underline underline-offset-2 hover:opacity-70 transition-opacity">
                    {t("auth.loginLink")}
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {view === "login" && (
              <>
                <AuthForm
                  mode="login"
                  onForgotPassword={() => setView("forgot-password")}
                />
                <button
                  type="button"
                  onClick={() => setView("login-magic-link")}
                  className="text-xs text-ink-muted hover:text-ink transition-colors text-center"
                >
                  {t("auth.magicLinkOption")}
                </button>
              </>
            )}

            {view === "login-magic-link" && (
              <div className="flex flex-col gap-4">
                <button type="button" onClick={goLogin}
                  className="text-xs text-ink-muted hover:text-ink self-start transition-colors">
                  {t("auth.back")}
                </button>
                <AuthForm mode="magic-link" role="student" />
              </div>
            )}

            {view === "forgot-password" && (
              <ForgotPasswordForm onBack={goLogin} />
            )}

            {view === "signup-pick" && (
              <div className="flex flex-col gap-3">
                <button type="button" onClick={() => setView("signup-student")}
                  className="border rounded-xl p-4 text-left hover:border-ink transition-colors">
                  <div className="font-semibold text-sm">{t("auth.student.title")}</div>
                  <div className="text-xs text-ink-muted mt-0.5 leading-relaxed">{t("auth.student.desc")}</div>
                </button>
                <button type="button" onClick={() => navigate("/signup/driving-school")}
                  className="border rounded-xl p-4 text-left hover:border-ink transition-colors">
                  <div className="font-semibold text-sm">{t("auth.school.title")}</div>
                  <div className="text-xs text-ink-muted mt-0.5 leading-relaxed">{t("auth.school.desc")}</div>
                </button>
              </div>
            )}

            {view === "signup-student" && (
              <div className="flex flex-col gap-4">
                <button type="button" onClick={() => setView("signup-pick")}
                  className="text-xs text-ink-muted hover:text-ink self-start transition-colors">
                  {t("auth.back")}
                </button>
                <AuthForm
                  mode="signup"
                  role="student"
                  onSuccess={() => navigate("/student/dashboard")}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
