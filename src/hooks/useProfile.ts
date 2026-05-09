import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  role: "student" | "autoscuola";
  approved: boolean;
  full_name: string | null;
}

interface UseProfileReturn {
  profile: Profile | null;
  role: "student" | "autoscuola" | null;
  approved: boolean;
  loading: boolean;
  error: string | null;
}

export function useProfile(): UseProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setProfile(data as Profile);
        setLoading(false);
      });
  }, [user, authLoading]);

  return {
    profile,
    role: profile?.role ?? null,
    approved: profile?.approved ?? false,
    loading: authLoading || loading,
    error,
  };
}
