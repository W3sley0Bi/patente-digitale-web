import { Link } from "react-router";
import { useTranslation } from "react-i18next";

/**
 * Resume the in-progress claim if state survives, else fresh search.
 *
 * - claim_manual_school in localStorage → Flow 2 (school in DB, manual)
 * - domain_claim in localStorage → Flow 1 attempted but auto-claim failed; fall back to Flow 2
 *   with the same school selection (it has placeId etc.)
 * - neither → /signup/driving-school (search)
 */
function resumeClaimHref(): string {
  if (typeof window === "undefined") return "/signup/driving-school";
  if (localStorage.getItem("claim_manual_school")) {
    return "/signup/driving-school?step=manual-claim";
  }
  const domainClaim = localStorage.getItem("domain_claim");
  if (domainClaim) {
    // Promote Flow-1 leftovers into Flow-2 so the user lands on the manual form
    // with the school already selected, instead of starting over.
    try {
      const school = JSON.parse(domainClaim);
      localStorage.setItem("claim_manual_school", JSON.stringify(school));
    } catch {
      // ignore — fall through to plain search
    }
    localStorage.removeItem("domain_claim");
    return "/signup/driving-school?step=manual-claim";
  }
  return "/signup/driving-school";
}

interface DashboardPendingProps {
  status: "pending" | "rejected" | "no-claim";
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DashboardPending({ status, onRefresh, refreshing }: DashboardPendingProps) {
  const { t } = useTranslation();

  if (status === "no-claim") {
    return (
      <div className="text-center flex flex-col gap-4 max-w-sm">
        <h2 className="text-xl font-semibold">{t("school.dashboard.noClaim.title")}</h2>
        <p className="text-ink-muted text-sm">{t("school.dashboard.noClaim.desc")}</p>
        <Link
          to={resumeClaimHref()}
          className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          {t("school.dashboard.noClaim.cta")}
        </Link>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="text-center flex flex-col gap-4 max-w-sm">
        <h2 className="text-xl font-semibold">{t("school.pending.rejectedTitle")}</h2>
        <p className="text-ink-muted text-sm">
          {t("school.pending.rejectedDesc")}{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">
            {t("school.pending.rejectedContact")}
          </a>{" "}
          {t("school.pending.rejectedReason")}
        </p>
        <Link
          to={resumeClaimHref()}
          className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          {t("school.dashboard.noClaimRejected.cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center flex flex-col gap-4 max-w-sm">
      <h2 className="text-xl font-semibold">{t("school.pending.pendingTitle")}</h2>
      <p className="text-ink-muted text-sm">{t("school.pending.pendingDesc")}</p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {refreshing ? "…" : t("school.dashboard.refreshStatus")}
        </button>
      )}
    </div>
  );
}
