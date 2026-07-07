import { ChevronDown, ChevronUp, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterBar } from "@/components/cerca/FilterBar";
import { ResultsList } from "@/components/cerca/ResultsList";
import { SchoolMap } from "@/components/cerca/SchoolMap";
import { Button } from "@/components/ui/button";
import { useCerca } from "@/hooks/useCerca";
import { AppSchoolDetailPanel } from "./AppSchoolDetailPanel";

/**
 * In-app school finder for students without an active enrollment. Reuses the
 * generic marketing search building blocks (useCerca, FilterBar, ResultsList,
 * SchoolMap) but is its own container with its own detail panel — it never
 * links to /search or /app/signup/driving-school.
 */
export function AppSchoolFinderPanel() {
	const { t } = useTranslation();
	const [isMapVisible, setIsMapVisible] = useState(false);
	// Students can only ever enroll in verified/partner schools, so the
	// search is always scoped to them — no toggle, nothing to opt out of.
	const {
		query,
		region,
		coords,
		results,
		selected,
		deepLinkPlaceId,
		loading,
		error,
		setQuery,
		setPlace,
		setRegion,
		setSelected,
		clearFilters,
	} = useCerca({ forceVerifiedOnly: true });

	const filterKey = [query, region, coords?.lat, coords?.lng]
		.filter(Boolean)
		.join("|");

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-4 md:p-6">
			<h2 className="font-sans text-base font-black tracking-tight text-ink">
				{t("booking.student.schoolFinder.title")}
			</h2>

			<div className="mt-3">
				<FilterBar
					query={query}
					region={region}
					onQueryChange={setQuery}
					onPlaceSelect={setPlace}
					onRegionChange={setRegion}
					onClear={clearFilters}
				/>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setIsMapVisible(!isMapVisible)}
				className="mt-3 flex items-center gap-2 text-ink-muted md:hidden"
			>
				<MapIcon size={14} />
				{isMapVisible
					? t("booking.student.schoolFinder.hideMap")
					: t("booking.student.schoolFinder.showMap")}
				{isMapVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
			</Button>

			<div className="relative mt-4 flex flex-col gap-4 overflow-hidden md:h-[420px] md:flex-row">
				<div className="flex h-64 flex-col overflow-y-auto rounded-xl border border-line p-3 md:h-full md:w-72 md:shrink-0">
					<ResultsList
						schools={results}
						selected={selected}
						onSelect={setSelected}
						loading={loading}
						error={error}
						stacked
					/>
				</div>
				<div
					className={`relative h-[260px] overflow-hidden rounded-xl md:h-full md:flex-1 ${
						isMapVisible ? "block" : "hidden md:block"
					}`}
				>
					{!loading && (
						<SchoolMap
							schools={results}
							filterKey={filterKey}
							selected={selected}
							onSelect={setSelected}
							center={coords}
						/>
					)}
				</div>

				{/*
				 * A sibling of the map div (not nested inside it) so the mobile
				 * bottom sheet still shows even while the map itself is toggled
				 * closed (that div is display:none on mobile by default).
				 */}
				<AppSchoolDetailPanel
					school={selected}
					onClose={() => setSelected(null)}
					deepLinkPlaceId={deepLinkPlaceId}
				/>
			</div>
		</div>
	);
}
