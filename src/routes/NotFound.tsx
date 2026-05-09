import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Nav } from "@/components/nav/Nav";
import mascotBackpack from "@/assets/mascot-backpack.png";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 pt-20 pb-16">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

          <img
            src={mascotBackpack}
            alt="Patentino"
            className="w-24 h-24 object-contain opacity-70"
          />

          <div className="flex flex-col gap-3">
            <p className="text-7xl font-black tracking-tight text-brand">404</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("landing.errors.notFound.title")}
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              {t("landing.errors.notFound.desc")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors flex-1"
            >
              {t("landing.errors.notFound.cta")}
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center justify-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-brand-soft transition-colors flex-1"
            >
              {t("landing.errors.notFound.search")}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
