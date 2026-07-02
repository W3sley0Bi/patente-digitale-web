import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export function AppHomeRedirect() {
	const { user, loading: authLoading } = useAuth();
	const { role, loading: profileLoading } = useProfile();

	if (authLoading || profileLoading) return null;

	if (!user) return <Navigate to="/app/login" replace />;

	if (role === "autoscuola")
		return <Navigate to="/app/driving-school" replace />;
	if (role === "student") return <Navigate to="/app/student" replace />;

	// Role not yet provisioned — same fallback as ProtectedRoute.
	return <Navigate to="/app/login" replace />;
}
