import { ChevronDown, Locate, Loader2, X, Check } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { REGIONS } from "@/lib/italyGeo";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterBarProps {
	city: string;
	region: string;
	zip: string;
	name: string;
	partnerOnly: boolean;
	cityOptions: string[];
	onCityChange: (v: string) => void;
	onRegionChange: (v: string) => void;
	onZipChange: (v: string) => void;
	onNameChange: (v: string) => void;
	onPartnerOnlyChange: (v: boolean) => void;
	onClear: () => void;
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<string> {
	const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`;
	const res = await fetch(url, { headers: { "User-Agent": "patentedigitale.it/1.0" } });
	if (!res.ok) throw new Error("geocode failed");
	const data = await res.json();
	return (
		data.address?.city ??
		data.address?.town ??
		data.address?.municipality ??
		data.address?.village ??
		""
	);
}

const INPUT_BASE =
	"w-full rounded-lg border border-line bg-bg-raised font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]";

export function FilterBar({
	city,
	region,
	zip,
	name,
	partnerOnly,
	cityOptions,
	onCityChange,
	onRegionChange,
	onZipChange,
	onNameChange,
	onPartnerOnlyChange,
	onClear,
}: FilterBarProps) {
	const { t } = useTranslation();
	const [locating, setLocating] = useState(false);
	const [locError, setLocError] = useState(false);
	const [isCityOpen, setIsCityOpen] = useState(false);
	const [isRegionOpen, setIsRegionOpen] = useState(false);

	const cityInputRef = useRef<HTMLInputElement>(null);
	const cityDropdownRef = useRef<HTMLDivElement>(null);
	const regionDropdownRef = useRef<HTMLDivElement>(null);

	const hasFilters = city || region || zip || name || partnerOnly;

	const filteredCities = cityOptions.filter((c) =>
		c.toLowerCase().includes(city.toLowerCase()),
	);

	const filteredRegions = REGIONS.filter((r) =>
		r.toLowerCase().includes(region.toLowerCase()),
	);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
				setIsCityOpen(false);
			}
			if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) {
				setIsRegionOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleLocate() {
		if (!navigator.geolocation) return;
		setLocating(true);
		setLocError(false);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const found = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
					if (found) {
						onCityChange(found);
						cityInputRef.current?.focus();
						setIsCityOpen(false);
					}
				} catch {
					setLocError(true);
				} finally {
					setLocating(false);
				}
			},
			() => { setLocating(false); setLocError(true); },
			{ timeout: 8000 },
		);
	}

	return (
		<div className="flex flex-col gap-2.5">

			{/* Row 1: Name */}
			<div className="relative">
				<input
					type="text"
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder={t("cerca.filters.namePlaceholder")}
					className={cn(INPUT_BASE, "py-2 px-3")}
					autoComplete="off"
				/>
				{name && (
					<button
						type="button"
						onClick={() => onNameChange("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* Input row: city (grows) | zip (fixed) | region (fixed) */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">

				{/* City */}
				<div className="relative flex-1 min-w-0" ref={cityDropdownRef}>
					<button
						type="button"
						onClick={handleLocate}
						disabled={locating}
						title={locError ? t("cerca.filters.locationError") : t("cerca.filters.locationBtn")}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-ink-faint hover:text-brand disabled:opacity-50 transition-colors"
					>
						{locating
							? <Loader2 size={15} className="animate-spin text-brand" />
							: <Locate size={15} className={locError ? "text-accent" : "text-brand"} />
						}
					</button>

					<input
						ref={cityInputRef}
						type="text"
						value={city}
						onFocus={() => setIsCityOpen(true)}
						onChange={(e) => { onCityChange(e.target.value); setIsCityOpen(true); }}
						placeholder={t("cerca.filters.cityPlaceholder")}
						className={cn(INPUT_BASE, "py-2 pl-9", city ? "pr-8" : "pr-3")}
						autoComplete="off"
					/>

					{city && (
						<button
							type="button"
							onClick={() => { onCityChange(""); setIsCityOpen(false); }}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
						>
							<X size={14} />
						</button>
					)}

					{isCityOpen && filteredCities.length > 0 && (
						<div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100">
							<div className="max-h-52 overflow-y-auto py-1">
								{filteredCities.map((c) => (
									<button
										key={c}
										type="button"
										onClick={() => { onCityChange(c); setIsCityOpen(false); }}
										className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
									>
										<span>{c}</span>
										{city === c && <Check size={13} className="text-brand shrink-0" />}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* ZIP */}
				<div className="relative shrink-0 w-24">
					<input
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						maxLength={5}
						value={zip}
						onChange={(e) => onZipChange(e.target.value.replace(/\D/g, ""))}
						placeholder={t("cerca.filters.zipPlaceholder")}
						className={cn(INPUT_BASE, "py-2 pl-3", zip ? "pr-8" : "pr-3")}
						autoComplete="off"
					/>
					{zip && (
						<button
							type="button"
							onClick={() => onZipChange("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
						>
							<X size={14} />
						</button>
					)}
				</div>

				{/* Region */}
				<div className="relative shrink-0 sm:w-44" ref={regionDropdownRef}>
					<input
						type="text"
						value={region}
						onFocus={() => setIsRegionOpen(true)}
						onChange={(e) => { onRegionChange(e.target.value); setIsRegionOpen(true); }}
						placeholder={t("cerca.filters.regionPlaceholder")}
						className={cn(INPUT_BASE, "py-2 pl-3 pr-8")}
						autoComplete="off"
					/>

					{region ? (
						<button
							type="button"
							onClick={() => { onRegionChange(""); setIsRegionOpen(false); }}
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
										onClick={() => { onRegionChange(r); setIsRegionOpen(false); }}
										className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
									>
										<span>{r}</span>
										{region === r && <Check size={13} className="shrink-0 text-brand" />}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Partner toggle + clear all */}
			<div className="flex items-center justify-between px-0.5">
				<label className="flex cursor-pointer items-center gap-2 select-none">
					<Checkbox
						id="partner-filter"
						checked={partnerOnly}
						onCheckedChange={(checked) => onPartnerOnlyChange(!!checked)}
						className="data-[state=checked]:bg-brand data-[state=checked]:border-brand"
					/>
					<span className={cn(
						"font-sans text-sm font-semibold tracking-tight transition-colors",
						partnerOnly ? "text-brand" : "text-ink-muted",
					)}>
						{t("cerca.filters.partnerOnly")}
					</span>
				</label>

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
	);
}
