# /cerca Driving Schools Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/cerca` placeholder with a live driving-schools finder: unified fuzzy search bar + Leaflet map + virtualised results list, backed by a weekly-refreshed OSM GeoJSON dataset.

**Architecture:** Static GeoJSON (`public/data/autoscuole.geojson`) loaded lazily on route mount; Fuse.js filters in-browser across name/city/zip/region/address; `useCerca` hook owns all state; layout is list + map side-by-side on desktop, stacked (map top, list below) on mobile.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, react-leaflet + Leaflet, Fuse.js, @tanstack/react-virtual, vitest + @testing-library/react (new), i18next, pnpm, GitHub Actions

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/geojson.ts` | CREATE | TypeScript types + `normalizeSchool` helper |
| `src/lib/__tests__/geojson.test.ts` | CREATE | Unit tests for `normalizeSchool` |
| `src/hooks/useCerca.ts` | CREATE | Fetch, Fuse search, debounce, selected state |
| `src/hooks/__tests__/useCerca.test.ts` | CREATE | Unit tests for hook logic |
| `src/components/cerca/SearchBar.tsx` | CREATE | Controlled input with debounce + clear |
| `src/components/cerca/SchoolCard.tsx` | CREATE | Single school result card |
| `src/components/cerca/ResultsList.tsx` | CREATE | Virtualised list with @tanstack/react-virtual |
| `src/components/cerca/SchoolMap.tsx` | CREATE | react-leaflet map + CircleMarker pins |
| `src/components/cerca/CercaPage.tsx` | CREATE | Layout: SearchBar + ResultsList + SchoolMap |
| `src/routes/Cerca.tsx` | MODIFY | Replace PlaceholderPage with CercaPage |
| `scripts/fetch-autoscuole.mjs` | CREATE | Overpass query → GeoJSON file |
| `public/data/autoscuole.geojson` | GENERATE | Seeded by running fetch script |
| `.github/workflows/refresh-schools.yml` | CREATE | Weekly CI refresh |
| `vite.config.ts` | MODIFY | Add vitest test config |
| `package.json` | MODIFY | Add new dependencies |
| `src/i18n/locales/it.json` | MODIFY | Add `cerca` namespace |
| `src/i18n/locales/en.json` | MODIFY | Add `cerca` namespace |
| `src/i18n/locales/ar.json` | MODIFY | Add `cerca` namespace |

---

## Task 1: Install dependencies and configure vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install runtime deps**

```bash
cd patente-digitale-web
pnpm add leaflet react-leaflet fuse.js @tanstack/react-virtual
```

Expected: packages added to `dependencies` in package.json.

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D @types/leaflet vitest @testing-library/react @testing-library/user-event jsdom @vitest/coverage-v8
```

- [ ] **Step 3: Add vitest config to vite.config.ts**

Add `/// <reference types="vitest" />` at the top and a `test` key to the config object. Final file:

```ts
/// <reference types="vitest" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: [],
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("framer-motion")) return "vendor-motion";
					if (id.includes("embla-carousel")) return "vendor-carousel";
					if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
					if (id.includes("leaflet") || id.includes("react-leaflet")) return "vendor-map";
					if (id.includes("fuse.js")) return "vendor-search";
					if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("react-router")) return "vendor-react";
				},
			},
		},
	},
});
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` block.

- [ ] **Step 5: Verify install**

```bash
pnpm test
```

Expected: `No test files found` (exits 0 or with "no tests" message — not a failure).

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts pnpm-lock.yaml
git commit -m "chore: add leaflet, react-leaflet, fuse.js, react-virtual, vitest"
```

---

## Task 2: GeoJSON types and normalizeSchool helper

**Files:**
- Create: `src/lib/geojson.ts`
- Create: `src/lib/__tests__/geojson.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/geojson.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSchool } from "@/lib/geojson";
import type { SchoolFeature } from "@/lib/geojson";

const makeFeature = (overrides: Partial<SchoolFeature["properties"]> = {}): SchoolFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [12.5, 41.9] },
  properties: {
    name: "Autoscuola Test",
    city: "Roma",
    zip: "00100",
    region: "Lazio",
    address: "Via Roma 1",
    phone: "+39 06 1234567",
    website: "https://example.com",
    ...overrides,
  },
});

describe("normalizeSchool", () => {
  it("returns all fields when present", () => {
    const school = normalizeSchool(makeFeature());
    expect(school.name).toBe("Autoscuola Test");
    expect(school.city).toBe("Roma");
    expect(school.zip).toBe("00100");
    expect(school.latlng).toEqual([41.9, 12.5]);
  });

  it("falls back to 'Autoscuola' when name is empty", () => {
    const school = normalizeSchool(makeFeature({ name: "" }));
    expect(school.name).toBe("Autoscuola");
  });

  it("swaps coordinates: GeoJSON is [lng, lat], latlng is [lat, lng]", () => {
    const feature = makeFeature();
    feature.geometry.coordinates = [9.19, 45.46]; // Milano [lng, lat]
    const school = normalizeSchool(feature);
    expect(school.latlng).toEqual([45.46, 9.19]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '@/lib/geojson'`

- [ ] **Step 3: Create `src/lib/geojson.ts`**

```ts
export interface SchoolProperties {
  name: string;
  city: string;
  zip: string;
  region: string;
  address: string;
  phone: string;
  website: string;
}

export interface SchoolFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: SchoolProperties;
}

export interface SchoolsGeoJSON {
  type: "FeatureCollection";
  features: SchoolFeature[];
}

export interface NormalizedSchool extends SchoolProperties {
  latlng: [number, number]; // [lat, lng] — Leaflet order
  id: string; // unique key: `${lat},${lng}`
}

export function normalizeSchool(feature: SchoolFeature): NormalizedSchool {
  const [lng, lat] = feature.geometry.coordinates;
  return {
    ...feature.properties,
    name: feature.properties.name || "Autoscuola",
    latlng: [lat, lng],
    id: `${lat},${lng}`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geojson.ts src/lib/__tests__/geojson.test.ts
git commit -m "feat: add SchoolFeature types and normalizeSchool helper"
```

---

## Task 3: Overpass fetch script and seed GeoJSON

**Files:**
- Create: `scripts/fetch-autoscuole.mjs`
- Create: `public/data/autoscuole.geojson` (generated)

- [ ] **Step 1: Create `scripts/fetch-autoscuole.mjs`**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../public/data/autoscuole.geojson");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="IT"][admin_level=2]->.italy;
node["amenity"="driving_school"](area.italy);
out body;
`;

async function run() {
  console.log("Querying Overpass API...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(QUERY)}`,
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);

  const json = await res.json();
  const elements = json.elements ?? [];
  console.log(`Got ${elements.length} elements from Overpass`);

  const features = elements
    .filter((el) => el.lat != null && el.lon != null)
    .map((el) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [el.lon, el.lat] },
      properties: {
        name: el.tags?.name ?? "",
        city: el.tags?.["addr:city"] ?? "",
        zip: el.tags?.["addr:postcode"] ?? "",
        region: el.tags?.["addr:state"] ?? "",
        address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
          .filter(Boolean)
          .join(" "),
        phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? "",
        website: el.tags?.website ?? el.tags?.["contact:website"] ?? "",
      },
    }));

  const geojson = { type: "FeatureCollection", features };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(geojson));
  console.log(`Wrote ${features.length} schools to ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script to seed the data**

```bash
node scripts/fetch-autoscuole.mjs
```

Expected output:
```
Querying Overpass API...
Got XXXX elements from Overpass
Wrote XXXX schools to .../public/data/autoscuole.geojson
```

This may take 30-60 seconds. If Overpass is rate-limiting, wait a minute and retry.

- [ ] **Step 3: Verify the output**

```bash
node -e "const d = JSON.parse(require('fs').readFileSync('public/data/autoscuole.geojson','utf8')); console.log('features:', d.features.length); console.log('sample:', JSON.stringify(d.features[0], null, 2))"
```

Expected: `features:` count > 1000, sample shows a valid Feature with coordinates and properties.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-autoscuole.mjs public/data/autoscuole.geojson
git commit -m "feat: add Overpass fetch script and seed autoscuole.geojson"
```

---

## Task 4: useCerca hook

**Files:**
- Create: `src/hooks/useCerca.ts`
- Create: `src/hooks/__tests__/useCerca.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/useCerca.test.ts`:

```ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCerca } from "@/hooks/useCerca";

const MOCK_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [12.49, 41.89] },
      properties: {
        name: "Autoscuola Roma Centro",
        city: "Roma",
        zip: "00100",
        region: "Lazio",
        address: "Via Nazionale 1",
        phone: "",
        website: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [9.19, 45.46] },
      properties: {
        name: "Autoscuola Milano Nord",
        city: "Milano",
        zip: "20100",
        region: "Lombardia",
        address: "Corso Buenos Aires 5",
        phone: "",
        website: "",
      },
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_GEOJSON,
  } as Response);
});

describe("useCerca", () => {
  it("starts loading, then returns all schools when query is empty", async () => {
    const { result } = renderHook(() => useCerca());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toHaveLength(2);
  });

  it("filters by city name", async () => {
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setQuery("Milano"));
    await waitFor(() =>
      expect(result.current.results.some((s) => s.city === "Milano")).toBe(true)
    );
    expect(result.current.results.every((s) => s.city !== "Roma")).toBe(true);
  });

  it("setSelected updates selected", async () => {
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = result.current.results[0];
    act(() => result.current.setSelected(first));
    expect(result.current.selected?.id).toBe(first.id);
  });

  it("sets error when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '@/hooks/useCerca'`

- [ ] **Step 3: Create `src/hooks/useCerca.ts`**

```ts
import Fuse from "fuse.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { type NormalizedSchool, type SchoolsGeoJSON, normalizeSchool } from "@/lib/geojson";

const FUSE_OPTIONS: Fuse.IFuseOptions<NormalizedSchool> = {
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
    setState((prev) => ({ ...prev, query: q }));
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (!fuse.current) return;
      const results =
        q.trim() === ""
          ? allSchools.current.slice(0, MAX_RESULTS)
          : fuse.current.search(q).map((r) => r.item).slice(0, MAX_RESULTS);
      setState((prev) => ({ ...prev, results }));
    }, 200);
  }, []);

  const setSelected = useCallback((school: NormalizedSchool | null) => {
    setState((prev) => ({ ...prev, selected: school }));
  }, []);

  return { ...state, setQuery, setSelected };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: all tests in `useCerca.test.ts` and `geojson.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCerca.ts src/hooks/__tests__/useCerca.test.ts
git commit -m "feat: add useCerca hook with Fuse.js search and debounce"
```

---

## Task 5: i18n strings

**Files:**
- Modify: `src/i18n/locales/it.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ar.json`

- [ ] **Step 1: Add `cerca` key to `src/i18n/locales/it.json`**

Add the following top-level key to the JSON (alongside the existing `"landing"` key):

```json
"cerca": {
  "title": "Trova la tua autoscuola",
  "searchPlaceholder": "Cerca per città, autoscuola, CAP o regione...",
  "resultsCount": "{{count}} autoscuole trovate",
  "noResults": "Nessuna autoscuola trovata",
  "loading": "Caricamento autoscuole...",
  "error": "Impossibile caricare le autoscuole. Riprova.",
  "card": {
    "callLabel": "Chiama",
    "websiteLabel": "Sito web"
  }
}
```

- [ ] **Step 2: Add `cerca` key to `src/i18n/locales/en.json`**

```json
"cerca": {
  "title": "Find your driving school",
  "searchPlaceholder": "Search by city, school name, postcode or region...",
  "resultsCount": "{{count}} driving schools found",
  "noResults": "No driving schools found",
  "loading": "Loading driving schools...",
  "error": "Could not load driving schools. Please try again.",
  "card": {
    "callLabel": "Call",
    "websiteLabel": "Website"
  }
}
```

- [ ] **Step 3: Add `cerca` key to `src/i18n/locales/ar.json`**

```json
"cerca": {
  "title": "ابحث عن مدرسة قيادتك",
  "searchPlaceholder": "ابحث بالمدينة أو اسم المدرسة أو الرمز البريدي أو المنطقة...",
  "resultsCount": "{{count}} مدرسة قيادة",
  "noResults": "لا توجد مدارس قيادة",
  "loading": "جارٍ التحميل...",
  "error": "تعذّر تحميل المدارس. حاول مجددًا.",
  "card": {
    "callLabel": "اتصل",
    "websiteLabel": "الموقع"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/it.json src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat: add cerca i18n strings (IT/EN/AR)"
```

---

## Task 6: SearchBar component

**Files:**
- Create: `src/components/cerca/SearchBar.tsx`

- [ ] **Step 1: Create `src/components/cerca/SearchBar.tsx`**

```tsx
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("cerca.searchPlaceholder")}
        className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-10 text-base text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-brand"
        aria-label={t("cerca.searchPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cerca/SearchBar.tsx
git commit -m "feat: add SearchBar component"
```

---

## Task 7: SchoolCard component

**Files:**
- Create: `src/components/cerca/SchoolCard.tsx`

- [ ] **Step 1: Create `src/components/cerca/SchoolCard.tsx`**

```tsx
import { Phone, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";

interface SchoolCardProps {
  school: NormalizedSchool;
  isSelected: boolean;
  onClick: () => void;
}

export function SchoolCard({ school, isSelected, onClick }: SchoolCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border p-4 text-left transition-colors",
        isSelected
          ? "border-brand bg-brand/5 ring-2 ring-brand"
          : "border-border bg-surface hover:bg-surface/80",
      ].join(" ")}
    >
      <p className="font-semibold text-fg line-clamp-1">{school.name}</p>
      <p className="mt-0.5 text-sm text-fg/60">
        {[school.address, school.city, school.zip].filter(Boolean).join(", ")}
      </p>
      {school.region && (
        <p className="mt-0.5 text-xs text-fg/40">{school.region}</p>
      )}
      <div className="mt-2 flex gap-3">
        {school.phone && (
          <a
            href={`tel:${school.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Phone size={12} />
            {t("cerca.card.callLabel")}
          </a>
        )}
        {school.website && (
          <a
            href={school.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Globe size={12} />
            {t("cerca.card.websiteLabel")}
          </a>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cerca/SchoolCard.tsx
git commit -m "feat: add SchoolCard component"
```

---

## Task 8: ResultsList component

**Files:**
- Create: `src/components/cerca/ResultsList.tsx`

- [ ] **Step 1: Create `src/components/cerca/ResultsList.tsx`**

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";
import { SchoolCard } from "./SchoolCard";

interface ResultsListProps {
  schools: NormalizedSchool[];
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
  loading: boolean;
  error: string | null;
}

export function ResultsList({
  schools,
  selected,
  onSelect,
  loading,
  error,
}: ResultsListProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: schools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg/50">
        {t("cerca.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        {t("cerca.error")}
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg/50">
        {t("cerca.noResults")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <p className="px-1 pb-2 text-xs text-fg/40">
        {t("cerca.resultsCount", { count: schools.length })}
      </p>
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const school = schools[virtualItem.index];
            return (
              <div
                key={school.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                  padding: "4px 0",
                }}
              >
                <SchoolCard
                  school={school}
                  isSelected={selected?.id === school.id}
                  onClick={() => onSelect(school)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cerca/ResultsList.tsx
git commit -m "feat: add virtualised ResultsList component"
```

---

## Task 9: SchoolMap component

**Files:**
- Create: `src/components/cerca/SchoolMap.tsx`

> Note: Leaflet CSS must be imported here. `CircleMarker` from react-leaflet is used instead of custom icons — avoids Vite marker-icon bundling issues.

- [ ] **Step 1: Create `src/components/cerca/SchoolMap.tsx`**

```tsx
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { NormalizedSchool } from "@/lib/geojson";

// Italy center fallback
const ITALY_CENTER: [number, number] = [41.87, 12.57];
const ITALY_ZOOM = 6;

interface FitBoundsProps {
  schools: NormalizedSchool[];
}

function FitBounds({ schools }: FitBoundsProps) {
  const map = useMap();
  const prevCount = useRef(schools.length);

  useEffect(() => {
    if (schools.length === 0) return;
    if (schools.length === prevCount.current && schools.length > 50) return;
    prevCount.current = schools.length;

    const bounds: LatLngBoundsExpression = schools.map((s) => s.latlng);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [schools, map]);

  return null;
}

interface PanToSelectedProps {
  selected: NormalizedSchool | null;
}

function PanToSelected({ selected }: PanToSelectedProps) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!selected || selected.id === prevId.current) return;
    prevId.current = selected.id;
    map.setView(selected.latlng, Math.max(map.getZoom(), 14), { animate: true });
  }, [selected, map]);

  return null;
}

interface SchoolMapProps {
  schools: NormalizedSchool[];
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
}

export function SchoolMap({ schools, selected, onSelect }: SchoolMapProps) {
  return (
    <MapContainer
      center={ITALY_CENTER}
      zoom={ITALY_ZOOM}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds schools={schools} />
      <PanToSelected selected={selected} />
      {schools.map((school) => (
        <CircleMarker
          key={school.id}
          center={school.latlng}
          radius={selected?.id === school.id ? 9 : 6}
          pathOptions={{
            color: selected?.id === school.id ? "#f97316" : "#2563eb",
            fillColor: selected?.id === school.id ? "#f97316" : "#3b82f6",
            fillOpacity: 0.85,
            weight: 2,
          }}
          eventHandlers={{ click: () => onSelect(school) }}
        >
          <Popup>
            <strong>{school.name}</strong>
            <br />
            {[school.address, school.city].filter(Boolean).join(", ")}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cerca/SchoolMap.tsx
git commit -m "feat: add SchoolMap component with react-leaflet CircleMarkers"
```

---

## Task 10: CercaPage layout + wire route

**Files:**
- Create: `src/components/cerca/CercaPage.tsx`
- Modify: `src/routes/Cerca.tsx`

- [ ] **Step 1: Create `src/components/cerca/CercaPage.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { useCerca } from "@/hooks/useCerca";
import { ResultsList } from "./ResultsList";
import { SchoolMap } from "./SchoolMap";
import { SearchBar } from "./SearchBar";

export function CercaPage() {
  const { t } = useTranslation();
  const { query, results, selected, loading, error, setQuery, setSelected } = useCerca();

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 pb-8 pt-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-fg">{t("cerca.title")}</h1>
      <div className="mb-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {/* Desktop: side by side */}
      <div className="hidden flex-1 gap-4 md:flex" style={{ minHeight: "calc(100vh - 180px)" }}>
        <div className="flex w-80 shrink-0 flex-col overflow-hidden">
          <ResultsList
            schools={results}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
            error={error}
          />
        </div>
        <div className="flex-1 overflow-hidden rounded-xl">
          {!loading && (
            <SchoolMap
              schools={results}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="h-[50vh] overflow-hidden rounded-xl">
          {!loading && (
            <SchoolMap
              schools={results}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
        <div className="flex flex-col" style={{ minHeight: "50vh" }}>
          <ResultsList
            schools={results}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/routes/Cerca.tsx`**

Replace the entire file content:

```tsx
import { CercaPage } from "@/components/cerca/CercaPage";

export default function Cerca() {
  return <CercaPage />;
}
```

- [ ] **Step 3: Run the dev server and verify the page**

```bash
pnpm dev
```

Open `http://localhost:5173/cerca`. Verify:
- Map loads showing Italy with blue pins
- Typing in the search bar filters the list and map pins
- Clicking a pin highlights it orange and scrolls the list to that card
- Clicking a list card highlights it and pans the map to it
- On a narrow browser window (< 768px), map is on top, list below

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/cerca/CercaPage.tsx src/routes/Cerca.tsx
git commit -m "feat: add CercaPage layout and wire /cerca route"
```

---

## Task 11: GitHub Actions weekly refresh workflow

**Files:**
- Create: `.github/workflows/refresh-schools.yml`

- [ ] **Step 1: Create `.github/workflows/refresh-schools.yml`**

```yaml
name: Refresh autoscuole GeoJSON

on:
  schedule:
    - cron: "0 3 * * 1"   # every Monday at 03:00 UTC
  workflow_dispatch:        # allow manual trigger

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Fetch autoscuole from Overpass
        run: node scripts/fetch-autoscuole.mjs

      - name: Commit updated GeoJSON if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git diff --quiet public/data/autoscuole.geojson || (
            git add public/data/autoscuole.geojson &&
            git commit -m "chore: refresh autoscuole.geojson [skip ci]" &&
            git push
          )
```

> `[skip ci]` in the commit message prevents an infinite deploy loop — Vercel picks up only pushes that don't include that tag. If your Vercel project is configured to deploy on every push regardless, change to a branch filter in the Vercel dashboard instead.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/refresh-schools.yml
git commit -m "ci: add weekly autoscuole GeoJSON refresh workflow"
```

- [ ] **Step 3: Verify workflow in GitHub UI**

Push to remote, navigate to the repo's **Actions** tab, and manually trigger the workflow via `workflow_dispatch`. Confirm it runs without error and either commits a change or exits cleanly with "nothing to commit".

```bash
git push
```

---

## Task 12: Production build verification

- [ ] **Step 1: Run the full build**

```bash
pnpm build
```

Expected: build completes without TypeScript or Vite errors. Check that `vendor-map` and `vendor-search` chunks appear in the output.

- [ ] **Step 2: Preview the production build**

```bash
pnpm preview
```

Open `http://localhost:4173/cerca` and repeat the manual checks from Task 10 Step 3.

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix: production build adjustments"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Unified search (name, city, zip, region) | Task 4 — Fuse keys |
| List + map side by side (desktop) | Task 10 — desktop flex-row layout |
| Stacked map/list (mobile) | Task 10 — mobile flex-col layout |
| Weekly CI refresh via GitHub Actions | Task 11 |
| First-run data seed | Task 3 |
| Static GeoJSON in `public/data/` | Task 3 |
| react-leaflet + OSM tiles | Task 9 |
| `L.divIcon` equivalent (no image deps) | Task 9 — CircleMarker |
| Selected state drives map pan + list highlight | Tasks 8, 9, 10 |
| Virtualised list | Task 8 |
| i18n IT/EN/AR | Task 5 |
