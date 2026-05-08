import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "student" | "autoscuola";
  requireApproved?: boolean;
}

export function ProtectedRoute({ children, requiredRole, requireApproved = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, approved, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return null;

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  if (requireApproved && !approved) {
    return <Navigate to="/driving-school/dashboard" replace />;
  }

  return <>{children}</>;
}
