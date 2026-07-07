import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { NormalizedSchool } from "@/lib/geojson";
import { haversineKm } from "@/lib/geo";
import { loadAllSchools } from "@/lib/loadSchools";

const DEFAULT_RADIUS_KM = 30;

export interface PlaceSelection {
	label: string;
	lat: number;
	lng: number;
}

interface UseCercaOptions {
	/** Student-facing search: only verified/partner schools can be enrolled in, so hide the rest. */
	forceVerifiedOnly?: boolean;
}

interface UseCercaReturn {
	query: string;
	region: string;
	license: string;
	verifiedOnly: boolean;
	coords: { lat: number; lng: number } | null;
	results: NormalizedSchool[];
	selected: NormalizedSchool | null;
	/**
	 * The ?placeId= captured from the URL on mount (an invite link / QR deep
	 * link). Cleared as soon as the user makes a manual selection, so consumers
	 * (e.g. EnrollButton auto-open) can distinguish the initial deep link from
	 * placeId values later written to the URL by selection sync.
	 */
	deepLinkPlaceId: string | null;
	loading: boolean;
	error: string | null;
	setQuery: (v: string) => void;
	setPlace: (place: PlaceSelection) => void;
	setRegion: (v: string) => void;
	setLicense: (v: string) => void;
	setVerifiedOnly: (v: boolean) => void;
	setSelected: (school: NormalizedSchool | null) => void;
	clearFilters: () => void;
}

export function useCerca(options: UseCercaOptions = {}): UseCercaReturn {
	const { forceVerifiedOnly = false } = options;
	const [searchParams, setSearchParams] = useSearchParams();

	const initialLat = searchParams.get("lat");
	const initialLng = searchParams.get("lng");

	// Primary state for instant feedback
	const [filters, setFilters] = useState({
		query: searchParams.get("q") ?? "",
		region: searchParams.get("region") ?? "",
		license: searchParams.get("license") ?? "",
		verifiedOnly: forceVerifiedOnly || searchParams.get("verified") === "1",
		coords:
			initialLat && initialLng
				? { lat: Number(initialLat), lng: Number(initialLng) }
				: null,
	});

	const { query, region, license, verifiedOnly, coords } = filters;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadTick, setLoadTick] = useState(0);
	const [selected, setSelectedState] = useState<NormalizedSchool | null>(null);

	const allSchoolsRef = useRef<NormalizedSchool[]>([]);

	// Captured once on mount — a one-time initial-selection signal, not a
	// persistent filter. Cleared on manual selection so it can only ever drive
	// the initial deep-link flow (auto-select + auto-open enroll dialog).
	const [deepLinkPlaceId, setDeepLinkPlaceId] = useState<string | null>(() =>
		searchParams.get("placeId"),
	);
	// Latches once the auto-select effect has run, so it never fires more than once.
	const autoSelectAttemptedRef = useRef(false);

	useEffect(() => {
		loadAllSchools()
			.then((schools) => {
				allSchoolsRef.current = schools;
				setLoading(false);
				setLoadTick((t) => t + 1);
			})
			.catch((err) => {
				setLoading(false);
				setError(err instanceof Error ? err.message : "Errore nel caricamento");
			});
	}, []);

	// Auto-select the school referenced by ?placeId= once results have loaded,
	// unless the user has already made an explicit selection.
	useEffect(() => {
		if (loading) return;
		if (autoSelectAttemptedRef.current) return;
		if (!deepLinkPlaceId) return;
		autoSelectAttemptedRef.current = true;
		if (selected) return; // user already picked something before load finished

		const match = allSchoolsRef.current.find(
			(s) => s._placeId === deepLinkPlaceId,
		);
		if (match) {
			setSelectedState(match);
		} else {
			// Nothing to auto-select — the deep link is spent.
			setDeepLinkPlaceId(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, selected, deepLinkPlaceId]);

	// Sync state TO URL — debounced for text, immediate for toggles
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchParams(
				(p) => {
					const n = new URLSearchParams(p);
					filters.query ? n.set("q", filters.query) : n.delete("q");
					filters.region ? n.set("region", filters.region) : n.delete("region");
					filters.license
						? n.set("license", filters.license)
						: n.delete("license");
					filters.verifiedOnly ? n.set("verified", "1") : n.delete("verified");
					if (filters.coords) {
						n.set("lat", filters.coords.lat.toFixed(5));
						n.set("lng", filters.coords.lng.toFixed(5));
					} else {
						n.delete("lat");
						n.delete("lng");
					}
					// Keep the selected school shareable/restorable via the URL.
					// While the initial deep link hasn't been consumed yet (data
					// still loading), leave its placeId in place instead of
					// wiping it before auto-select had a chance to run.
					const urlPlaceId = selected ? selected._placeId : deepLinkPlaceId;
					urlPlaceId ? n.set("placeId", urlPlaceId) : n.delete("placeId");
					return n;
				},
				{ replace: true },
			);
		}, 300); // Small debounce to avoid thrashing URL bar

		return () => clearTimeout(timer);
	}, [filters, selected, deepLinkPlaceId, setSearchParams]);

	// Filtered results — used for both the list and the map
	const results = useMemo(() => {
		const all = allSchoolsRef.current;
		if (all.length === 0) return [];

		let schools = all;

		if (region) {
			schools = schools.filter((s) => s.region === region);
		}

		if (coords) {
			// A pinned place (from geocode suggestion or "locate me") — radius
			// search by real distance instead of exact-string city matching.
			schools = schools
				.map((s) => ({ s, distanceKm: haversineKm([coords.lat, coords.lng], s.latlng) }))
				.filter(({ distanceKm }) => distanceKm <= DEFAULT_RADIUS_KM)
				.sort((a, b) => a.distanceKm - b.distanceKm)
				.map(({ s }) => s);
		} else if (query.trim()) {
			const lower = query.toLowerCase();
			schools = schools.filter(
				(s) =>
					s.name.toLowerCase().includes(lower) ||
					s.city.toLowerCase().includes(lower),
			);
		}

		if (verifiedOnly) {
			schools = schools.filter((s) => s.partner === true);
		}

		// Distance search already sorts by proximity; otherwise surface
		// verified/enrollment-enabled schools first.
		if (coords) return schools;
		return [...schools].sort((a, b) => {
			const aScore = (b.enrollment_enabled ? 2 : 0) + (b.partner ? 1 : 0);
			const bScore = (a.enrollment_enabled ? 2 : 0) + (a.partner ? 1 : 0);
			return aScore - bScore;
		});
	}, [query, region, coords, verifiedOnly, loadTick]);

	const setQuery = useCallback((v: string) => {
		// Typing invalidates a previously pinned place — fall back to free-text
		// name/city matching until the user picks a new suggestion.
		setFilters((f) => ({ ...f, query: v, coords: null }));
	}, []);

	const setPlace = useCallback((place: PlaceSelection) => {
		setFilters((f) => ({
			...f,
			query: place.label,
			coords: { lat: place.lat, lng: place.lng },
		}));
	}, []);

	const setRegion = useCallback((v: string) => {
		setFilters((f) => ({ ...f, region: v }));
	}, []);

	const setLicense = useCallback((v: string) => {
		setFilters((f) => ({ ...f, license: v }));
	}, []);

	const setSelected = useCallback((school: NormalizedSchool | null) => {
		// Any manual (de)selection consumes the deep link: from here on the
		// placeId in the URL only mirrors the selection, and must never
		// re-trigger deep-link behavior like the enroll dialog auto-open.
		setDeepLinkPlaceId(null);
		setSelectedState(school);
	}, []);

	const setVerifiedOnly = useCallback((v: boolean) => {
		setFilters((f) => ({ ...f, verifiedOnly: v }));
	}, []);

	const clearFilters = useCallback(() => {
		setFilters({
			query: "",
			region: "",
			license: "",
			verifiedOnly: forceVerifiedOnly,
			coords: null,
		});
	}, [forceVerifiedOnly]);

	return {
		query,
		region,
		license,
		verifiedOnly,
		coords,
		results,
		selected,
		deepLinkPlaceId,
		loading,
		error,
		setQuery,
		setPlace,
		setRegion,
		setLicense,
		setVerifiedOnly,
		setSelected,
		clearFilters,
	};
}
