import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Nav } from "@/components/nav/Nav";
import { DashboardPending } from "@/components/driving-school/DashboardPending";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";

interface ClaimRow {
  status: "pending" | "approved" | "rejected";
  school_name: string;
}

export default function DrivingSchoolDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { approved, loading: profileLoading } = useProfile();
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [domainClaimDone, setDomainClaimDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pending_claims")
      .select("status, school_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setClaim(data as ClaimRow);
      });
  }, [user]);

  useEffect(() => {
    if (!user || profileLoading || approved || domainClaimDone) return;
    const stored = localStorage.getItem("domain_claim");
    if (!stored) return;
    const { _placeId, name } = JSON.parse(stored) as { _placeId: string; name: string };
    setDomainClaimDone(true);
    supabase.rpc("claim_school_via_domain", { p_place_id: _placeId, p_school_name: name }).then(({ error }) => {
      if (!error) {
        localStorage.removeItem("domain_claim");
        supabase.auth.refreshSession();
      } else {
        setDomainClaimDone(false);
      }
    });
  }, [user, profileLoading, approved, domainClaimDone]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
      </div>
    );
  }

  if (!approved) {
    const pendingStatus = claim?.status === "rejected" ? "rejected" : "pending";
    return (
      <div className="min-h-screen bg-bg text-ink">
        <Nav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
          <DashboardPending status={pendingStatus} />
        </div>
      </div>
    );
  }

  const schoolName = claim?.school_name ?? t("school.dashboard.defaultName");

  return (
    <DrivingSchoolLayout schoolName={schoolName}>
      <h1 className="text-2xl font-bold">{schoolName}</h1>
      <p className="text-ink-muted mt-1 text-sm">{t("school.dashboard.subtitle")}</p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/driving-school/dashboard/edit"
          className="rounded-xl border border-line p-5 hover:border-brand/40 hover:bg-brand-soft/20 transition-colors group"
        >
          <p className="font-semibold text-sm group-hover:text-brand transition-colors">{t("school.dashboard.editListing")}</p>
          <p className="text-xs text-ink-muted mt-1">{t("school.dashboard.editListingDesc")}</p>
        </Link>
      </div>
    </DrivingSchoolLayout>
  );
}
