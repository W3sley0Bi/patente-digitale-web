import { useNavigate, useSearchParams } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">Create an account</h1>

        {role !== "student" && (
          <>
            <p className="text-center text-sm text-ink-muted">Who are you?</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setSearchParams({ role: "student" })}
                className="border rounded-lg p-4 text-left hover:bg-bg-raised transition-colors"
              >
                <div className="font-semibold">I'm a student</div>
                <div className="text-sm text-ink-muted mt-0.5">
                  Find an autoscuola and prepare for your exam
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate("/signup/driving-school")}
                className="border rounded-lg p-4 text-left hover:bg-bg-raised transition-colors"
              >
                <div className="font-semibold">I run a driving school</div>
                <div className="text-sm text-ink-muted mt-0.5">
                  Claim your listing and manage your profile
                </div>
              </button>
            </div>
          </>
        )}

        {role === "student" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium">Create your student account</p>
            <AuthForm
              mode="signup"
              role="student"
              onSuccess={() => navigate("/student/dashboard")}
            />
          </div>
        )}

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
