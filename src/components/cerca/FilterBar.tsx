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
	partnerOnly: boolean;
	cityOptions: string[];
	onCityChange: (v: string) => void;
	onRegionChange: (v: string) => void;
	onZipChange: (v: string) => void;
	onPartnerOnlyChange: (v: boolean) => void;
	onClear: () => void;
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<string> {
	const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`;
	const res = await fetch(url, {
		headers: { "User-Agent": "patentedigitale.it/1.0" },
	});
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

export function FilterBar({
	city,
	region,
	zip,
	partnerOnly,
	cityOptions,
	onCityChange,
	onRegionChange,
	onZipChange,
	onPartnerOnlyChange,
	onClear,
}: FilterBarProps) {
	const { t } = useTranslation();
	const [locating, setLocating] = useState(false);
	const [locError, setLocError] = useState(false);
	const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
	const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
	
	const cityInputRef = useRef<HTMLInputElement>(null);
	const regionInputRef = useRef<HTMLInputElement>(null);
	const cityDropdownRef = useRef<HTMLDivElement>(null);
	const regionDropdownRef = useRef<HTMLDivElement>(null);

	const hasFilters = city || region || zip || partnerOnly;

	const filteredCities = cityOptions.filter((c) =>
		c.toLowerCase().includes(city.toLowerCase()),
	);

	const filteredRegions = REGIONS.filter((r) =>
		r.toLowerCase().includes(region.toLowerCase()),
	);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				cityDropdownRef.current &&
				!cityDropdownRef.current.contains(event.target as Node)
			) {
				setIsCityDropdownOpen(false);
			}
			if (
				regionDropdownRef.current &&
				!regionDropdownRef.current.contains(event.target as Node)
			) {
				setIsRegionDropdownOpen(false);
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
					const found = await reverseGeocodeCity(
						pos.coords.latitude,
						pos.coords.longitude,
					);
					if (found) {
						onCityChange(found);
						cityInputRef.current?.focus();
						setIsCityDropdownOpen(false);
					}
				} catch {
					setLocError(true);
				} finally {
					setLocating(false);
				}
			},
			() => {
				setLocating(false);
				setLocError(true);
			},
			{ timeout: 8000 },
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Row 1: city + zip + region */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				{/* City autocomplete with custom styled dropdown */}
				<div className="relative shrink-0 sm:w-64" ref={cityDropdownRef}>
					<button
						type="button"
						onClick={handleLocate}
						disabled={locating}
						className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-brand disabled:opacity-60 transition-colors z-10"
						title={
							locError
								? t("cerca.filters.locationError")
								: t("cerca.filters.locationBtn")
						}
					>
						{locating ? (
							<Loader2 size={14} className="animate-spin text-brand" />
						) : (
							<Locate
								size={14}
								className={locError ? "text-accent" : "text-brand"}
							/>
						)}
					</button>
					<input
						ref={cityInputRef}
						type="text"
						value={city}
						onFocus={() => setIsCityDropdownOpen(true)}
						onChange={(e) => {
							onCityChange(e.target.value);
							setIsCityDropdownOpen(true);
						}}
						placeholder={t("cerca.filters.cityPlaceholder")}
						className="w-full rounded-lg border border-line bg-bg-raised ps-9 pe-8 py-1.5 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
						autoComplete="off"
					/>

					{isCityDropdownOpen && filteredCities.length > 0 && (
						<div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100">
							<div className="max-h-60 overflow-y-auto py-1">
								{filteredCities.map((c) => (
									<button
										key={c}
										type="button"
										onClick={() => {
											onCityChange(c);
											setIsCityDropdownOpen(false);
										}}
										className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm text-ink transition-colors hover:bg-brand-soft/30 hover:text-brand"
									>
										<span>{c}</span>
										{city === c && <Check size={14} className="text-brand" />}
									</button>
								))}
							</div>
						</div>
					)}

					{city && (
						<button
							type="button"
							onClick={() => {
								onCityChange("");
								setIsCityDropdownOpen(false);
							}}
							className="absolute end-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
						>
							<X size={14} />
						</button>
					)}
				</div>

				{/* ZIP input */}
				<div className="relative shrink-0 sm:w-28">
					<input
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						maxLength={5}
						value={zip}
						onChange={(e) => onZipChange(e.target.value.replace(/\D/g, ""))}
						placeholder={t("cerca.filters.zipPlaceholder")}
						className="w-full rounded-lg border border-line bg-bg-raised px-3 py-1.5 pe-8 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
						autoComplete="off"
					/>
					{zip && (
						<button
							type="button"
							onClick={() => onZipChange("")}
							className="absolute end-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
						>
							<X size={14} />
						</button>
					)}
				</div>

				{/* Region autocomplete */}
				<div className="relative shrink-0 sm:w-40" ref={regionDropdownRef}>
					<input
						ref={regionInputRef}
						type="text"
						value={region}
						onFocus={() => setIsRegionDropdownOpen(true)}
						onChange={(e) => {
							onRegionChange(e.target.value);
							setIsRegionDropdownOpen(true);
						}}
						placeholder={t("cerca.filters.regionPlaceholder")}
						className="w-full rounded-lg border border-line bg-bg-raised px-3 py-1.5 pe-8 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
						autoComplete="off"
					/>
					<ChevronDown
						size={14}
						className={cn(
							"absolute end-2 top-1/2 -translate-y-1/2 text-ink-faint transition-transform duration-200 pointer-events-none",
							isRegionDropdownOpen && "rotate-180",
						)}
					/>

					{isRegionDropdownOpen && filteredRegions.length > 0 && (
						<div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100">
							<div className="max-h-60 overflow-y-auto py-1">
								{filteredRegions.map((r) => (
									<button
										key={r}
										type="button"
										onClick={() => {
											onRegionChange(r);
											setIsRegionDropdownOpen(false);
										}}
										className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm text-ink transition-colors hover:bg-brand-soft/30 hover:text-brand"
									>
										<span>{r}</span>
										{region === r && <Check size={14} className="text-brand" />}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center justify-between">
				{/* Partner filter checkbox */}
				<div className="flex items-center space-x-2">
					<Checkbox
						id="partner-filter"
						checked={partnerOnly}
						onCheckedChange={(checked) => onPartnerOnlyChange(!!checked)}
            className="data-checked:bg-brand data-checked:border-brand"
					/>
					<label
						htmlFor="partner-filter"
						className={cn(
							"font-sans text-sm font-bold tracking-tight cursor-pointer select-none transition-colors",
							partnerOnly ? "text-brand" : "text-ink-muted",
						)}
					>
						Solo partner certificati
					</label>
				</div>

				{/* Clear all */}
				{hasFilters && (
					<button
						type="button"
						onClick={onClear}
						className="font-sans text-xs text-ink-faint underline-offset-2 hover:text-accent hover:underline transition-colors"
					>
						{t("cerca.filters.clearAll")}
					</button>
				)}
			</div>
		</div>
	);
}
