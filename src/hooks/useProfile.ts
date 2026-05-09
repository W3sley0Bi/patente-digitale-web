import { useAuthContext } from "@/lib/AuthContext";

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
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { profile, role, approved, profileLoading, profileError, refreshProfile } = useAuthContext();
  return {
    profile,
    role,
    approved,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  };
}
