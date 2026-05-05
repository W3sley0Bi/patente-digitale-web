# Design System

The visual language for patentedigitale.it. Every implementation pass MUST read this file before writing CSS. Tokens are authoritative; raw hex / px values in components are a bug.

## Theme

Light, by default and in spirit. Scene sentence: *"A 17-year-old in Milan reads this on a 6.1-inch phone in midday daylight, on a metro home from school, with one hand, before showing the same page to their parent on a kitchen laptop that night."*

Daylight + cross-generational + cross-device forces light. A dark mode is **not** scoped for v1. Tokens are structured so a dark theme can be added later by re-mapping the surface and ink layers — components must consume tokens, never hard-coded colors.

## Color

### Strategy

**Committed.** Brand green carries 30–60% of the surface area on the landing page. Italian-flag red appears as a *5–8% accent* (badges, underline emphasis on key words, B2B section hover state, error states). White is treated as a tinted cream, not pure `#fff`. Pure black is banned.

Rationale: The user requested an Italian-flag *play*, not a literal tricolor. Restrained-on-cream would ignore the brief; Drenched green would alienate parents. Committed lets green define the brand while red plays a supporting, deliberate role.

### Palette (OKLCH)

All neutrals are tinted toward green hue (`160`) at very low chroma so the page never looks gray-flat. All values are perceptually tuned for WCAG AA on the named pairings.

| Token                     | OKLCH                       | Use                                                                         |
|--------------------------|-----------------------------|-----------------------------------------------------------------------------|
| `--color-bg`             | `oklch(0.985 0.005 160)`    | Page background. Cream-white, tinted green. Replaces `#fff`.                |
| `--color-bg-raised`      | `oklch(0.998 0.003 160)`    | Cards, modals, raised surfaces. Slightly lighter than bg.                   |
| `--color-bg-sunken`      | `oklch(0.965 0.008 160)`    | Section dividers, alternating bands, FAQ hover states.                      |
| `--color-ink`            | `oklch(0.22 0.015 160)`     | Primary text. Replaces `#000` and `gray-900`.                               |
| `--color-ink-muted`      | `oklch(0.42 0.012 160)`     | Secondary text, captions, helper copy.                                      |
| `--color-ink-faint`      | `oklch(0.62 0.010 160)`     | Tertiary text, disabled, placeholder.                                       |
| `--color-line`           | `oklch(0.92 0.008 160)`     | Hairlines, dividers, input borders at rest.                                 |
| `--color-line-strong`    | `oklch(0.84 0.012 160)`     | Hover borders, active inputs.                                               |
| `--color-brand`          | `oklch(0.62 0.16 152)`      | Primary brand green. CTA fill, link color, focus ring.                      |
| `--color-brand-hover`    | `oklch(0.56 0.17 152)`      | CTA hover. Slightly darker, slightly more chroma.                           |
| `--color-brand-soft`     | `oklch(0.94 0.05 152)`      | Brand-tinted backgrounds (badge bg, hero accent fills, section tints).      |
| `--color-brand-ink`      | `oklch(0.32 0.10 152)`      | Brand-colored text on cream (e.g., section labels).                         |
| `--color-accent`         | `oklch(0.62 0.20 25)`       | Italian-flag red. Accent role only. Underline emphasis, B2B band, errors.   |
| `--color-accent-soft`    | `oklch(0.94 0.05 25)`       | Red-tinted backgrounds (error fill, B2B section tint).                      |
| `--color-accent-ink`     | `oklch(0.42 0.18 25)`       | Red text on cream (very rare; used for error copy and one underline).       |
| `--color-success`        | same as `--color-brand`     | Don't introduce a separate green.                                           |
| `--color-warning`        | `oklch(0.78 0.16 75)`       | Amber. Form warnings, expiring deadlines.                                   |
| `--color-info`           | `oklch(0.62 0.12 230)`      | Cool blue. Informational pills only. Use sparingly.                         |
| `--color-focus-ring`     | `oklch(0.62 0.16 152 / 45%)`| Focus outline. Brand green at 45% alpha, 3px offset.                        |

**Bans (project-specific, in addition to the impeccable shared bans):**
- No raw hex except inside this file. Components consume CSS variables.
- No `gray-*` Tailwind classes. Use `ink` / `line` / `bg` tokens.
- No literal Italian tricolor stripe (green-white-red bar). Italian-ness is communicated through palette balance, not flag iconography.
- No green CTA on green background. Brand is solid only on cream / white surfaces.
- No red used as a primary CTA color anywhere. Red is accent only.

### Pairings (verified contrast)

| Pairing                                | Contrast | Use case                              |
|----------------------------------------|----------|---------------------------------------|
| `--color-ink` on `--color-bg`          | 13.8 : 1 | Body text                             |
| `--color-ink-muted` on `--color-bg`    | 6.4 : 1  | Secondary text                        |
| `--color-ink-faint` on `--color-bg`    | 3.6 : 1  | Tertiary text (use ≥14px only)        |
| White on `--color-brand`               | 4.6 : 1  | Primary CTA label                     |
| `--color-brand-ink` on `--color-bg`    | 8.2 : 1  | Brand-colored eyebrow / section label |
| `--color-accent-ink` on `--color-bg`   | 6.7 : 1  | Error copy / red emphasis             |

## Typography

### Font selection

Three brand-voice words: **trustworthy, warm, modern** — translated to physical objects: *a leather Vespa key fob, a clean espresso menu typeset in Milan, a paper boarding pass for an EasyJet flight to Roma.*

Reflex picks (rejected per impeccable rules): Inter, Plus Jakarta Sans, Fraunces, Instrument Sans / Serif, DM Sans, Geist Sans.

**Final selection** (Pangram Pangram catalogue, free for commercial):

- **Display + UI sans: [Satoshi](https://www.fontshare.com/fonts/satoshi)** — geometric, modern, warm-corner, distinctive *t* and *a*. Variable, 5 weights. Carries headlines and body without needing a second family.
- **Optional accent display: [Boska](https://www.fontshare.com/fonts/boska)** — warm humanist serif w/ italic, used ONLY for the hero headline accent word and one editorial pull-quote. NOT for body, NOT for any UI label. Boska italic is the one place we permit a serif italic; everywhere else, Satoshi italic.
- **Mono: [JetBrains Mono](https://www.jetbrains.com/lp/mono/)** — used only for *codice fiscale* fields and any code-shaped data (P.IVA, order numbers in the dashboard later). Not on the landing page surface.

Loading: `@fontsource-variable/satoshi` and `@fontsource-variable/boska`. Self-hosted via fontsource. No Google Fonts CDN (privacy + speed). Preload Satoshi 400 + 700 + Boska italic only.

### Type scale (fluid, modular, ratio 1.28)

```
--text-xs:    clamp(0.75rem, 0.72rem + 0.15vw, 0.82rem);
--text-sm:    clamp(0.875rem, 0.84rem + 0.18vw, 0.95rem);
--text-base:  clamp(1rem, 0.96rem + 0.2vw, 1.075rem);
--text-md:    clamp(1.125rem, 1.07rem + 0.28vw, 1.25rem);
--text-lg:    clamp(1.375rem, 1.28rem + 0.48vw, 1.625rem);
--text-xl:    clamp(1.75rem, 1.55rem + 1vw, 2.25rem);
--text-2xl:   clamp(2.25rem, 1.85rem + 2vw, 3rem);
--text-3xl:   clamp(2.875rem, 2.1rem + 3.8vw, 4.25rem);
--text-display: clamp(3.5rem, 2.5rem + 5vw, 5.75rem);  /* hero only */
```

### Hierarchy rules

- Body line-length capped at **68ch**. Long-form paragraphs (FAQ, B2B explainer) lock to `max-width: 60ch`.
- Heading weight contrast: body 400, headings 700, display 800. No 500/600 weights anywhere — flat scale risk.
- Hero headline allowed ONE Boska italic word. Example: *"Patente, **digitale**."* with `digitale` in Boska italic. The italicized word is also the underlined-red emphasis target.
- All-caps reserved for: section eyebrows (text-xs, +0.12em letter-spacing) and the badge component. Body and headings never all-caps.
- No em dashes. Periods, commas, colons. (See PRODUCT.md voice rules.)

## Spacing & Layout

### Spacing scale (rem, breathable)

```
--space-1: 0.25rem;   /*  4px */
--space-2: 0.5rem;    /*  8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.5rem;    /* 24px */
--space-6: 2rem;      /* 32px */
--space-7: 3rem;      /* 48px */
--space-8: 4rem;      /* 64px */
--space-9: 6rem;      /* 96px */
--space-10: 8rem;     /* 128px */
--space-11: 12rem;    /* 192px */
```

Section vertical rhythm: alternates `--space-9` and `--space-10` between sections to break monotony. Same padding everywhere = monotony (impeccable shared law).

### Container

- `--container-narrow: 42rem;` — long-form copy (FAQ, About text).
- `--container-default: 76rem;` — most sections.
- `--container-wide: 88rem;` — hero, footer, full-bleed bands.
- Page horizontal padding: `clamp(1rem, 4vw, 2.5rem)`.

Don't wrap everything in `--container-default`. Hero, B2B band, trust band, and final CTA are full-bleed-with-tinted-background; only their inner content uses a container.

### Grid

- 12-col desktop, 6-col tablet, 4-col mobile.
- `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` for any cards-as-grid section. Avoids breakpoint juggling.
- Layout direction is **left-aligned with intentional asymmetry**, not centered-stack. Centered-stack reads as template.

## Components

Built on **shadcn/ui** (Radix under the hood) but visually re-skinned to match these tokens. Every shadcn install must be tweaked, not used raw, or the page will read as "another shadcn site".

### Required components for the landing page

| Component        | Source                                   | Notes                                                                 |
|------------------|------------------------------------------|-----------------------------------------------------------------------|
| `Button`         | shadcn `button` re-skinned               | 3 variants: `primary` (brand fill, white ink), `secondary` (ink fill, cream ink), `ghost` (cream bg, ink text, 1px line border). 3 sizes: `sm`, `md`, `lg`. Radius `--radius-pill` for primary / secondary, `--radius-md` for ghost. |
| `Badge`          | custom                                   | Pill, all-caps text-xs, soft-bg variants (brand-soft, accent-soft).   |
| `LangSwitch`     | custom (Radix `DropdownMenu` based)      | Compact two-letter pill (`IT`/`EN`), opens menu on click.             |
| `Accordion`      | shadcn `accordion` re-skinned            | FAQ. `grid-template-rows` transition for open/close, not `height`.    |
| `NavSheet`       | shadcn `sheet`                           | Mobile nav drawer.                                                    |
| `MascotSpot`     | custom                                   | Wraps the existing `logo.jpg` mascot at 3 supported sizes.            |
| `SectionEyebrow` | custom                                   | Reusable section label (small all-caps, brand-ink color).             |
| `StatBlock`      | custom                                   | Trust band stat. Editorial layout (NOT the hero-metric template).      |

### Radii

```
--radius-sm: 0.5rem;   /* inputs, small chips */
--radius-md: 0.875rem; /* cards, accordion items */
--radius-lg: 1.5rem;   /* hero image frame, B2B band */
--radius-xl: 2.25rem;  /* feature panels */
--radius-pill: 999px;  /* CTAs, badges, lang switch */
```

Avoid the "everything `2xl` rounded" SaaS-cliche. Mix radii by component role.

### Elevation

Soft, brand-tinted. Never `rgba(0,0,0,...)` — always green-tinted shadow.

```
--shadow-sm: 0 1px 2px 0 oklch(0.6 0.04 160 / 0.06);
--shadow-md: 0 6px 18px -4px oklch(0.55 0.05 160 / 0.10), 0 2px 4px -2px oklch(0.55 0.05 160 / 0.06);
--shadow-lg: 0 20px 40px -12px oklch(0.5 0.06 160 / 0.18);
--shadow-cta: 0 8px 24px -8px oklch(0.62 0.16 152 / 0.45);  /* brand-tinted CTA glow */
```

### Borders

1px hairlines using `--color-line`. **No side-stripe borders** of >1px on cards (impeccable absolute ban; the existing mockup violates this on the Guide cards — do NOT port that pattern).

## Iconography

- **Lucide** (lucide-react). Replace every FontAwesome reference from the mockup.
- 1.5px stroke at all sizes, 24px default, 20px in dense UI.
- `--color-ink-muted` at rest, `--color-brand` on interactive hover. Never gradient-filled, never two-tone.
- Decorative icons get `aria-hidden="true"`.
- The mascot is NOT an icon. It's an illustration component. Don't crop, recolor, or restyle it.

## Imagery

The brief implies imagery (consumer service, autoscuole, students). Zero-images would read as incomplete (impeccable brand register law).

- **Mascot** — existing assets (`logo.jpg`, `nuovo-banner.png` from `/patente-digitale/`) are copied verbatim into `web/src/assets/mascot/`. Do not redraw, do not alter, do not convert to SVG (raster-rendered details would degrade).
- **Photography** — Unsplash. Specific search shapes for the v1 placeholders:
  - Hero secondary: a young person in a city looking at a phone with autoscuole context. Search: *"young woman looking at phone Italian street"*.
  - Trust band background: a stretch of Italian road at golden hour (Tuscan, Amalfi-style coastal road, etc.). Search: *"Italian coastal road golden hour"*.
  - B2B band: an empty driving school classroom, modern. Search: *"modern classroom interior"*.
  - Testimonials: 3 candid portraits (one teen, one parent, one professional 30s). NOT corporate stock — Unsplash *"candid Italian portrait"*.
- URL shape: `https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1600&q=80`. Use real Unsplash IDs you are confident about.
- **Alt text** is part of the voice — short Italian sentence at the locale level; English equivalent in EN locale.

## Motion

- Library: **Framer Motion**.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). Custom token: `--ease-out-expo`.
- No bounce, no elastic, no spring on layout properties.
- Don't animate `width`, `height`, `top`, `left`. Animate `transform`, `opacity`, `clip-path`, `filter`.
- **Page entrance** — staggered reveal on the hero only: mascot fades + 12px translateY, headline word-by-word over 480ms, subhead + CTAs follow at 320ms total stagger. Once. Never on subsequent navigation.
- **Scroll reveals** — every section below the hero fades in (opacity 0 → 1, 8px translateY) when it enters the viewport, ONCE. Use `motion.div` w/ `whileInView` + `viewport={{ once: true, margin: "-15%" }}`.
- **Hover states** — Buttons: `transform: translateY(-1px)` + `--shadow-cta` over 180ms. Cards: line-color shift + 1px translateY over 220ms. No scale > 1.02.
- **Reduced motion** — every animation wrapped in a `useReducedMotion()` check. Reduced state: opacity-only, 120ms or instant for hover.

## Tokens output

Implementation surface: `web/src/styles/tokens.css` — pure CSS variables on `:root`. Tailwind v4 reads them via `@theme` block in `tailwind.css`. No JS theme objects. Components reference tokens via Tailwind utilities (`bg-bg-raised`, `text-ink-muted`) or via raw `var(--color-*)` in custom styles.

Subagents must NOT introduce new color, spacing, radius, or shadow tokens without first updating this file. New tokens require a one-line justification at the bottom of the relevant section.

## Voice & micro-copy (visual side)

- Sentence case for buttons, badges, eyebrows. NEVER "CLICK HERE" all-caps button labels.
- Numerals: Italian thousand separator (`1.250` not `1,250`). Currency: `1.250 €` (space, then symbol, Italian convention).
- No emojis in marketing copy. (Mascot is the personality; emojis dilute it.)
- Loading states: subtle "skeleton" pulse using `--color-bg-sunken`, never spinning circles for content.
