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

### Next — Driving schools map
Interactive map of all driving schools in Italy using:
- **Data**: OpenStreetMap via Overpass API (`amenity=driving_school`), exported once as static GeoJSON and served from the repo/CDN
- **Rendering**: Leaflet.js + OSM tiles (both free, no API key required)
- **No backend needed** at this stage — data refreshed periodically via a local script
- Future: "Add your school" submission form backed by Supabase, so schools can self-register and we own the dataset

## TODO — to be discussed

### App vs. website separation: `app.patentedigitale.it` subdomain

Currently the authenticated product (dashboard, school management) lives under the same origin as the marketing site. As the product matures, consider migrating to a dedicated subdomain:

- **Subdomain** `app.patentedigitale.it` — independent deploy, separate caching, clean brand boundary (standard SaaS pattern). Auth cookies set on `.patentedigitale.it` (root domain) work across both.
- **Path** `/app` — simpler now (same origin, no DNS work), but shared bundle and harder to split later.

**Recommendation**: migrate to subdomain. Add `app.patentedigitale.it` in Vercel → Settings → Domains, point DNS CNAME at Vercel, update auth cookie domain.

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
