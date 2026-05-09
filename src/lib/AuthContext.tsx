import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  role: "student" | "autoscuola";
  approved: boolean;
  full_name: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  profile: Profile | null;
  role: "student" | "autoscuola" | null;
  approved: boolean;
  profileLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Single onAuthStateChange subscription for the whole app.
  // It fires immediately with the current session AND handles URL hash exchange.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  // Fetch profile whenever the user changes. Reset profileLoading on every fetch
  // so consumers (ProtectedRoute) never see role=null with profileLoading=false.
  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) setProfileError(error.message);
    setProfile((data as Profile) ?? null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    void fetchProfile(user.id);
  }, [user, authLoading, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = {
    session,
    user,
    authLoading,
    profile,
    role: profile?.role ?? null,
    approved: profile?.approved ?? false,
    profileLoading: authLoading || profileLoading,
    profileError,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
