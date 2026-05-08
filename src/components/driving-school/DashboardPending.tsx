import { useTranslation } from "react-i18next";

interface DashboardPendingProps {
  status: "pending" | "rejected";
}

export function DashboardPending({ status }: DashboardPendingProps) {
  const { t } = useTranslation();

  if (status === "rejected") {
    return (
      <div className="text-center flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("school.pending.rejectedTitle")}</h2>
        <p className="text-ink-muted text-sm">
          {t("school.pending.rejectedDesc")}{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">
            {t("school.pending.rejectedContact")}
          </a>{" "}
          {t("school.pending.rejectedReason")}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{t("school.pending.pendingTitle")}</h2>
      <p className="text-ink-muted text-sm">{t("school.pending.pendingDesc")}</p>
    </div>
  );
}
