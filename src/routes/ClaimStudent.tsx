import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { claimStudentRecord } from "@/lib/booking/api";

/** How long the success message stays visible before the dashboard redirect. */
const SUCCESS_REDIRECT_DELAY_MS = 1200;

/**
 * Landing page for a student claim link (/claim/:token). A school shares this
 * link with a manually-added student; opening it while signed in links the
 * student record to the account and redirects to the student dashboard.
 *
 * Unauthenticated visitors bounce to /app/login with a ?next= back here — the
 * same pattern ProtectedRoute uses. Errors deliberately collapse to a generic
 * "invalid link" message (except the active-elsewhere conflict) so the page
 * never leaks whether a record exists for a given token.
 */
export default function ClaimStudent() {
	const { token } = useParams<{ token: string }>();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [message, setMessage] = useState<string | null>(null);
	// The RPC rotates the token on use, so a second call (e.g. StrictMode
	// re-running the effect) would report claim_not_found. Fire at most once.
	const claimedRef = useRef(false);
	const redirectTimeoutRef = useRef<number | undefined>(undefined);

	// Cancel a pending success-redirect only when the page unmounts.
	useEffect(() => () => window.clearTimeout(redirectTimeoutRef.current), []);

	useEffect(() => {
		if (loading || !user || !token || claimedRef.current) return;
		claimedRef.current = true;
		claimStudentRecord(token)
			.then(() => {
				setMessage(t("claim.success"));
				redirectTimeoutRef.current = window.setTimeout(
					() => navigate("/app/student", { replace: true }),
					SUCCESS_REDIRECT_DELAY_MS,
				);
			})
			.catch((e: { message?: string }) => {
				setMessage(
					e?.message === "student_active_elsewhere" ||
						e?.message === "already_enrolled_at_school"
						? t("claim.activeElsewhere")
						: t("claim.notFound"),
				);
			});
	}, [loading, user, token, navigate, t]);

	if (!loading && !user) {
		return (
			<Navigate
				to={`/app/login?next=${encodeURIComponent(`/claim/${token ?? ""}`)}`}
				replace
			/>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-bg px-4">
			<p className="max-w-sm text-center text-sm text-ink-muted">
				{token ? (message ?? t("claim.working")) : t("claim.notFound")}
			</p>
		</div>
	);
}
