# Stack & Subagent Handoff

The implementation contract for the sonnet 4.6 subagents that will build patentedigitale.it. Read PRODUCT.md, DESIGN.md, and SHAPE-LANDING.md before starting any task in this file.

## Tech stack (locked)

| Layer | Pick | Version | Why |
|---|---|---|---|
| Bundler / dev server | **Vite** | latest 6.x | Fast HMR, native ESM, first-class TS, smallest config surface. |
| Framework | **React** | 19.x | Latest stable, supports Server Components later if we ever go SSR. |
| Language | **TypeScript** | 5.x | Strict mode on. |
| Package manager | **pnpm** | latest | Faster, disk-efficient, deterministic. |
| Styling | **Tailwind CSS v4** | 4.x | CSS-first config via `@theme`, OKLCH tokens map directly into utilities. |
| Components | **shadcn/ui** | CLI latest | Composable Radix primitives, no visual lock-in (re-skinned per DESIGN.md). |
| Icons | **lucide-react** | latest | 1.5px stroke matches the design language; replaces FontAwesome. |
| Animation | **framer-motion** | 11.x | Page entrance + scroll reveals + reduced-motion handling. |
| i18n | **react-i18next** + `i18next-browser-languagedetector` | latest | Industry-standard, supports namespaces, ICU, and pluralization. |
| Routing | **react-router** | 7.x (declarative) | For placeholder sub-routes (`/cerca`, `/iscrizione`, `/partner`, `/accedi`). |
| Carousel | **embla-carousel-react** | latest | Mobile testimonial carousel; lightweight, accessible. |
| Lint + format | **Biome** | latest | Faster than ESLint+Prettier; one tool. |
| Fonts | **fontsource** (`@fontsource-variable/satoshi`, `@fontsource-variable/boska`) | latest | Self-hosted, privacy-friendly, WOFF2. |
| Hosting | **Vercel** | — | Best DX for Vite SPA, branch previews, custom domain easy. |
| CI | **GitHub Actions** + Vercel auto-deploy | — | Lint + typecheck + build on PR; deploy on merge. |
| Testing | **Vitest** + **@testing-library/react** + **Playwright** (smoke) | latest | Vitest for units, Playwright for one E2E smoke test on the landing. |

### Banned (do not install)

- ESLint, Prettier (Biome replaces both).
- Any CSS-in-JS lib (styled-components, emotion). Tailwind v4 only.
- FontAwesome, react-icons. Lucide only.
- Day.js, Moment, Luxon. Use `Intl.DateTimeFormat` directly; no date library needed for v1.
- Any UI library that overrides Radix primitives (Mantine, Chakra, MUI). shadcn only.

## Project layout

```
patente-digitale-web/
├── PRODUCT.md
├── DESIGN.md
├── SHAPE-LANDING.md
├── STACK.md
├── README.md                 # generated; describes how to run
├── .gitignore
├── .nvmrc
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── biome.json
├── vercel.json               # SPA rewrite rule
├── index.html                # locale-aware <html lang>, OG meta placeholders
├── public/
│   └── favicon.svg           # generated from mascot crop, simple
├── src/
│   ├── main.tsx              # entry; mounts <App /> with RouterProvider + I18nProvider
│   ├── App.tsx               # router shell, top-level providers
│   ├── routes/
│   │   ├── Landing.tsx       # the only fully built route in v1
│   │   ├── Cerca.tsx         # placeholder (404-aware)
│   │   ├── Iscrizione.tsx    # placeholder
│   │   ├── Partner.tsx       # placeholder
│   │   └── Accedi.tsx        # placeholder
│   ├── components/
│   │   ├── ui/               # shadcn-installed primitives, re-skinned
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── dropdown-menu.tsx
│   │   ├── brand/
│   │   │   ├── Mascot.tsx    # spot-illustration wrapper, 3 sizes
│   │   │   └── Wordmark.tsx
│   │   ├── nav/
│   │   │   ├── Nav.tsx
│   │   │   ├── NavSheet.tsx  # mobile drawer
│   │   │   └── LangSwitch.tsx
│   │   ├── sections/
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── WhyDigital.tsx
│   │   │   ├── Trust.tsx
│   │   │   ├── B2B.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   └── FinalCta.tsx
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   └── SectionEyebrow.tsx
│   │   └── motion/
│   │       └── Reveal.tsx    # opacity+translateY scroll reveal wrapper
│   ├── i18n/
│   │   ├── config.ts         # i18next init, detector, fallback
│   │   └── locales/
│   │       ├── it.json
│   │       └── en.json
│   ├── styles/
│   │   ├── tokens.css        # CSS variables, the source of truth
│   │   ├── tailwind.css      # @import + @theme block mapping tokens
│   │   └── fonts.css         # fontsource imports + preload hints
│   ├── lib/
│   │   ├── cn.ts             # clsx + tailwind-merge helper
│   │   └── motion.ts         # ease tokens + reduced-motion variants
│   ├── hooks/
│   │   ├── useReducedMotion.ts
│   │   └── useScrollSpy.ts   # active nav link tracking
│   └── assets/
│       └── mascot/
│           ├── logo.jpg      # copied from /patente-digitale/
│           └── nuovo-banner.png  # copied from /patente-digitale/
└── tests/
    ├── unit/
    │   └── i18n.test.ts      # asserts every IT key has an EN counterpart
    └── e2e/
        └── landing.spec.ts   # Playwright smoke
```

## Subagent dispatch plan

Six subagents (sonnet 4.6), dispatched in three waves. Wave 2 and Wave 3 run in parallel within their wave.

### Wave 1 — scaffold (1 subagent, blocks everything else)

**Subagent: `scaffolder`**
- Create the Vite project: `pnpm create vite@latest . --template react-ts` (note: `.` to target the current dir; the dir already contains the four `.md` files).
- Move/keep the existing `.md` files at the project root.
- Install all deps from the stack table.
- Initialize Tailwind v4: install `tailwindcss@latest`, configure via `tailwind.css`, import in `main.tsx`.
- Run `pnpm dlx shadcn@latest init` and install the components listed in DESIGN.md (`button`, `badge`, `accordion`, `sheet`, `dropdown-menu`).
- Configure Biome: `pnpm dlx @biomejs/biome init`. Lock to project conventions in `biome.json`.
- Configure Vite: alias `@/` → `src/`, set `build.outDir = "dist"`, configure the React plugin.
- Configure react-router: `BrowserRouter`, declare 5 routes (landing + 4 placeholders).
- Configure i18next: load `it.json` + `en.json`, default `it`, detector with `localStorage` key `pd:locale`.
- Copy mascot assets: `cp ../patente-digitale/{logo.jpg,nuovo-banner.png} src/assets/mascot/`.
- Generate `tokens.css` from DESIGN.md (verbatim).
- Generate `fonts.css` with fontsource preload hints.
- Generate `index.html` with locale-aware `<html lang="it">` (updated at runtime), OG placeholder meta tags, favicon link.
- Add `vercel.json` with the SPA rewrite rule (`{ "source": "/(.*)", "destination": "/" }`).
- Add `.nvmrc` (Node 20 LTS).
- Add a minimal `README.md` (run + build + deploy commands).
- Verify: `pnpm dev` boots without errors, `pnpm build` produces `dist/`, `pnpm biome check .` is clean.

**Output:** A clean, empty Vite app with the design system tokens, fonts, i18n, routing, and shadcn primitives all wired but no sections built. Ready for Wave 2.

### Wave 2 — section builders (3 subagents, parallel)

All three read PRODUCT.md, DESIGN.md, SHAPE-LANDING.md (especially the section-by-section spec), and the now-scaffolded design system from Wave 1.

**Subagent: `chrome` (nav + footer + layout primitives)**
- Build `Nav.tsx`, `NavSheet.tsx`, `LangSwitch.tsx`, `Footer.tsx`, `SectionEyebrow.tsx`.
- Build the `Reveal.tsx` motion wrapper.
- Build the `Mascot.tsx` and `Wordmark.tsx` brand components.
- Write i18n keys for `landing.nav.*` and `landing.footer.*` in both locales.
- Verify: nav sticks on scroll, language switch updates locale and `<html lang>`, mobile drawer opens/closes with focus trap, footer renders all 4 columns at all breakpoints.

**Subagent: `top-half` (Hero, HowItWorks, WhyDigital)**
- Build `Hero.tsx`, `HowItWorks.tsx`, `WhyDigital.tsx`.
- Write i18n keys for `landing.hero.*`, `landing.howItWorks.*`, `landing.whyDigital.*` in both locales (verbatim from SHAPE-LANDING.md).
- Implement the hero entrance choreography (per DESIGN.md motion section).
- Implement the diagonal layout in HowItWorks; not a card grid.
- Implement alternating-row layout in WhyDigital.
- Source 4 placeholder Unsplash photos for WhyDigital using the search shapes in SHAPE-LANDING.md.
- Verify: all three sections render correctly at 320px / 768px / 1280px / 1920px; entrance animation respects reduced-motion.

**Subagent: `bottom-half` (Trust, B2B, FAQ, Testimonials, FinalCta)**
- Build all five sections.
- Write i18n keys for `landing.trust.*`, `landing.b2b.*`, `landing.faq.*`, `landing.testimonials.*`, `landing.finalCta.*` in both locales.
- Implement the marquee in Trust (CSS keyframes, reduced-motion fallback).
- Implement the dark band in B2B (the only "dark" surface on the page).
- Implement the FAQ accordion using shadcn `Accordion` re-skinned per DESIGN.md.
- Implement the mobile carousel in Testimonials using `embla-carousel-react`.
- Source 3 candid portrait photos from Unsplash for Testimonials.
- Verify: marquee pauses on hover and on reduced-motion; FAQ accordion uses `grid-template-rows` transition; carousel is keyboard-accessible.

### Wave 3 — polish + verification (2 subagents, parallel)

**Subagent: `placeholders` (sub-routes)**
- Build `Cerca.tsx`, `Iscrizione.tsx`, `Partner.tsx`, `Accedi.tsx` as placeholder routes.
- Each renders the Nav + Footer chrome, an `Alert`-style banner ("Stiamo costruendo questa pagina"), and a back-to-home link.
- Add i18n keys for the placeholder copy in both locales.
- Verify: each route is reachable from the landing CTAs; back-to-home works.

**Subagent: `verifier` (a11y + perf + acceptance gate)**
- Run `pnpm biome check .` → must be clean.
- Run `pnpm tsc --noEmit` → must be clean.
- Run `pnpm vitest run` → unit tests pass (incl. the i18n key parity test).
- Run `pnpm playwright test` → smoke test passes.
- Run Lighthouse mobile against the local build → score targets per SHAPE-LANDING.md acceptance criteria.
- Run axe-core via Playwright → no critical or serious violations.
- Manually verify every checkbox in the SHAPE-LANDING.md "Acceptance criteria" section.
- Generate a one-page acceptance report at `tests/ACCEPTANCE.md`.
- If any check fails, file a follow-up task; do not mark Wave 3 complete with failures.

## Cross-wave conventions

These apply to every subagent. Violations are blockers, not nits.

- **No raw hex / px in components.** Tokens via Tailwind utilities (`bg-bg-raised`, `text-ink-muted`) or `var(--color-*)` only.
- **No new tokens without updating DESIGN.md.** A new color/space/shadow token requires a one-line justification appended to the right section of DESIGN.md before commit.
- **No copy embedded in components.** Every visible string is an i18n key. Components call `t('landing.section.key')`.
- **Every interactive element is keyboard-reachable** with a visible focus ring (`--color-focus-ring`).
- **Every animation respects `prefers-reduced-motion`.** Use the `useReducedMotion` hook from framer-motion.
- **Atomic commits.** One logical change per commit, conventional-commits format (`feat(hero): build hero section`).
- **PR per wave.** Wave 1 = 1 PR. Wave 2 = 3 PRs. Wave 3 = 2 PRs. Each PR cites PRODUCT.md, DESIGN.md, SHAPE-LANDING.md.
- **No silent dependency additions.** New dependencies require a line in this file, in the "Tech stack" table, with a justification.
- **No `any` in TypeScript.** `unknown` and narrow.
- **No `console.log` in committed code.** Strip or convert to `console.warn` for genuine warnings; remove the rest.

## Vercel deployment config

- `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }],
    "headers": [
      {
        "source": "/assets/(.*)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
  ```
- Connect the GitHub repo on Vercel; production branch = `main`; preview deploys for every PR.
- Custom domain: `patentedigitale.it` (placeholder; user provisions DNS later).
- Environment variables: none required for v1.
- Build command: `pnpm build`. Output dir: `dist`. Install command: `pnpm install --frozen-lockfile`.

## Out of scope for v1 (do not build)

These are explicitly deferred. Subagents must NOT build them, even if they look easy.

- Backend, database, auth, payments. Everything is static + placeholder.
- Real autoscuola search / map. The `/cerca` route is a placeholder.
- Iscrizione form logic. The `/iscrizione` route is a placeholder.
- Admin / partner dashboard. The `/partner` route is a placeholder.
- Real testimonials / metrics. All are placeholder copy.
- Blog / content marketing pages.
- Cookie banner / GDPR consent flow (will follow once analytics are added).
- A11y certification audit (we hit WCAG AA via lighting + axe; full third-party audit later).
- E2E coverage beyond the landing smoke test.

## Sign-off

This document, plus PRODUCT.md, DESIGN.md, and SHAPE-LANDING.md, are the implementation contract. Subagents who deviate from any of the four files must surface the deviation in their PR description, name the conflict, and propose a resolution rather than silently choosing.

When all three waves complete and `tests/ACCEPTANCE.md` is green, the v1 landing page ships.
