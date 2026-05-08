import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup" | "magic-link";

interface AuthFormProps {
  mode: AuthMode;
  role?: "student" | "autoscuola";
  fullName?: string;
  onSuccess?: () => void;
}

export function AuthForm({ mode, role = "student", fullName, onSuccess }: AuthFormProps) {
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
        options: { data: metadata },
      });
      if (err) setError(err.message);
      else setMagicSent(true);
    } else if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (err) setError(err.message);
      else onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else onSuccess?.();
    }

    setLoading(false);
  };

  const handleOAuth = (provider: "google" | "apple") => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { queryParams: { role } },
    });
  };

  if (magicSent) {
    return (
      <p className="text-center text-sm text-ink-muted">
        Magic link sent to <strong>{email}</strong>. Check your inbox.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
        {mode !== "magic-link" && (
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="border rounded px-3 py-2 text-sm"
            />
          </label>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? "..."
            : mode === "magic-link"
            ? "Send magic link"
            : mode === "signup"
            ? "Create account"
            : "Log in"}
        </Button>
      </form>

      {role === "student" && (
        <>
          <div className="text-center text-xs text-ink-muted">or continue with</div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => handleOAuth("google")} type="button">
              Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuth("apple")} type="button">
              Apple
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
