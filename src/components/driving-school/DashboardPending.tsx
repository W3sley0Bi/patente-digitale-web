interface DashboardPendingProps {
  status: "pending" | "rejected";
}

export function DashboardPending({ status }: DashboardPendingProps) {
  if (status === "rejected") {
    return (
      <div className="text-center flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Claim rejected</h2>
        <p className="text-ink-muted text-sm">
          Your ownership claim was not approved.{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">
            Contact us
          </a>{" "}
          to understand why.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Claim in review</h2>
      <p className="text-ink-muted text-sm">
        We're reviewing your ownership claim. Usually within 48 hours.
      </p>
    </div>
  );
}
