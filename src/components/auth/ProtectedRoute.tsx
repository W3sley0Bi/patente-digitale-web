import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: "student" | "autoscuola";
	requireApproved?: boolean;
}

export function ProtectedRoute({
	children,
	requiredRole,
	requireApproved = false,
}: ProtectedRouteProps) {
	const { user, loading: authLoading } = useAuth();
	const { role, approved, loading: profileLoading } = useProfile();
	const location = useLocation();

	if (authLoading || profileLoading) return null;

	if (!user) {
		return (
			<Navigate
				to={`/app/login?next=${encodeURIComponent(location.pathname)}`}
				replace
			/>
		);
	}

	if (requiredRole && role !== requiredRole) {
		// Send the user to their actual dashboard rather than bouncing them to /app/login
		// with no context. Null role => profile not yet provisioned; send to /app/login.
		if (role === "autoscuola")
			return <Navigate to="/app/driving-school" replace />;
		if (role === "student") return <Navigate to="/app/student" replace />;
		return <Navigate to="/app/login" replace />;
	}

	if (requireApproved && !approved) {
		return <Navigate to="/app/driving-school" replace />;
	}

	return <>{children}</>;
}
