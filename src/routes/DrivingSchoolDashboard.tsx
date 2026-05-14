import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { BadgeCheck, Download } from "lucide-react";
import { Nav } from "@/components/nav/Nav";
import { DashboardPending } from "@/components/driving-school/DashboardPending";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { MockupTest } from "@/components/mockup-test/MockupTest";

interface ClaimRow {
  status: "pending" | "accepted" | "rejected";
  name: string;
}

export default function DrivingSchoolDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { approved, loading: profileLoading, refresh: refreshProfile } = useProfile();
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [claimLoading, setClaimLoading] = useState(true);
  const [domainClaimDone, setDomainClaimDone] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1;

  const fetchClaim = async (userId: string) => {
    const { data } = await supabase
      .from("driving_schools")
      .select("status, name")
      .eq("status", "pending")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setClaim(data ? (data as ClaimRow) : null);
  };

  useEffect(() => {
    if (!user) return;
    setClaimLoading(true);
    fetchClaim(user.id).finally(() => setClaimLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || profileLoading || approved || domainClaimDone) return;
    const stored = localStorage.getItem("domain_claim");
    if (!stored) {
      console.warn("[auto-claim] no domain_claim in localStorage — skipping. User likely clicked magic link in a different browser than where they entered their email.");
      return;
    }

    // Guard: if the user already has a manual pending claim, the domain_claim is stale — drop it.
    supabase
      .from("driving_schools")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data: existingClaim }) => {
        if (existingClaim) {
          console.warn("[auto-claim] skipped: existing driving_schools row found", existingClaim);
          localStorage.removeItem("domain_claim");
          return;
        }

        if (retryCountRef.current >= MAX_RETRIES) {
          console.warn("[auto-claim] max retries reached — giving up.");
          setRpcError(t("school.dashboard.rpcError", { message: "max retries reached" }));
          return;
        }

        const { _placeId, name, address, city, zip, region, phone, website, lat, lng, openingHours } = JSON.parse(stored);
        setDomainClaimDone(true);
        retryCountRef.current += 1;
        console.info("[auto-claim] calling claim_driving_school_via_domain", { _placeId, name, attempt: retryCountRef.current });
        supabase.rpc("claim_driving_school_via_domain", {
          p_place_id: _placeId,
          p_school_name: name,
          p_address: address ?? null,
          p_city: city ?? null,
          p_zip: zip ?? null,
          p_region: region ?? null,
          p_phone: phone ?? null,
          p_website: website ?? null,
          p_lat: lat ?? null,
          p_lng: lng ?? null,
          p_opening_hours: openingHours ? JSON.stringify(openingHours) : null,
        }).then(({ data, error }) => {
          if (!error) {
            console.info("[auto-claim] success", data);
            localStorage.removeItem("domain_claim");
            supabase.auth.refreshSession();
          } else {
            console.error("[auto-claim] RPC failed:", error);
            if (retryCountRef.current >= MAX_RETRIES) {
              setRpcError(t("school.dashboard.rpcError", { message: error.message }));
            } else {
              setDomainClaimDone(false);
            }
          }
        });
      });
  }, [user, profileLoading, approved, domainClaimDone, t]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([refreshProfile(), fetchClaim(user.id)]);
    setRefreshing(false);
  };

  if (profileLoading || claimLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
      </div>
    );
  }

  if (!approved) {
    let pendingStatus: "pending" | "rejected" | "no-claim";
    if (claim?.status === "rejected") {
      pendingStatus = "rejected";
    } else if (claim?.status === "pending") {
      pendingStatus = "pending";
    } else {
      // No claim row and no active domain_claim in localStorage
      pendingStatus = "no-claim";
    }

    return (
      <div className="min-h-screen bg-bg text-ink">
        <Nav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 gap-4">
          {rpcError && (
            <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {rpcError}
            </div>
          )}
          <DashboardPending
            status={pendingStatus}
            onRefresh={pendingStatus === "pending" ? handleRefresh : undefined}
            refreshing={refreshing}
          />
        </div>
      </div>
    );
  }

  const schoolName = claim?.name ?? t("school.dashboard.defaultName");

  return (
    <DrivingSchoolLayout schoolName={schoolName}>
      <h1 className="text-2xl font-bold">{schoolName}</h1>
      <p className="text-ink-muted mt-1 text-sm">{t("school.dashboard.subtitle")}</p>
      <MockupTest name="autoscuola-dashboard-metrics" badge={true} className="mt-8">
        <div className="rounded-2xl border border-line bg-bg-raised p-6 md:p-8">
          {/* Profile header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-sans text-lg font-black text-ink">{schoolName}</h3>
              <div className="mt-1 flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-brand" />
                <span className="font-sans text-xs text-brand-ink font-bold">
                  {t("school.dashboard.mock.verified")}
                </span>
              </div>
            </div>
            <button
              type="button"
              data-mockup-cta="export-csv"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-brand transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t("school.dashboard.mock.exportCsv")}
            </button>
          </div>

          {/* Metrics */}
          <div className="mt-6">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
              {t("school.dashboard.mock.metricsLabel")}
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-brand-soft/60 p-4">
                <div className="font-sans text-3xl font-black text-brand-ink leading-none">
                  {t("school.dashboard.mock.metric1.value")}
                </div>
                <div className="mt-2 font-sans text-xs text-ink-muted">
                  {t("school.dashboard.mock.metric1.label")}
                </div>
              </div>
              <div className="rounded-xl border border-line p-4">
                <div className="font-sans text-3xl font-black text-ink leading-none">
                  {t("school.dashboard.mock.metric2.value")}
                </div>
                <div className="mt-2 font-sans text-xs text-ink-muted">
                  {t("school.dashboard.mock.metric2.label")}
                </div>
              </div>
            </div>
          </div>

          {/* Recent enrolments */}
          <div className="mt-6">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
              {t("school.dashboard.mock.recentLabel")}
            </span>
            <ul className="mt-3 flex flex-col divide-y divide-line border border-line rounded-xl bg-bg overflow-hidden">
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-brand-soft flex items-center justify-center font-sans text-xs font-black text-brand-ink shrink-0">
                      {t(`school.dashboard.mock.student${i}`).slice(0, 1)}
                    </div>
                    <span className="font-sans text-sm text-ink truncate">
                      {t(`school.dashboard.mock.student${i}`)}
                    </span>
                  </div>
                  <span className="font-sans text-xs text-ink-faint shrink-0">
                    {t(`school.dashboard.mock.time${i}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MockupTest>
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
