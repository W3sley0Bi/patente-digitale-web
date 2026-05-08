import { useTranslation } from "react-i18next";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";

export default function DrivingSchoolSettings() {
  const { t } = useTranslation();
  return (
    <DrivingSchoolLayout>
      <h1 className="text-2xl font-bold mb-2">{t("school.dashboard.nav.settings")}</h1>
      <p className="text-sm text-ink-muted">{t("landing.placeholders.subtitle")}</p>
    </DrivingSchoolLayout>
  );
}
