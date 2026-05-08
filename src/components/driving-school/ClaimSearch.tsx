import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface SchoolMatch {
  _placeId: string;
  name: string;
  city: string;
  website: string | null;
}

interface ClaimSearchProps {
  onSelect: (school: SchoolMatch) => void;
}

export function ClaimSearch({ onSelect }: ClaimSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<SchoolMatch[]>([]);
  const [results, setResults] = useState<SchoolMatch[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/data/autoscuole.geojson")
      .then((r) => r.json())
      .then((data: { features: { properties: { _placeId?: string; name?: string; city?: string; website?: string | null } }[] }) => {
        setAll(
          data.features.map((f) => ({
            _placeId: f.properties._placeId ?? "",
            name: f.properties.name ?? "",
            city: f.properties.city ?? "",
            website: f.properties.website ?? null,
          }))
        );
      });
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const lower = query.toLowerCase();
    setResults(
      all
        .filter((s) => s.name.toLowerCase().includes(lower) || s.city.toLowerCase().includes(lower))
        .slice(0, 8)
    );
  }, [query, all]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder={t("school.search.placeholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-3 py-2 text-sm"
      />
      {results.length > 0 && (
        <ul className="border rounded divide-y max-h-64 overflow-y-auto">
          {results.map((s) => (
            <li
              key={s._placeId || s.name}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="px-3 py-2 cursor-pointer hover:bg-bg-raised text-sm"
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-ink-muted text-xs">{s.city}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
