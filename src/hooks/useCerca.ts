import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { getRegionForCoords } from "@/lib/italyGeo";
import { type NormalizedSchool, type SchoolsGeoJSON, normalizeSchool } from "@/lib/geojson";


interface UseCercaReturn {
  city: string;
  region: string;
  zip: string;
  results: NormalizedSchool[];
  cityOptions: string[];
  selected: NormalizedSchool | null;
  loading: boolean;
  error: string | null;
  setCity: (v: string) => void;
  setRegion: (v: string) => void;
  setZip: (v: string) => void;
  setSelected: (school: NormalizedSchool | null) => void;
  clearFilters: () => void;
}

export function useCerca(): UseCercaReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get("city") ?? "";
  const region = searchParams.get("region") ?? "";
  const zip = searchParams.get("zip") ?? "";

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
        allSchoolsRef.current = data.features.map(normalizeSchool);
        setLoading(false);
        setLoadTick((t) => t + 1);
      })
      .catch((err) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      });
  }, []);

  // Filtered results — used for both the list and the map
  const results = useMemo(() => {
    const all = allSchoolsRef.current;
    if (all.length === 0) return [];

    let schools = all;

    if (region) {
      schools = schools.filter((s) => getRegionForCoords(s.latlng[0], s.latlng[1]) === region);
    }

    if (city) {
      const lower = city.toLowerCase();
      schools = schools.filter((s) => s.city.toLowerCase() === lower);
    }

    if (zip) {
      schools = schools.filter((s) => s.zip.startsWith(zip));
    }

    return schools;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, region, zip, loadTick]);

  // City options for autocomplete — filtered by selected region and zip
  const cityOptions = useMemo(() => {
    let source = allSchoolsRef.current;
    if (region) source = source.filter((s) => getRegionForCoords(s.latlng[0], s.latlng[1]) === region);
    if (zip) source = source.filter((s) => s.zip.startsWith(zip));
    return [...new Set(source.map((s) => s.city).filter(Boolean))].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, zip, loadTick]);

  const setCity = useCallback(
    (v: string) => {
      setSearchParams(
        (p) => { const n = new URLSearchParams(p); v ? n.set("city", v) : n.delete("city"); return n; },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setRegion = useCallback(
    (v: string) => {
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          v ? n.set("region", v) : n.delete("region");
          n.delete("city");
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setZip = useCallback(
    (v: string) => {
      setSearchParams(
        (p) => { const n = new URLSearchParams(p); v ? n.set("zip", v) : n.delete("zip"); return n; },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSelected = useCallback((school: NormalizedSchool | null) => {
    setSelectedState(school);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return {
    city, region, zip,
    results, cityOptions,
    selected, loading, error,
    setCity, setRegion, setZip, setSelected, clearFilters,
  };
}
