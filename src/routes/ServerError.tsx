import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Nav } from "@/components/nav/Nav";

interface Props {
  error?: Error;
  onReset?: () => void;
}

export default function ServerError({ error, onReset }: Props) {
  const { t } = useTranslation();

  const handleReload = () => {
    if (onReset) onReset();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

          <div className="flex flex-col gap-3">
            <p className="text-6xl">⚙️</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("landing.errors.server.title")}
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              {t("landing.errors.server.desc")}
            </p>
          </div>

          {error?.message && (
            <details className="w-full text-left border border-line rounded-lg overflow-hidden">
              <summary className="px-3 py-2 text-xs font-medium text-ink-muted cursor-pointer select-none hover:text-ink transition-colors">
                {t("landing.errors.server.details")}
              </summary>
              <pre className="px-3 py-2 text-xs text-red-600 bg-red-50 overflow-auto whitespace-pre-wrap break-words border-t border-line">
                {error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors flex-1"
            >
              {t("landing.errors.server.reload")}
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-brand-soft transition-colors flex-1"
              >
                {t("landing.errors.server.retry")}
              </button>
            )}
          </div>

          <Link
            to="/"
            className="text-sm text-ink-muted hover:text-ink transition-colors underline underline-offset-2"
          >
            {t("landing.errors.server.home")}
          </Link>

        </div>
      </div>
    </div>
  );
}
