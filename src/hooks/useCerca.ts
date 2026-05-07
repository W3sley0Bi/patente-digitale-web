import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { getRegionForCoords } from "@/lib/italyGeo";
import { type NormalizedSchool, type SchoolsGeoJSON, normalizeSchool } from "@/lib/geojson";


interface UseCercaReturn {
  city: string;
  region: string;
  zip: string;
  partnerOnly: boolean;
  results: NormalizedSchool[];
  cityOptions: string[];
  selected: NormalizedSchool | null;
  loading: boolean;
  error: string | null;
  setCity: (v: string) => void;
  setRegion: (v: string) => void;
  setZip: (v: string) => void;
  setPartnerOnly: (v: boolean) => void;
  setSelected: (school: NormalizedSchool | null) => void;
  clearFilters: () => void;
}

export function useCerca(): UseCercaReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary state for instant feedback
  const [filters, setFilters] = useState({
    city: searchParams.get("city") ?? "",
    region: searchParams.get("region") ?? "",
    zip: searchParams.get("zip") ?? "",
    partnerOnly: searchParams.get("partner") === "1",
  });

  const { city, region, zip, partnerOnly } = filters;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const [selected, setSelectedState] = useState<NormalizedSchool | null>(null);

  const allSchoolsRef = useRef<NormalizedSchool[]>([]);

  useEffect(() => {
    fetch("/data/autoscuole.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
        return res.json() as Promise<SchoolsGeoJSON>;
      })
      .then((data) => {
        // Pre-calculate region for ALL schools once on load
        allSchoolsRef.current = data.features.map((f) => {
          const s = normalizeSchool(f);
          return {
            ...s,
            // If the data doesn't have a reliable region, calculate it
            region: s.region || getRegionForCoords(s.latlng[0], s.latlng[1]) || "",
          };
        });
        setLoading(false);
        setLoadTick((t) => t + 1);
      })
      .catch((err) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      });
  }, []);

  // Sync state TO URL — debounced for text, immediate for toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          filters.city ? n.set("city", filters.city) : n.delete("city");
          filters.region ? n.set("region", filters.region) : n.delete("region");
          filters.zip ? n.set("zip", filters.zip) : n.delete("zip");
          filters.partnerOnly ? n.set("partner", "1") : n.delete("partner");
          return n;
        },
        { replace: true },
      );
    }, 300); // Small debounce to avoid thrashing URL bar

    return () => clearTimeout(timer);
  }, [filters, setSearchParams]);

  // Filtered results — used for both the list and the map
  const results = useMemo(() => {
    const all = allSchoolsRef.current;
    if (all.length === 0) return [];

    let schools = all;

    if (region) {
      schools = schools.filter((s) => s.region === region);
    }

    if (city) {
      const lower = city.toLowerCase();
      schools = schools.filter((s) => s.city.toLowerCase() === lower);
    }

    if (zip) {
      schools = schools.filter((s) => s.zip.startsWith(zip));
    }

    if (partnerOnly) {
      schools = schools.filter((s) => s.partner === true);
    }

    return [...schools].sort((a, b) => (b.partner ? 1 : 0) - (a.partner ? 1 : 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, region, zip, partnerOnly, loadTick]);

  // City options for autocomplete — filtered by selected region and zip
  const cityOptions = useMemo(() => {
    let source = allSchoolsRef.current;
    if (region) source = source.filter((s) => s.region === region);
    if (zip) source = source.filter((s) => s.zip.startsWith(zip));
    return [...new Set(source.map((s) => s.city).filter(Boolean))].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, zip, loadTick]);

  const setCity = useCallback((v: string) => {
    setFilters((f) => ({ ...f, city: v }));
  }, []);

  const setRegion = useCallback((v: string) => {
    setFilters((f) => ({ ...f, region: v, city: "" }));
  }, []);

  const setZip = useCallback((v: string) => {
    setFilters((f) => ({ ...f, zip: v }));
  }, []);

  const setSelected = useCallback((school: NormalizedSchool | null) => {
    setSelectedState(school);
  }, []);

  const setPartnerOnly = useCallback((v: boolean) => {
    setFilters((f) => ({ ...f, partnerOnly: v }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ city: "", region: "", zip: "", partnerOnly: false });
  }, []);

  return {
    city, region, zip, partnerOnly,
    results, cityOptions,
    selected, loading, error,
    setCity, setRegion, setZip, setPartnerOnly, setSelected, clearFilters,
  };
}
