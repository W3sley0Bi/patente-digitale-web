import { useTranslation } from "react-i18next";
import { useCerca } from "@/hooks/useCerca";
import { ResultsList } from "./ResultsList";
import { SchoolMap } from "./SchoolMap";
import { SearchBar } from "./SearchBar";

export function CercaPage() {
  const { t } = useTranslation();
  const { query, results, selected, loading, error, setQuery, setSelected } = useCerca();

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 pb-8 pt-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-fg">{t("cerca.title")}</h1>
      <div className="mb-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {/* Desktop: side by side */}
      <div className="hidden flex-1 gap-4 md:flex" style={{ minHeight: "calc(100vh - 180px)" }}>
        <div className="flex w-80 shrink-0 flex-col overflow-hidden">
          <ResultsList
            schools={results}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
            error={error}
          />
        </div>
        <div className="flex-1 overflow-hidden rounded-xl">
          {!loading && (
            <SchoolMap
              schools={results}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="h-[50vh] overflow-hidden rounded-xl">
          {!loading && (
            <SchoolMap
              schools={results}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
        <div className="flex flex-col" style={{ minHeight: "50vh" }}>
          <ResultsList
            schools={results}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
