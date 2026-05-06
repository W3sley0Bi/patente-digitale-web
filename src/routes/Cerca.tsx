import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CercaPage } from "@/components/cerca/CercaPage";
import { Nav } from "@/components/nav/Nav";

export default function Cerca() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  return (
    <div className="h-screen overflow-hidden bg-bg text-ink selection:bg-brand/20 selection:text-brand-ink">
      <Nav />
      <main className="h-full overflow-hidden pt-20">
        <CercaPage />
      </main>
    </div>
  );
}
