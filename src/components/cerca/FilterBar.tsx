import { BadgeCheck, Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { REGIONS } from "@/lib/italyGeo";
import type { PlaceSuggestion } from "@/lib/mapboxGeocode";
import { cn } from "@/lib/utils";
import { PlaceSearchBar } from "./PlaceSearchBar";

interface FilterBarProps {
	query: string;
	region: string;
	onQueryChange: (v: string) => void;
	onPlaceSelect: (place: PlaceSuggestion) => void;
	onRegionChange: (v: string) => void;
	onClear: () => void;
	/** Omitted in student-facing search, where only verified schools ever show. */
	verifiedOnly?: boolean;
	onVerifiedOnlyChange?: (v: boolean) => void;
}

const INPUT_BASE =
	"w-full rounded-lg border border-line bg-bg-raised font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]";

export function FilterBar({
	query,
	region,
	verifiedOnly,
	onQueryChange,
	onPlaceSelect,
	onRegionChange,
	onVerifiedOnlyChange,
	onClear,
}: FilterBarProps) {
	const { t } = useTranslation();
	const [isRegionOpen, setIsRegionOpen] = useState(false);
	const regionDropdownRef = useRef<HTMLDivElement>(null);

	const hasFilters = query || region || verifiedOnly;

	const filteredRegions = REGIONS.filter((r) =>
		r.toLowerCase().includes(region.toLowerCase()),
	);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				regionDropdownRef.current &&
				!regionDropdownRef.current.contains(e.target as Node)
			) {
				setIsRegionOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div className="flex flex-col gap-2.5">
			{/* Unified search: name, city, address or postcode — geocoded via Mapbox */}
			<PlaceSearchBar
				value={query}
				onChange={onQueryChange}
				onPlaceSelect={onPlaceSelect}
			/>

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				{/* Region */}
				<div className="relative shrink-0 sm:w-44" ref={regionDropdownRef}>
					<input
						type="text"
						value={region}
						onFocus={() => setIsRegionOpen(true)}
						onChange={(e) => {
							onRegionChange(e.target.value);
							setIsRegionOpen(true);
						}}
						placeholder={t("cerca.filters.regionPlaceholder")}
						className={cn(INPUT_BASE, "py-2 pl-3 pr-8")}
						autoComplete="off"
					/>

					{region ? (
						<button
							type="button"
							onClick={() => {
								onRegionChange("");
								setIsRegionOpen(false);
							}}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
						>
							<X size={14} />
						</button>
					) : (
						<ChevronDown
							size={14}
							className={cn(
								"pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint transition-transform duration-200",
								isRegionOpen && "rotate-180",
							)}
						/>
					)}

					{isRegionOpen && filteredRegions.length > 0 && (
						<div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100">
							<div className="max-h-52 overflow-y-auto py-1">
								{filteredRegions.map((r) => (
									<button
										key={r}
										type="button"
										onClick={() => {
											onRegionChange(r);
											setIsRegionOpen(false);
										}}
										className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
									>
										<span>{r}</span>
										{region === r && (
											<Check size={13} className="shrink-0 text-brand" />
										)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Toggles + clear all */}
				<div className="flex items-center justify-between px-0.5">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
						{onVerifiedOnlyChange && (
							<label className="flex cursor-pointer items-center gap-2 select-none">
								<Checkbox
									id="partner-filter"
									checked={verifiedOnly}
									onCheckedChange={(checked) => onVerifiedOnlyChange(!!checked)}
									className="data-[state=checked]:bg-brand data-[state=checked]:border-brand"
								/>
								<BadgeCheck
									size={13}
									className={cn(
										"shrink-0 transition-colors",
										verifiedOnly ? "text-brand" : "text-ink-faint",
									)}
									strokeWidth={2.5}
								/>
								<span
									className={cn(
										"font-sans text-sm font-semibold tracking-tight transition-colors",
										verifiedOnly ? "text-brand" : "text-ink-muted",
									)}
								>
									{t("cerca.filters.partnerOnly")}
								</span>
							</label>
						)}
					</div>

					{hasFilters && (
						<button
							type="button"
							onClick={onClear}
							className="flex items-center gap-1 font-sans text-xs text-ink-faint hover:text-accent transition-colors"
						>
							<X size={11} />
							{t("cerca.filters.clearAll")}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
