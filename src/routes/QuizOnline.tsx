import { useTranslation } from "react-i18next";
import { Nav } from "@/components/nav/Nav";

export default function QuizOnline() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t("student.quiz.title")}</h1>
          <p className="text-ink-muted mt-2">{t("student.quiz.desc")}</p>
        </div>
      </div>
    </div>
  );
}
