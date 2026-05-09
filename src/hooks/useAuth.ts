import type { Session, User } from "@supabase/supabase-js";
import { useAuthContext } from "@/lib/AuthContext";

interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { session, user, authLoading, signOut } = useAuthContext();
  return { session, user, loading: authLoading, signOut };
}
