# /cerca — Driving Schools Map & Search

**Date:** 2026-05-06  
**Route:** `/cerca`  
**Status:** Approved, ready for implementation

---

## Goal

Replace the placeholder `/cerca` page with a functional driving schools finder: unified search bar + interactive map + results list backed by real OSM data.

---

## Data Layer

**File:** `public/data/autoscuole.geojson`

GeoJSON FeatureCollection. Each feature:

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lng, lat] },
  "properties": {
    "name": "Autoscuola Roma Centro",
    "city": "Roma",
    "zip": "00100",
    "region": "Lazio",
    "address": "Via Nazionale 1",
    "phone": "...",
    "website": "..."
  }
}
```

Source: OpenStreetMap via Overpass API (`amenity=driving_school`, Italy bounding box).

Loaded in the browser with a single `fetch('/data/autoscuole.geojson')` when the `/cerca` route mounts. Vite serves it as a static asset.

---

## Search & Filtering

**Library:** Fuse.js  
**Fields indexed:** `name`, `city`, `zip`, `region`, `address`

Flow:
1. User types → debounced 200ms
2. Empty query → show up to 200 features (default view)
3. Non-empty → Fuse returns ranked matches → list + map update together

State in `useCerca` hook:

```ts
{
  query: string
  results: Feature[]
  selected: Feature | null
  loading: boolean
  error: string | null
}
```

`selected` is set by clicking either a map pin or a list card. It drives:
- Map pan + popup open
- List card highlight + scroll into view

No URL sync. List virtualised with `@tanstack/react-virtual` when results exceed ~100 items.

---

## Layout & Components

```
CercaPage
├── SearchBar               ← controlled input, debounced, lucide X to clear
├── [desktop] flex-row
│   ├── ResultsList         ← scrollable cards, highlights selected
│   └── SchoolMap           ← Leaflet + OSM tiles
└── [mobile] flex-col
    ├── SchoolMap           ← 50vh fixed height
    └── ResultsList         ← scrolls below
```

### SchoolMap
- `react-leaflet` wrapping Leaflet.js + OpenStreetMap tiles (free, no API key)
- Markers: `L.divIcon` custom styled dot (no external image dep)
- On `results` change: map auto-fits bounds to visible markers
- On `selected` change (from list): pan to marker, open popup (name + address)
- On pin click: sets `selected`

### ResultsList
- Cards: name, city, address, phone + website if present
- Active card (`selected`) gets highlight ring
- Clicking card: sets `selected`, on mobile scrolls map into view

### SearchBar
- Controlled input with 200ms debounce
- `lucide-react` X icon to clear
- No new UI primitives — uses existing shadcn/lucide setup

---

## CI Refresh Pipeline

**Script:** `scripts/fetch-autoscuole.mjs`  
Uses native `fetch` (no extra deps):
1. POST Overpass QL query for `amenity=driving_school` in Italy
2. Parse → build GeoJSON FeatureCollection
3. Write to `public/data/autoscuole.geojson`

**Workflow:** `.github/workflows/refresh-schools.yml`
- Triggers: `schedule` (every Monday 03:00 UTC) + `workflow_dispatch`
- Steps: checkout → run script → commit + push if file changed
- Push to `main` triggers Vercel auto-deploy

**First run:** script run locally to seed the file before first deploy.

---

## Dependencies to Add

| Package | Purpose |
|---|---|
| `leaflet` | Map rendering |
| `react-leaflet` | React wrapper |
| `@types/leaflet` | TS types |
| `fuse.js` | Fuzzy search |
| `@tanstack/react-virtual` | List virtualisation |

---

## Out of Scope (Future)

- "Add your school" self-registration form (Supabase backend)
- URL-synced search state
- Filters (by region, services offered, etc.)
