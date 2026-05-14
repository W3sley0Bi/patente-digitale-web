import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/nav/Nav";
import { ClaimSearch, type SchoolMatch } from "@/components/driving-school/ClaimSearch";
import { ClaimForm } from "@/components/driving-school/ClaimForm";
import { AuthForm } from "@/components/auth/AuthForm";

type Step = "search" | "already-claimed" | "domain-email" | "manual-claim" | "not-found" | "auth-error" | "done";

// localStorage so it survives new-tab email link opens
const MANUAL_SCHOOL_KEY = "claim_manual_school";
const BASE_URL = `${window.location.origin}/signup/driving-school`;

function extractDomain(website: string): string {
  try { return new URL(website).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

export default function SignupDrivingSchool() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>(() => {
    const hash = window.location.hash;
    if (hash.includes("error=")) return "auth-error";
    const param = searchParams.get("step");
    if (param === "not-found") return "not-found";
    if (param === "manual-claim") return "manual-claim";
    return "search";
  });

  const [selected, setSelected] = useState<SchoolMatch | null>(() => {
    if (searchParams.get("step") === "manual-claim") {
      const stored = localStorage.getItem(MANUAL_SCHOOL_KEY);
      if (stored) return JSON.parse(stored) as SchoolMatch;
    }
    return null;
  });

  const [authError, setAuthError] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (!hash.includes("error=")) return null;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    return params.get("error_description")?.replace(/\+/g, " ") ?? "Link non valido o scaduto.";
  });

  useEffect(() => {
    if (authError) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [authError]);

  // Auto-claim from /search "Rivendica" CTA: ?placeId=<id> pre-selects the school
  const placeIdParam = searchParams.get("placeId");
  useEffect(() => {
    if (!placeIdParam) return;
    if (selected) return;
    if (step !== "search") return;
    let cancelled = false;
    fetch("/data/autoscuole.geojson")
      .then((r) => r.json())
      .then((data: {
        features: {
          geometry: { coordinates: [number, number] };
          properties: {
            _placeId?: string;
            name?: string;
            city?: string;
            website?: string | null;
            address?: string | null;
            phone?: string | null;
            region?: string | null;
            zip?: string | null;
            openingHours?: string[] | null;
          };
        }[];
      }) => {
        if (cancelled) return;
        const match = data.features.find((f) => f.properties._placeId === placeIdParam);
        if (!match) {
          setStep("not-found");
          return;
        }
        const school: SchoolMatch = {
          _placeId: match.properties._placeId ?? "",
          name: match.properties.name ?? "",
          city: match.properties.city ?? "",
          website: match.properties.website ?? null,
          address: match.properties.address ?? null,
          phone: match.properties.phone ?? null,
          region: match.properties.region ?? null,
          zip: match.properties.zip ?? null,
          lat: match.geometry?.coordinates[1] ?? null,
          lng: match.geometry?.coordinates[0] ?? null,
          openingHours: match.properties.openingHours ?? null,
        };
        void handleSelect(school);
      })
      .catch(() => {
        // Network / parse error — leave on search step
      });
    return () => {
      cancelled = true;
    };
    // handleSelect is stable across renders in practice; we re-run only when placeIdParam changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeIdParam]);

  const domain = selected?.website ? extractDomain(selected.website) : "";

  const handleSelect = async (school: SchoolMatch) => {
    // Clear any stale claim data from a previous session before starting fresh
    localStorage.removeItem(MANUAL_SCHOOL_KEY);
    localStorage.removeItem("domain_claim");
    setSelected(school);
    const { data } = await supabase
      .from("driving_schools")
      .select("place_id")
      .eq("place_id", school._placeId)
      .eq("status", "accepted")
      .maybeSingle();
    if (data) {
      setStep("already-claimed");
      return;
    }
    if (school.website) {
      setStep("domain-email");
    } else {
      localStorage.setItem(MANUAL_SCHOOL_KEY, JSON.stringify(school));
      setStep("manual-claim");
    }
  };

  const goToManualClaim = () => {
    localStorage.removeItem("domain_claim");
    if (selected) localStorage.setItem(MANUAL_SCHOOL_KEY, JSON.stringify(selected));
    setStep("manual-claim");
  };

  const handleManualDone = () => {
    localStorage.removeItem(MANUAL_SCHOOL_KEY);
    setStep("done");
  };

  const handleDone = () => navigate("/driving-school/dashboard");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] pt-20 px-4 pb-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <h1 className="text-2xl font-bold">{t("school.claim.title")}</h1>

          {step === "auth-error" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {authError}
              </p>
              <button
                type="button"
                onClick={() => { setAuthError(null); setStep("search"); }}
                className="text-sm underline text-ink-muted text-center"
              >
                {t("school.claim.backToSearch")}
              </button>
            </div>
          )}

          {step === "search" && (
            <>
              <p className="text-sm text-ink-muted">{t("school.claim.searchHint")}</p>
              <ClaimSearch onSelect={handleSelect} />
              <button
                type="button"
                onClick={() => { localStorage.removeItem("domain_claim"); setStep("not-found"); }}
                className="text-sm underline text-ink-muted text-center mt-2"
              >
                {t("school.claim.notListed")}
              </button>
            </>
          )}

          {step === "already-claimed" && selected && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted"
                dangerouslySetInnerHTML={{
                  __html: t("school.claim.alreadyClaimed", { name: selected.name }),
                }}
              />
              <button
                type="button"
                onClick={() => { localStorage.removeItem("domain_claim"); setStep("search"); setSelected(null); }}
                className="text-xs text-ink-muted hover:text-ink transition-colors self-start underline"
              >
                {t("school.claim.backToSearch")}
              </button>
            </div>
          )}

          {step === "domain-email" && selected && (
            <>
              <p
                className="text-sm text-ink-muted"
                dangerouslySetInnerHTML={{
                  __html: t("school.claim.foundSchool", { name: selected.name, domain }),
                }}
              />
              <AuthForm
                mode="magic-link"
                role="autoscuola"
                requireEmailDomain={domain}
                emailRedirectTo={`${window.location.origin}/set-password?next=/driving-school/dashboard`}
                onSuccess={() => {
                  console.info("[domain-email onSuccess] storing domain_claim:", selected);
                  localStorage.setItem("domain_claim", JSON.stringify(selected));
                }}
              />
              <button
                type="button"
                onClick={goToManualClaim}
                className="text-sm underline text-ink-muted text-center"
              >
                {t("school.claim.noDomainEmail", { domain })}
              </button>
            </>
          )}

          {step === "manual-claim" && (
            <>
              {/* Recovery state: user arrived via email link but school data is gone */}
              {!selected && !localStorage.getItem(MANUAL_SCHOOL_KEY) ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-ink-muted bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    {t("school.claim.sessionLost")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("claim_manual_school");
                      localStorage.removeItem("domain_claim");
                      setSelected(null);
                      setStep("search");
                    }}
                    className="text-sm underline text-ink-muted text-center self-start"
                  >
                    {t("school.claim.sessionLostCta")}
                  </button>
                </div>
              ) : (
                <>
                  {selected ? (
                    <p
                      className="text-sm text-ink-muted"
                      dangerouslySetInnerHTML={{
                        __html: t("school.claim.manualReview", { name: selected.name }),
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-ink-muted">{t("school.claim.manualReviewReturn")}</p>
                      <p className="text-xs text-ink-faint">{t("school.claim.manualReviewReturnHint")}</p>
                    </div>
                  )}
                  <ClaimForm
                    placeId={selected?._placeId}
                    schoolName={selected?.name}
                    schoolData={selected ?? undefined}
                    emailRedirectTo={`${BASE_URL}?step=manual-claim`}
                    onSuccess={handleManualDone}
                  />
                </>
              )}
            </>
          )}

          {step === "not-found" && (
            <>
              <p className="text-sm text-ink-muted">{t("school.claim.notFound")}</p>
              <ClaimForm
                emailRedirectTo={`${BASE_URL}?step=not-found`}
                onSuccess={() => setStep("done")}
              />

            </>
          )}

          {step === "done" && (
            <div className="text-center flex flex-col gap-4">
              <p className="font-semibold text-lg">{t("school.claim.submitted")}</p>
              <p className="text-sm text-ink-muted">{t("school.claim.submittedDesc")}</p>
              <button type="button" onClick={handleDone} className="underline text-sm">
                {t("school.claim.goToDashboard")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
