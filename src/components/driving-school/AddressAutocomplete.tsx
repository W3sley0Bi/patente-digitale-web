import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotonFeature {
	properties: {
		name?: string;
		street?: string;
		housenumber?: string;
		city?: string;
		postcode?: string;
		state?: string;
		countrycode?: string;
		type?: string;
	};
	geometry: { coordinates: [number, number] };
}

export interface AddressResult {
	address: string;
	city: string;
	zip: string;
	region: string;
	lat: number;
	lng: number;
}

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSelect: (result: AddressResult) => void;
}

// Expand typical Italian street abbreviation tokens so that Photon can match them reliably.
function expandItalianAbbreviations(query: string): string {
	let q = query;
	// Replace c.so / C.so / c.so. / C.so. (case-insensitive) with "corso"
	q = q.replace(/\bc\.?so\.?\b/gi, "corso");
	// v.le / V.le / v.le. / V.le. with "viale"
	q = q.replace(/\bv\.?le\.?\b/gi, "viale");
	// p.zza / p.za / P.zza / P.za with "piazza"
	q = q.replace(/\bp\.?zza?\.?\b/gi, "piazza");
	// v. / V. (only when followed by space or end of word)
	q = q.replace(/\bv\.\s+/gi, "via ");
	return q;
}

function getStreetAndNumber(f: PhotonFeature): string {
	const p = f.properties;
	const street = p.street ?? p.name ?? "";
	return p.housenumber ? `${street} ${p.housenumber}` : street;
}

function getDetailsLabel(f: PhotonFeature): string {
	const p = f.properties;
	return [p.city, p.postcode, p.state].filter(Boolean).join(", ");
}

export function AddressAutocomplete({ value, onChange, onSelect }: Props) {
	const { t } = useTranslation();
	const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [activeIndex, setActiveIndex] = useState<number>(-1);
	
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const close = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, []);

	const search = (q: string) => {
		clearTimeout(timer.current);
		
		const expandedQuery = expandItalianAbbreviations(q.trim());
		if (expandedQuery.length < 3) {
			setSuggestions([]);
			setOpen(false);
			setLoading(false);
			return;
		}

		setLoading(true);
		timer.current = setTimeout(async () => {
			try {
				// Use location bias (lat/lon near Rome) and a larger limit (15) to get more candidates
				// which we then filter client-side. Bounding box restricts to general Italian region.
				const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(expandedQuery)}&limit=15&lat=41.9&lon=12.56&bbox=6.75,36.62,18.48,47.09`;
				const res = await fetch(url);
				if (!res.ok) throw new Error("fetch failed");
				const data = await res.json();
				
				// Keep only Italian results, and filter out elements that don't represent a street or house/poi
				const features: PhotonFeature[] = (data.features ?? [])
					.filter((f: PhotonFeature) => {
						const p = f.properties;
						const isIt = p.countrycode?.toUpperCase() === "IT";
						const hasStreetInfo = p.street || p.type === "street" || p.type === "house" || p.housenumber;
						return isIt && hasStreetInfo;
					})
					.slice(0, 6); // Cap at 6 results for display

				setSuggestions(features);
				setActiveIndex(-1);
				setOpen(true);
			} catch (e) {
				console.warn("[address-autocomplete] fetch failed", e);
			} finally {
				setLoading(false);
			}
		}, 350);
	};

	const pick = (f: PhotonFeature) => {
		const p = f.properties;
		const street = p.street ?? p.name ?? "";
		const address = p.housenumber ? `${street} ${p.housenumber}` : street;
		onChange(address);
		onSelect({
			address,
			city: p.city ?? "",
			zip: p.postcode ?? "",
			region: p.state ?? "",
			lat: f.geometry.coordinates[1],
			lng: f.geometry.coordinates[0],
		});
		setSuggestions([]);
		setActiveIndex(-1);
		setOpen(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!open) {
			if (e.key === "ArrowDown" && suggestions.length > 0) {
				setOpen(true);
			}
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((prev) =>
				prev < suggestions.length - 1 ? prev + 1 : 0
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((prev) =>
				prev > 0 ? prev - 1 : suggestions.length - 1
			);
		} else if (e.key === "Enter") {
			if (activeIndex >= 0 && activeIndex < suggestions.length) {
				e.preventDefault();
				pick(suggestions[activeIndex]);
			}
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	};

	return (
		<div ref={wrapRef} className="relative w-full">
			<div className="relative flex items-center">
				<MapPin size={16} className="absolute left-3 text-ink-faint pointer-events-none" />
				<input
					value={value}
					onChange={(e) => {
						onChange(e.target.value);
						search(e.target.value);
					}}
					onFocus={() => {
						if (suggestions.length > 0) setOpen(true);
						else if (value.length >= 3) search(value);
					}}
					onKeyDown={handleKeyDown}
					placeholder={t("school.claimForm.addressPlaceholder")}
					autoComplete="off"
					className="border rounded-lg pl-9 pr-9 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition w-full"
				/>
				{loading && (
					<Loader2 size={16} className="absolute right-3 animate-spin text-brand" />
				)}
			</div>
			{open && (
				<div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-ink/10 rounded-lg shadow-lg overflow-hidden text-sm">
					{suggestions.length > 0 ? (
						<ul className="divide-y divide-ink/5 max-h-60 overflow-y-auto">
							{suggestions.map((f, i) => (
								<li
									key={i}
									onMouseDown={() => pick(f)}
									onMouseEnter={() => setActiveIndex(i)}
									className={cn(
										"px-3 py-2 cursor-pointer transition-colors flex flex-col gap-0.5 text-left",
										activeIndex === i
											? "bg-brand/5 text-brand"
											: "text-ink hover:bg-surface-muted"
									)}
								>
									<span className="font-semibold text-ink leading-snug">
										{getStreetAndNumber(f)}
									</span>
									<span className="text-xs text-ink-muted">
										{getDetailsLabel(f)}
									</span>
								</li>
							))}
						</ul>
					) : (
						!loading && (
							<div className="px-4 py-3 text-ink-muted text-center italic">
								{t("school.claimForm.noAddressResults")}
							</div>
						)
					)}
				</div>
			)}
		</div>
	);
}
