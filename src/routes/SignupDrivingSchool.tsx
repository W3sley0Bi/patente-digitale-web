import { useState } from "react";
import { useNavigate } from "react-router";
import { ClaimSearch, type SchoolMatch } from "@/components/driving-school/ClaimSearch";
import { ClaimForm } from "@/components/driving-school/ClaimForm";
import { AuthForm } from "@/components/auth/AuthForm";

type Step = "search" | "domain-email" | "manual-claim" | "not-found" | "done";

function extractDomain(website: string): string {
  try { return new URL(website).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

export default function SignupDrivingSchool() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [selected, setSelected] = useState<SchoolMatch | null>(null);

  const domain = selected?.website ? extractDomain(selected.website) : "";

  const handleSelect = (school: SchoolMatch) => {
    setSelected(school);
    setStep(school.website ? "domain-email" : "manual-claim");
  };

  const handleDone = () => navigate("/driving-school/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Claim your driving school</h1>

        {step === "search" && (
          <>
            <p className="text-sm text-ink-muted">Search for your school to get started.</p>
            <ClaimSearch onSelect={handleSelect} />
            <button
              type="button"
              onClick={() => setStep("not-found")}
              className="text-sm underline text-ink-muted text-center mt-2"
            >
              My school isn't listed
            </button>
          </>
        )}

        {step === "domain-email" && selected && (
          <>
            <p className="text-sm text-ink-muted">
              We found <strong>{selected.name}</strong>. To get verified automatically, use a{" "}
              <strong>@{domain}</strong> email address.
            </p>
            <AuthForm mode="magic-link" role="autoscuola" onSuccess={handleDone} />
            <button
              type="button"
              onClick={() => setStep("manual-claim")}
              className="text-sm underline text-ink-muted text-center"
            >
              I don't have a @{domain} email
            </button>
          </>
        )}

        {step === "manual-claim" && selected && (
          <>
            <p className="text-sm text-ink-muted">
              <strong>{selected.name}</strong> — your claim will be reviewed manually, usually within 48 hours.
            </p>
            <ClaimForm
              placeId={selected._placeId}
              schoolName={selected.name}
              onSuccess={() => setStep("done")}
            />
          </>
        )}

        {step === "not-found" && (
          <>
            <p className="text-sm text-ink-muted">
              Your school isn't in our system yet. Submit a claim and we'll add it.
            </p>
            <ClaimForm onSuccess={() => setStep("done")} />
          </>
        )}

        {step === "done" && (
          <div className="text-center flex flex-col gap-4">
            <p className="font-semibold text-lg">Claim submitted!</p>
            <p className="text-sm text-ink-muted">You'll hear from us within 48 hours.</p>
            <button type="button" onClick={handleDone} className="underline text-sm">
              Go to your dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
