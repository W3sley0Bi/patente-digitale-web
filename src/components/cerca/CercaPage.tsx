import { useTranslation } from "react-i18next";
import { useCerca } from "@/hooks/useCerca";
import { FilterBar } from "./FilterBar";
import { ResultsList } from "./ResultsList";
import { SchoolMap } from "./SchoolMap";
import { SchoolDetailPanel } from "./SchoolDetailPanel";

export function CercaPage() {
	const { t } = useTranslation();
	const {
		city,
		region,
		zip,
		partnerOnly,
		results,
		cityOptions,
		selected,
		loading,
		error,
		setCity,
		setRegion,
		setZip,
		setPartnerOnly,
		setSelected,
		clearFilters,
	} = useCerca();

	const filterKey = [city, region, zip].filter(Boolean).join("|");

	const resultsCountLabel =
		!loading && !error ? t("cerca.resultsCount", { count: results.length }) : null;

	return (
		<div className="flex h-full flex-col overflow-hidden px-4 md:px-8">
			{/* Header - Always Shrink-0 */}
			<div className="shrink-0 pt-6 pb-4">
				<div className="flex items-center justify-between mb-4">
					<h1 className="font-sans text-xl font-black tracking-tight text-ink md:text-2xl">
						{t("cerca.title")}
					</h1>
				</div>

				<div className="block">
					<FilterBar
						city={city}
						region={region}
						zip={zip}
						partnerOnly={partnerOnly}
						cityOptions={cityOptions}
						onCityChange={setCity}
						onRegionChange={setRegion}
						onZipChange={setZip}
						onPartnerOnlyChange={setPartnerOnly}
						onClear={clearFilters}
					/>
				</div>

				{resultsCountLabel && (
					<p className="mt-2 font-sans text-xs text-ink-faint">
						{resultsCountLabel}
					</p>
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
					<OwnerCallout t={t} />
				</div>
				<div className="relative flex-1 overflow-hidden rounded-xl">
					{!loading && (
						<SchoolMap
							schools={results}
							filterKey={filterKey}
							selected={selected}
							onSelect={setSelected}
						/>
					)}
					<SchoolDetailPanel
						school={selected}
						onClose={() => setSelected(null)}
					/>
				</div>
			</div>

			{/* Mobile: Managed Layout */}
			<div className="flex flex-1 flex-col overflow-hidden md:hidden">
				{/* Map Area - Always visible on mobile */}
				<div className="h-[28vh] shrink-0 overflow-hidden rounded-xl mb-4 border border-line shadow-sm">
					{!loading && (
						<SchoolMap
							schools={results}
							filterKey={filterKey}
							selected={selected}
							onSelect={setSelected}
						/>
					)}
				</div>

				{/* Scrollable Results Area */}
				<div className="flex-1 overflow-y-auto pb-6">
					<ResultsList
						schools={results}
						selected={selected}
						onSelect={setSelected}
						loading={loading}
						error={error}
						stacked
					/>
					<OwnerCallout t={t} />
				</div>
				
				<SchoolDetailPanel
					school={selected}
					onClose={() => setSelected(null)}
				/>
			</div>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OwnerCallout({ t }: { t: any }) {
  return (
    <div className="shrink-0 border-t border-line px-4 py-3 text-center">
      <p className="font-sans text-xs text-ink-muted">
        {t("cerca.ownerCallout.label")}{" "}
        <a
          href="mailto:supporto@patentedigitale.it"
          className="font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          supporto@patentedigitale.it
        </a>
      </p>
    </div>
  );
}
