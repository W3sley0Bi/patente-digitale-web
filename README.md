# patente-digitale-web

Landing page and web app for [patentedigitale.it](https://patentedigitale.it) — the digital driving licence quiz platform for Italy.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui + Base UI |
| Animations | Framer Motion |
| i18n | i18next (IT / EN / AR) |
| Linter/Formatter | Biome |
| Package manager | pnpm |

## Local development

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm preview
```

## Project structure

```
src/
  components/
    brand/       # Logo, brand assets
    layout/      # Footer, placeholders, eyebrow labels
    motion/      # Framer Motion wrappers
    nav/         # Navbar, language switcher
    sections/    # Landing page sections (Hero, FAQ, B2B, …)
    ui/          # shadcn/ui primitives
  i18n/
    locales/     # en.json, it.json, ar.json
  routes/        # Page-level components (Landing, Accedi, Cerca, …)
  styles/        # Tailwind entry, design tokens
```

## Deployment

Hosted on **Vercel** with GitHub integration — every push to `main` triggers a production deploy.

- **Production URL**: https://patentedigitale.it
- **Vercel alias**: https://patente-digitale-web.vercel.app
- **GitHub repo**: https://github.com/W3sley0Bi/patente-digitale-web
- **Vercel project**: https://vercel.com/w3sley0bis-projects/patente-digitale-web

### Custom domain DNS (Aruba)

Find the exact values in Vercel → project → **Settings → Domains** after adding your domain.

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | *(Vercel-provided IP)* |
| `CNAME` | `www` | *(Vercel-provided CNAME target)* |

SSL is provisioned automatically by Vercel once DNS resolves.

## Roadmap

- [ ] Interactive map of driving schools (see detail below)
- [ ] Section "Non solo parole" (Trust) is currently **commented out** in `src/routes/Landing.tsx` (awaiting real data).
- [ ] Admin dashboard (see detail below)

### Next — Admin dashboard

Full back-office for managing driving schools and students.

**Phase 1 — DB + auth**
- Add `admin` to the `role` check constraint in `profiles` (`check (role in ('student', 'autoscuola', 'admin'))`)
- Create one admin user manually in Supabase (set `role = 'admin'`, `approved = true` in `profiles`)
- Add RLS policies so admin can read/write all rows in `pending_claims`, `claimed_schools`, `profiles`
- Deploy the `approve_claim(p_claim_id uuid)` RPC (see SQL in `## Known Issues → Claim approval`)

**Phase 2 — Admin UI** (`/admin/dashboard`)
- Protected route: redirect non-admins away
- Pending claims table: list all `status = 'pending'` rows, one-click approve / reject (calls `approve_claim` RPC or sets status to `rejected`)
- Driving schools table: browse `claimed_schools`, view/edit profile data
- Students table: browse `profiles` where `role = 'student'`

### Next — Driving schools map

Interactive map of all driving schools in Italy.

**Data architecture**

Two sources, one clear contract:

- **GeoJSON** (static, CDN) — all schools from OpenStreetMap. This is the sole input to the map renderer. Served from the repo, refreshed periodically by a local script.
- **Supabase `claimed_schools`** — enriched, owner-edited records for claimed schools only. Not used directly by the map at runtime.

The **refresh script** is the single sync point between them:
1. Fetch latest OSM data via Overpass API
2. Query Supabase for all `place_id` values in `claimed_schools`
3. For each matching school in the OSM results, set `"claimed": true` in the GeoJSON feature properties
4. Write the updated GeoJSON to the repo / CDN

**Map rendering** (Leaflet.js + OSM tiles — no API key required)

- Load GeoJSON only — one CDN fetch, no DB call at page load
- Style pins differently based on the `claimed` flag (e.g. branded colour for claimed schools)
- On click of a claimed school pin, fetch that school's full record from Supabase (`claimed_schools` by `place_id`) for the detail panel
- Manual claims (no OSM `place_id`) are plotted separately from their `lat`/`lng` stored in `claimed_schools` — these need `lat`/`lng` columns added to the table

**Schema addition needed**

Add `lat float` and `lng float` to `claimed_schools` (already present in the migration — verify populated at claim time for manual claims).

## Known Issues

### "Autoscuola not in list" claim data leakage

A bug has been identified in the driving school claim flow where a user can be incorrectly linked to the wrong school.

**Reproduction steps:**
1. Go to the "Claim your driving school" page.
2. Search for a school and select one that has a website. This action sets a `domain_claim` entry in `localStorage`.
3. Instead of completing the domain-based claim, click "not listed" or back out to perform a manual claim.
4. Complete the manual claim and sign up/log in.
5. Upon reaching the dashboard, an effect triggers that checks `localStorage`. It finds the stale `domain_claim` from step 2 and executes the `claim_school_via_domain` RPC.
6. The user is auto-linked to the school from step 2 (e.g., "Centro Driving School") instead of the manual claim they intended to submit.

**Impact:** Users may gain unauthorized or incorrect access to driving school listings if they have previously interacted with other schools during the search phase.

### Mobile UI/UX Improvements

Several interface issues have been reported on mobile devices:
- **Visibility:** The "Accedi" (Login) button/text is not clearly visible on mobile viewports.
- **Navigation:** Tapping the user avatar does not trigger a dropdown menu (Dashboard/Logout). The current desktop-centric interaction does not translate well to touch interfaces.
- **Requirement:** General conversion of authenticated navigation and key actions to a mobile-first UI/UX (e.g., using Bottom Sheets or specialized mobile menus).

## TODO — to be discussed

### App vs. website separation: `app.patentedigitale.it` subdomain

> **Deferred — do when:** mobile app development starts, or a second developer joins and deploy independence matters.

Plan ready at [`docs/superpowers/plans/2026-05-08-app-subdomain-separation.md`](docs/superpowers/plans/2026-05-08-app-subdomain-separation.md). Estimated effort: 30 min (3 small code tasks + DNS/Vercel config).

**Approach:** same repo, same Vercel project, second domain. `app.patentedigitale.it` serves the authenticated product (Login/dashboard). `patentedigitale.it` stays pure marketing. "Accedi" opens the app in a new tab. No cookie domain complexity — users only ever auth on `app.`.

### Claim form: pre-fill all available school data

Currently the claim submission only sends the school name. The map dataset already has richer data (address, phone, website, region, CAP). This data should be included in the claim payload so the school owner doesn't have to re-type it after approval.

- Pass the full school object (address, phone, website, city, CAP, region, coordinates) when the user initiates a claim from the map
- Store it in the `claims` table alongside `school_name`
- On approval, auto-populate the school profile from the claim data instead of starting blank



### Dataset quality: should we use Google Maps as source?

Current dataset comes from OpenStreetMap (Overpass API, ~1,375 schools). OSM has incomplete data: many schools missing phone, website, region, and CAP.

**Google Maps Places API would give better data** (more schools, structured phone/website/hours). Cost to build the dataset once:

| Step | Calls | Unit price | Cost |
|------|-------|-----------|------|
| Nearby Search (~300–500 grid points, 3 pages each) | ~1,000 | $0.032 | ~$32 |
| Place Details — Contact tier (phone + website) | ~3,000 | $0.003 | ~$9 |
| **Total** | | | **~$40–60** |

Google gives $200 free credit/month → **one-time build would cost $0** if done in a single billing period. No per-user cost since it's a static GeoJSON file served from the repo.

**⚠️ Legal risk**: Google Maps ToS (§3.2.3) prohibits storing Places API data beyond 30-day caching or building a static offline dataset. Using it this way risks API key termination if the project grows.

**Better alternative**: The *Ministero delle Infrastrutture e dei Trasporti* (MIT) holds the official registry of licensed autoscuole in Italy. Worth filing a FOIA/open-data request at `mit.gov.it`. Combining official MIT data with OSM coordinates would give authoritative coverage with no licensing risk.
