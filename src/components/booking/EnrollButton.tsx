import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyEnrollment, requestEnrollment } from "@/lib/booking/api";

export function EnrollButton({ schoolId, licenceCode, schoolEmail }: {
  schoolId: string; licenceCode?: string; schoolEmail?: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"none" | "pending" | "active">("none");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMyEnrollment().then((e) => {
      if (e && e.school_id === schoolId) setStatus(e.status === "active" ? "active" : "pending");
    }).catch(() => {});
  }, [schoolId]);

  const enroll = async () => {
    setErr(null);
    try { await requestEnrollment(schoolId, licenceCode, schoolEmail); setStatus("pending"); }
    catch { setErr(t("booking.enroll.error")); }
  };

  if (status === "active") return <span className="text-sm font-bold text-brand-ink">{t("booking.enroll.active")}</span>;
  if (status === "pending") return <span className="text-sm text-ink-muted">{t("booking.enroll.pending")}</span>;
  return (
    <div>
      <button type="button" onClick={enroll} className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white">
        {t("booking.enroll.cta")}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
