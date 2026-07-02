import { useTranslation } from "react-i18next";
import { FilterBar } from "@/components/cerca/FilterBar";
import { ResultsList } from "@/components/cerca/ResultsList";
import { SchoolMap } from "@/components/cerca/SchoolMap";
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
	const {
		city,
		region,
		zip,
		name,
		verifiedOnly,
		enrollmentOnly,
		results,
		cityOptions,
		selected,
		loading,
		error,
		setCity,
		setRegion,
		setZip,
		setName,
		setVerifiedOnly,
		setEnrollmentOnly,
		setSelected,
		clearFilters,
	} = useCerca();

	const filterKey = [city, region, zip, name].filter(Boolean).join("|");

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-4 md:p-6">
			<h2 className="font-sans text-base font-black tracking-tight text-ink">
				{t("booking.student.schoolFinder.title")}
			</h2>

			<div className="mt-3">
				<FilterBar
					city={city}
					region={region}
					zip={zip}
					name={name}
					verifiedOnly={verifiedOnly}
					enrollmentOnly={enrollmentOnly}
					cityOptions={cityOptions}
					onCityChange={setCity}
					onRegionChange={setRegion}
					onZipChange={setZip}
					onNameChange={setName}
					onVerifiedOnlyChange={setVerifiedOnly}
					onEnrollmentOnlyChange={setEnrollmentOnly}
					onClear={clearFilters}
				/>
			</div>

			<div className="mt-4 flex flex-col gap-4 md:h-[420px] md:flex-row">
				<div className="flex overflow-hidden rounded-xl border border-line md:h-full md:w-72 md:shrink-0 md:flex-col">
					<ResultsList
						schools={results}
						selected={selected}
						onSelect={setSelected}
						loading={loading}
						error={error}
						stacked
					/>
				</div>
				<div className="relative h-[260px] flex-1 overflow-hidden rounded-xl md:h-full">
					{!loading && (
						<SchoolMap
							schools={results}
							filterKey={filterKey}
							selected={selected}
							onSelect={setSelected}
						/>
					)}
					<AppSchoolDetailPanel
						school={selected}
						onClose={() => setSelected(null)}
					/>
				</div>
			</div>
		</div>
	);
}
