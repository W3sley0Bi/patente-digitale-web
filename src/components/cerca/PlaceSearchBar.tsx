import { Loader2, Locate, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type PlaceSuggestion,
	reverseGeocode,
	searchPlaces,
} from "@/lib/mapboxGeocode";
import { cn } from "@/lib/utils";

interface PlaceSearchBarProps {
	value: string;
	onChange: (value: string) => void;
	onPlaceSelect: (place: PlaceSuggestion) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

export function PlaceSearchBar({
	value,
	onChange,
	onPlaceSelect,
}: PlaceSearchBarProps) {
	const { t } = useTranslation();
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const [locating, setLocating] = useState(false);
	const [locError, setLocError] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleInputChange(v: string) {
		onChange(v);
		setIsOpen(true);

		if (debounceRef.current) clearTimeout(debounceRef.current);
		abortRef.current?.abort();

		if (!v.trim()) {
			setSuggestions([]);
			return;
		}

		debounceRef.current = setTimeout(() => {
			const controller = new AbortController();
			abortRef.current = controller;
			setSearching(true);
			searchPlaces(v, controller.signal)
				.then(setSuggestions)
				.catch(() => {
					// Aborted or network hiccup — leave prior suggestions in place.
				})
				.finally(() => setSearching(false));
		}, SEARCH_DEBOUNCE_MS);
	}

	function handleSelect(place: PlaceSuggestion) {
		setSuggestions([]);
		setIsOpen(false);
		onPlaceSelect(place);
	}

	function handleLocate() {
		if (!navigator.geolocation) return;
		setLocating(true);
		setLocError(false);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const { latitude: lat, longitude: lng } = pos.coords;
				try {
					const label = await reverseGeocode(lat, lng);
					handleSelect({ id: "geolocation", label: label || value, lat, lng });
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
		<div className="relative w-full" ref={containerRef}>
			<div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
				{searching ? (
					<Loader2 size={14} className="animate-spin" />
				) : (
					<Search size={14} />
				)}
			</div>

			<input
				type="text"
				value={value}
				onFocus={() => setIsOpen(true)}
				onChange={(e) => handleInputChange(e.target.value)}
				placeholder={t("cerca.searchPlaceholder")}
				className="w-full rounded-lg border border-line bg-bg-raised py-1.5 pl-7 pr-14 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring] transition-colors"
				aria-label={t("cerca.searchPlaceholder")}
				autoComplete="off"
				autoCorrect="off"
				spellCheck={false}
			/>

			<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-ink-faint">
				{value && (
					<button
						type="button"
						onClick={() => {
							onChange("");
							setSuggestions([]);
						}}
						className="p-1 hover:text-ink transition-colors"
						aria-label="Clear search"
					>
						<X size={13} />
					</button>
				)}
				<button
					type="button"
					onClick={handleLocate}
					disabled={locating}
					title={
						locError
							? t("cerca.filters.locationError")
							: t("cerca.filters.locationBtn")
					}
					className="p-1 hover:text-brand disabled:opacity-50 transition-colors"
				>
					{locating ? (
						<Loader2 size={14} className="animate-spin text-brand" />
					) : (
						<Locate
							size={14}
							className={locError ? "text-accent" : undefined}
						/>
					)}
				</button>
			</div>

			{isOpen && suggestions.length > 0 && (
				<div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100">
					<div className="max-h-64 overflow-y-auto py-1">
						{suggestions.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => handleSelect(s)}
								className={cn(
									"flex w-full items-center px-3 py-2 text-left font-sans text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors",
								)}
							>
								{s.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
