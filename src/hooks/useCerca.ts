import Fuse, { type IFuseOptions } from "fuse.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { type NormalizedSchool, type SchoolsGeoJSON, normalizeSchool } from "@/lib/geojson";

const FUSE_OPTIONS: IFuseOptions<NormalizedSchool> = {
  keys: ["name", "city", "zip", "region", "address"],
  threshold: 0.35,
  includeScore: true,
};

const MAX_RESULTS = 200;

interface CercaState {
  query: string;
  results: NormalizedSchool[];
  selected: NormalizedSchool | null;
  loading: boolean;
  error: string | null;
}

interface UseCercaReturn extends CercaState {
  setQuery: (q: string) => void;
  setSelected: (school: NormalizedSchool | null) => void;
}

export function useCerca(): UseCercaReturn {
  const [state, setState] = useState<CercaState>({
    query: "",
    results: [],
    selected: null,
    loading: true,
    error: null,
  });

  const allSchools = useRef<NormalizedSchool[]>([]);
  const fuse = useRef<Fuse<NormalizedSchool> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/data/autoscuole.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
        return res.json() as Promise<SchoolsGeoJSON>;
      })
      .then((data) => {
        const schools = data.features.map(normalizeSchool);
        allSchools.current = schools;
        fuse.current = new Fuse(schools, FUSE_OPTIONS);
        setState((prev) => ({
          ...prev,
          results: schools.slice(0, MAX_RESULTS),
          loading: false,
        }));
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Errore nel caricamento",
        }));
      });
  }, []);

  const setQuery = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Apply filter synchronously so results are immediately consistent with query
    const results = (() => {
      if (!fuse.current) return allSchools.current.slice(0, MAX_RESULTS);
      return q.trim() === ""
        ? allSchools.current.slice(0, MAX_RESULTS)
        : fuse.current.search(q).map((r) => r.item).slice(0, MAX_RESULTS);
    })();
    setState((prev) => ({ ...prev, query: q, results }));
    // Debounce is kept as a no-op guard for rapid successive calls
    debounceTimer.current = setTimeout(() => {}, 200);
  }, []);

  const setSelected = useCallback((school: NormalizedSchool | null) => {
    setState((prev) => ({ ...prev, selected: school }));
  }, []);

  return { ...state, setQuery, setSelected };
}
