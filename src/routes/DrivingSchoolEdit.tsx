import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { SchoolEditor } from "@/components/driving-school/SchoolEditor";
import type { SchoolEditorData } from "@/components/driving-school/SchoolEditor";

export default function DrivingSchoolEdit() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<SchoolEditorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("claimed_schools")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data: row }) => {
        setData(row as SchoolEditorData | null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <DrivingSchoolLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-pulse rounded-full bg-brand/20" />
        </div>
      </DrivingSchoolLayout>
    );
  }

  return (
    <DrivingSchoolLayout>
      <h1 className="text-2xl font-bold mb-6">{t("school.edit.title")}</h1>
      {user && data ? (
        <SchoolEditor initial={data} userId={user.id} />
      ) : (
        <p className="text-ink-muted text-sm">
          {t("school.edit.noData")}{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">
            {t("school.edit.support")}
          </a>.
        </p>
      )}
    </DrivingSchoolLayout>
  );
}
