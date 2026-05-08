import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/nav/Nav";
import { ClaimSearch, type SchoolMatch } from "@/components/driving-school/ClaimSearch";
import { ClaimForm } from "@/components/driving-school/ClaimForm";
import { AuthForm } from "@/components/auth/AuthForm";

type Step = "search" | "already-claimed" | "domain-email" | "manual-claim" | "not-found" | "done";

function extractDomain(website: string): string {
  try { return new URL(website).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

export default function SignupDrivingSchool() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [selected, setSelected] = useState<SchoolMatch | null>(null);

  const domain = selected?.website ? extractDomain(selected.website) : "";

  const handleSelect = async (school: SchoolMatch) => {
    setSelected(school);
    const { data } = await supabase
      .from("claimed_schools")
      .select("place_id")
      .eq("place_id", school._placeId)
      .maybeSingle();
    if (data) {
      setStep("already-claimed");
      return;
    }
    if (school.website) {
      localStorage.setItem("domain_claim", JSON.stringify({ _placeId: school._placeId, name: school.name }));
      setStep("domain-email");
    } else {
      setStep("manual-claim");
    }
  };

  const handleDone = () => navigate("/driving-school/dashboard");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md flex flex-col gap-6">
          <h1 className="text-2xl font-bold">{t("school.claim.title")}</h1>

          {step === "search" && (
            <>
              <p className="text-sm text-ink-muted">{t("school.claim.searchHint")}</p>
              <ClaimSearch onSelect={handleSelect} />
              <button
                type="button"
                onClick={() => setStep("not-found")}
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
                onClick={() => { setStep("search"); setSelected(null); }}
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
                emailRedirectTo={`${window.location.origin}/set-password?next=/driving-school/dashboard`}
                onSuccess={handleDone}
              />
              <button
                type="button"
                onClick={() => setStep("manual-claim")}
                className="text-sm underline text-ink-muted text-center"
              >
                {t("school.claim.noDomainEmail", { domain })}
              </button>
            </>
          )}

          {step === "manual-claim" && selected && (
            <>
              <p
                className="text-sm text-ink-muted"
                dangerouslySetInnerHTML={{
                  __html: t("school.claim.manualReview", { name: selected.name }),
                }}
              />
              <ClaimForm
                placeId={selected._placeId}
                schoolName={selected.name}
                onSuccess={() => setStep("done")}
              />
            </>
          )}

          {step === "not-found" && (
            <>
              <p className="text-sm text-ink-muted">{t("school.claim.notFound")}</p>
              <ClaimForm onSuccess={() => setStep("done")} />
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
