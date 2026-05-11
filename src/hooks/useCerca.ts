import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { getRegionForCoords } from "@/lib/italyGeo";
import { type NormalizedSchool, type SchoolsGeoJSON, normalizeSchool } from "@/lib/geojson";
import { mergeDelta } from "@/lib/mergeDelta";
import { supabase } from "@/lib/supabase";


interface UseCercaReturn {
  city: string;
  region: string;
  zip: string;
  name: string;
  license: string;
  verifiedOnly: boolean;
  results: NormalizedSchool[];
  cityOptions: string[];
  selected: NormalizedSchool | null;
  loading: boolean;
  error: string | null;
  setCity: (v: string) => void;
  setRegion: (v: string) => void;
  setZip: (v: string) => void;
  setName: (v: string) => void;
  setLicense: (v: string) => void;
  setVerifiedOnly: (v: boolean) => void;
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
    name: searchParams.get("q") ?? "",
    license: searchParams.get("license") ?? "",
    verifiedOnly: searchParams.get("verified") === "1",
  });

  const { city, region, zip, name, license, verifiedOnly } = filters;

  /*
  const selectedLicenses = useMemo(() => 
    license ? license.split(",").filter(Boolean) : []
  , [license]);
  */

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const [selected, setSelectedState] = useState<NormalizedSchool | null>(null);

  const allSchoolsRef = useRef<NormalizedSchool[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/data/autoscuole.geojson")
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
          return res.json() as Promise<SchoolsGeoJSON>;
        }),
      supabase
        .from("driving_schools")
        .select("*")
        .eq("status", "accepted")
        .then(({ data }) => data ?? []),
    ])
      .then(([geojson, delta]) => {
        const normalized = geojson.features.map((f) => {
          const s = normalizeSchool(f);
          return {
            ...s,
            region: s.region || getRegionForCoords(s.latlng[0], s.latlng[1]) || "",
          };
        });
        allSchoolsRef.current = mergeDelta(normalized, delta);
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
          filters.name ? n.set("q", filters.name) : n.delete("q");
          filters.license ? n.set("license", filters.license) : n.delete("license");
          filters.verifiedOnly ? n.set("verified", "1") : n.delete("verified");
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

    if (name) {
      const lower = name.toLowerCase();
      schools = schools.filter((s) => s.name.toLowerCase().includes(lower));
    }

    /*
    if (selectedLicenses.length > 0) {
      schools = schools.filter((s) => 
        s.licenses && selectedLicenses.every(l => s.licenses?.includes(l))
      );
    }
    */

    if (verifiedOnly) {
      schools = schools.filter((s) => s.partner === true);
    }

    return [...schools].sort((a, b) => (b.partner ? 1 : 0) - (a.partner ? 1 : 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, region, zip, name, license, verifiedOnly, loadTick]);

  // City options for autocomplete — filtered by selected region and zip
  const cityOptions = useMemo(() => {
    let source = allSchoolsRef.current;
    if (region) source = source.filter((s) => s.region === region);
    if (zip) source = source.filter((s) => s.zip.startsWith(zip));
    if (name) {
      const lower = name.toLowerCase();
      source = source.filter((s) => s.name.toLowerCase().includes(lower));
    }
    return [...new Set(source.map((s) => s.city).filter(Boolean))].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, zip, name, loadTick]);

  const setCity = useCallback((v: string) => {
    setFilters((f) => ({ ...f, city: v }));
  }, []);

  const setRegion = useCallback((v: string) => {
    setFilters((f) => ({ ...f, region: v, city: "" }));
  }, []);

  const setZip = useCallback((v: string) => {
    setFilters((f) => ({ ...f, zip: v }));
  }, []);

  const setName = useCallback((v: string) => {
    setFilters((f) => ({ ...f, name: v }));
  }, []);

  const setLicense = useCallback((v: string) => {
    setFilters((f) => ({ ...f, license: v }));
  }, []);

  const setSelected = useCallback((school: NormalizedSchool | null) => {
    setSelectedState(school);
  }, []);

  const setVerifiedOnly = useCallback((v: boolean) => {
    setFilters((f) => ({ ...f, verifiedOnly: v }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ city: "", region: "", zip: "", name: "", license: "", verifiedOnly: false });
  }, []);

  return {
    city, region, zip, name, license, verifiedOnly,
    results, cityOptions,
    selected, loading, error,
    setCity, setRegion, setZip, setName, setLicense, setVerifiedOnly, setSelected, clearFilters,
  };
}
