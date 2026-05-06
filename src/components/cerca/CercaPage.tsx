import { useTranslation } from "react-i18next";
import { useCerca } from "@/hooks/useCerca";
import { FilterBar } from "./FilterBar";
import { ResultsList } from "./ResultsList";
import { SchoolMap } from "./SchoolMap";

export function CercaPage() {
  const { t } = useTranslation();
  const {
    city, region, zip,
    results, cityOptions,
    selected, loading, error,
    setCity, setRegion, setZip, setSelected, clearFilters,
  } = useCerca();

  const filterKey = [city, region, zip].filter(Boolean).join("|");

  const resultsCountLabel = !loading && !error
    ? t("cerca.resultsCount", { count: results.length })
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 md:px-8">
      {/* Header */}
      <div className="shrink-0 pt-6 pb-4">
        <h1 className="mb-4 font-sans text-xl font-black tracking-tight text-ink md:text-2xl">
          {t("cerca.title")}
        </h1>
        <FilterBar
          city={city}
          region={region}
          zip={zip}
          cityOptions={cityOptions}
          onCityChange={setCity}
          onRegionChange={setRegion}
          onZipChange={setZip}
          onClear={clearFilters}
        />
        {resultsCountLabel && (
          <p className="mt-2 font-sans text-xs text-ink-faint">{resultsCountLabel}</p>
        )}
      </div>

      {/* Desktop: side by side, viewport-locked */}
      <div className="hidden flex-1 gap-4 overflow-hidden pb-6 md:flex">
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-bg-raised shadow-sm">
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
              filterKey={filterKey}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {/* Mobile: stacked, natural scroll */}
      <div className="flex flex-col gap-4 overflow-y-auto pb-6 md:hidden">
        <div className="h-[45vh] shrink-0 overflow-hidden rounded-xl">
          {!loading && (
            <SchoolMap
              schools={results}
              filterKey={filterKey}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
        <ResultsList
          schools={results}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
          error={error}
          stacked
        />
      </div>
    </div>
  );
}
