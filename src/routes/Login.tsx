import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { role, loading } = useProfile();

  useEffect(() => {
    if (!user || loading) return;
    const next = searchParams.get("next");
    if (next) { navigate(next, { replace: true }); return; }
    if (role === "autoscuola") navigate("/driving-school/dashboard", { replace: true });
    else navigate("/student/dashboard", { replace: true });
  }, [user, role, loading, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        <AuthForm mode="login" />
        <p className="text-center text-sm text-ink-muted">
          No account?{" "}
          <a href="/signup" className="underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
