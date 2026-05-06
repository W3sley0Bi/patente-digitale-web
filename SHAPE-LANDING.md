# Shape: Landing Page

The single deliverable for v1. Reads PRODUCT.md and DESIGN.md as context. Implementation subagents MUST consult both before writing components.

## Feature summary

A single-page brand landing for patentedigitale.it that converts three audiences (Italian teen, parent payer, international resident) on the *Trova autoscuola* path, recruits autoscuole owners as B2B partners, and establishes trust through transparent process, real partner signal, and human voice. Long-scroll, narrative-driven, mobile-first, fully i18n-keyed (IT default, EN ready). The mascot stays exactly as designed in `/patente-digitale/`; the rest of the page is rebuilt from scratch.

## Primary user action

**Click *Trova autoscuola* (the primary CTA).** Every section on the page either drives toward this action or removes a reason not to take it. Secondary action: *Sei un'autoscuola? Unisciti.* (B2B lead capture). Everything else is supporting.

## Design direction

- **Color strategy:** Committed (per DESIGN.md). Brand green carries 30–60% of surface; Italian-flag red is a 5–8% accent; cream-tinted white as base.
- **Theme scene:** *"A 17-year-old in Milan reads this on a 6.1-inch phone in midday daylight, on a metro home from school, with one hand, before showing the same page to their parent on a kitchen laptop that night."* → Light mode, only.
- **Anchor references** (real-world, not adjectives):
  - **Satispay marketing site** — Italian fintech, warm green, modern type, trustworthy without being stiff. Closest tonal match.
  - **Duolingo brand pages (NOT in-app)** — playful but disciplined, mascot used like punctuation, clear narrative scroll. Calibrate "warmth" against Duolingo, NOT against in-app green-overload.
  - **Revolut Italy product pages** — dense, long-scroll, multi-audience, comfortable for both teen and parent.

If a probe is requested later, those three anchors are the lanes to test against. The currently chosen lane is *warm-Italian-fintech*, NOT editorial-magazine, NOT tech-minimal-monochrome, NOT consumer-toy.

## Scope

- **Fidelity:** Production-ready. This ships as the public site at `patentedigitale.it`.
- **Breadth:** One page (long scroll), 10 sections plus nav and footer. Sub-routes (`/iscrizione`, `/cerca`, `/partner`, etc.) are scaffolded only as 404-aware placeholders with the matching nav state — full builds are out of scope here.
- **Interactivity:** Real components. Working language switch (IT ↔ EN), working accordion (FAQ), working mobile nav drawer. Search and signup CTAs route to placeholder pages; no backend.
- **Time intent:** Polish until it ships. No "we'll fix later" loose ends.

## Layout strategy

The page tells one story across ten beats. The *narrative arc* is:

1. **Hook** — "Patente, digitale" + mascot + primary CTA (hero).
2. **Promise** — three steps that fit on one fold of mobile (how-it-works).
3. **Why bother** — value props that justify switching from the traditional path.
4. **Proof** — trust band (placeholder stats + autoscuole partner sample).
5. **Other side** — autoscuole owners (B2B band, visually distinct).
6. **Doubt removal** — FAQ, testimonials.
7. **Last push** — final CTA band.
8. **Reassurance** — footer with all the boring-but-essential signals (P.IVA, privacy, contact).

Visual rhythm alternates: full-bleed tinted bands (hero, B2B, final CTA) with contained sections (steps, why, FAQ, testimonials). Same padding everywhere = monotony; alternating bands break the page into chapters.

Asymmetry: hero is left-aligned 5/12 text + right-aligned 7/12 mascot. Steps are a diagonal 3-column with offset numerals (NOT identical card grid). Why-digital alternates left/right text-image rows. Trust band is editorial 3-column without identical sizing.

## Section-by-section spec

For each section: purpose · layout · copy (IT default + EN equivalent) · key states · interactions · components used. Copy is i18n-keyed at `landing.<section>.<key>`.

---

### 1. Nav (sticky)

**Purpose:** Persistent path to login, language, and primary CTA at any scroll depth.

**Layout:** 88px tall, full-bleed, `--color-bg` background with `--shadow-sm` only after 8px scroll. Three columns: brand lockup (left), nav links (center, desktop only), actions (right).

**Brand lockup (left):**
- Mascot image (`logo.jpg`) at 48px, `border-radius: 999px`.
- Wordmark next to it: `Patentedigitale.it` in Satoshi 700, `--color-ink`, no all-caps, no green tint.

**Nav links (center, desktop only):** *Come funziona · Autoscuole · Per le autoscuole · FAQ · Contatti*. Anchor links to in-page sections. Active state: brand-color underline 2px below text, animated on scroll into matching section.

**Actions (right):**
- `LangSwitch` component (`IT` / `EN`).
- Secondary `Button` "Accedi" (ghost variant, lucide `User` icon, 16px).
- Primary `Button` "Trova autoscuola" (primary variant, lucide `MapPin` icon).

**Mobile (≤768px):** Brand lockup left, language switch + hamburger right. Hamburger opens `NavSheet` (right-side drawer): full vertical nav links, language switch, both action buttons stacked.

**i18n keys:**
```
landing.nav.howItWorks      → "Come funziona" / "How it works"
landing.nav.autoscuole      → "Autoscuole"     / "Driving schools"
landing.nav.partners        → "Per le autoscuole" / "For driving schools"
landing.nav.faq             → "FAQ"            / "FAQ"
landing.nav.contact         → "Contatti"       / "Contact"
landing.nav.signIn          → "Accedi"         / "Sign in"
landing.nav.findSchool      → "Trova autoscuola" / "Find a driving school"
```

**Interactions:** Sticky on scroll, shadow-on-scroll, in-page anchor links smooth-scroll with `scroll-behavior: smooth` (respects reduced-motion). Active link tracking via Intersection Observer on each section.

---

### 2. Hero

**Purpose:** Hook + value proposition + primary conversion via search in the first fold.

**Layout:** Centered single-column. Vertical padding `--space-10`. Background: subtle radial gradient bloom centered behind the text, fading to `--color-bg`.

**Trust micro-line (above headline):** Pill-shaped badge containing 3 mini-avatars + "12,000+ studenti felici".

**Headline (Satoshi 800, `--text-display`, line-height 1.05, centered):**
- IT: *Patente. Senza burocrazia.* (with *Senza* underlined in `--color-accent` red, 3px wave underline)
- EN: *Driving licence. Zero red tape.*

**Sub-headline (Satoshi 400, `--text-md`, max-width `50ch`, centered, `--color-ink-muted`):**
- IT: *Trova la tua autoscuola, iscriviti in 5 minuti, paga in sicurezza. Tutto online, niente fila in segreteria.*

**Search Bar (Primary Conversion):**
- Centered pill input (max-width 600px).
- White background, `--shadow-cta`.
- Lucide `Search` icon on left, primary `Button` on right ("Trova la tua autoscuola").

**Secondary Link (below search):**
- "Come funziona" with `ArrowRight` icon. Smooth scroll to section #3.

**i18n keys:**
```
landing.hero.headline.line1     → "Patente." / "Driving licence."
landing.hero.headline.line2     → "burocrazia." / "red tape."
landing.hero.headline.emphasis  → "Senza" / "Zero"  (key for the underlined word)
landing.hero.subhead            → as above
landing.hero.searchPlaceholder  → "Cerca la tua città..." / "Search by city..."
landing.hero.cta.primary        → "Trova autoscuola" / "Find a driving school"
landing.hero.cta.secondary      → "Come funziona" / "How it works"
landing.hero.trust.social       → "12,000+ studenti felici"
landing.hero.mascotAlt          → "Patentino, la mascotte di Patentedigitale.it" / "Patentino, the Patentedigitale.it mascot"
```

**Entrance motion:** Per DESIGN.md "page entrance" rule. Centered stagger reveal.

---

### 3. How it works (3 steps)

**Purpose:** Make the process legible in 8 seconds.

**Layout:** Diagonal three-column with offset baselines (NOT identical card grid). Column 1 sits at the top of the row, column 2 is offset down by 32px, column 3 is offset down by 64px. Connecting hairline (1px, `--color-line-strong`) draws diagonally between the numerals on desktop. Mobile stacks vertically with the connecting line running vertically through numerals.

**Section eyebrow:** `SectionEyebrow` component, copy: *In 3 mosse.* / *In 3 moves.*

**Section heading (Satoshi 700, `--text-2xl`):**
- IT: *Dalla ricerca al volante, in 3 passaggi.*
- EN: *From searching to driving, in 3 steps.*

**Per-step cell:**
- Numeral (`01.`, `02.`, `03.`) in Boska italic, `--text-3xl`, `--color-brand-ink`.
- Step title (Satoshi 700, `--text-md`).
- Step description (Satoshi 400, `--text-sm`, `--color-ink-muted`, max 32ch).
- Lucide icon at 28px, `--color-brand`, sits after the description.

**Steps:**

| # | Title (IT)         | Title (EN)        | Description (IT)                                                        | Description (EN)                                                          | Icon       |
|---|--------------------|-------------------|-------------------------------------------------------------------------|---------------------------------------------------------------------------|------------|
| 1 | Trova la tua scuola | Find your school  | Esplora la mappa, filtra per regione, scegli la più vicina.             | Browse the map, filter by region, pick the closest one.                   | `MapPin`   |
| 2 | Iscriviti online    | Enrol online      | Compila i dati una volta, paga con PayPal o Apple Pay, salta la fila.   | Fill in your details once, pay with PayPal or Apple Pay, skip the queue.  | `FileSignature` |
| 3 | Studia e prenota    | Study and book    | Quiz dal tuo telefono, prenoti le guide quando vuoi tu.                 | Quizzes on your phone, book lessons whenever you want.                    | `BookOpen` |

**i18n keys:** `landing.howItWorks.eyebrow`, `.heading`, `.steps.[1|2|3].title`, `.steps.[1|2|3].description`.

**Interactions:** Static section. Numerals animate the diagonal connector line on enter (clip-path reveal, 800ms) once, then settle.

---

### 4. Why digital (value props)

**Purpose:** Convert skeptics — answer "why bother switching from the autoscuola my cousin used?"

**Layout:** Four alternating rows, each with a 6/12 image + 6/12 text block. Rows alternate left/right (image-text, text-image, image-text, text-image). Mobile collapses to image-on-top per row. Generous `--space-9` between rows.

**Section eyebrow:** *Perché digitale.* / *Why digital.*

**Section heading:** *Perché aspettare un anno per guidare? Ottieni il foglio rosa in 2 mesi, non in 12.* / *Why wait a year to drive? Get your pink slip in 2 months, not 12.*

**Rows:**

| # | Heading (IT) | Heading (EN) | Body (IT, ≤220 chars) | Body (EN) | Image search |
|---|---|---|---|---|---|
| 1 | Niente carta, niente fila. | No paper, no queues. | Iscrizione completa online: documenti caricati una volta, validati istantaneamente. La segreteria della tua autoscuola la vedi solo per le guide. | Fully online enrolment: documents uploaded once, validated instantly. You only see the school in person for driving lessons. | "young person scanning document with phone" |
| 2 | Pagamenti come li conosci. | Payments you already use. | PayPal, Apple Pay, Google Pay, carta. Stessa esperienza dei tuoi acquisti quotidiani, con ricevuta automatica per i tuoi genitori. | PayPal, Apple Pay, Google Pay, card. Same flow as your everyday checkout, with an auto receipt for your parents. | "phone wallet payment closeup" |
| 3 | Quiz veri, non fotocopie. | Real quiz, no photocopies. | I quiz ufficiali del Ministero, dal browser o dall'app, con statistiche sui tuoi punti deboli. Ti prepari quando hai 5 minuti tra una lezione e l'altra. | Official Ministry quizzes, in your browser or app, with analytics on your weak topics. Practise in the 5 minutes between classes. | "student studying on phone in cafe" |
| 4 | Scadenze, mai più dimenticate. | Deadlines you can't forget. | Foglio rosa, esami, scadenze patente — tutto in un'unica timeline che ti avvisa via email e WhatsApp. | Pink sheet, exams, licence renewal dates — one timeline that pings you via email and WhatsApp. | "calendar reminder phone notification" |

**i18n keys:** `landing.whyDigital.eyebrow`, `.heading`, `.rows.[1..4].title`, `.rows.[1..4].body`, `.rows.[1..4].imageAlt`.

**Interactions:** Each row reveals on scroll independently (per DESIGN.md scroll reveal rule).

---

### 5. Trust band (placeholder stats + partners)

**Purpose:** Aggregate the proof — numbers that show scale, named partners that show legitimacy.

**Layout:** Full-bleed band, `--color-brand-soft` background. Inner container `--container-wide`. Two stacked rows.

**Row A — stats (editorial, NOT hero-metric template):** 4 columns on desktop, 2x2 on mobile. Each cell is *not* a card — just typography on the band.

| Number (display) | Caption (Satoshi 700, sm) | Sub-caption (Satoshi 400, xs, ink-muted) |
|---|---|---|
| 12.300+ | studenti iscritti | da gennaio 2024 |
| 187 | autoscuole partner | in 14 regioni |
| 4,8 / 5 | rating medio | su 2.400 recensioni |
| 96% | esami superati al primo colpo | tra gli iscritti del 2024 |

(Numbers are placeholders. Locale-formatted: Italian uses `.` as thousand sep, `,` as decimal.)

**Row B — sample partners:** A horizontal marquee (auto-scrolling, pauses on hover, respects reduced motion → static instead) of 8 placeholder autoscuola names with a small lucide `Car` icon. Names: *Autoscuola Sprint, Guida Sicura, Veloce Patenti, La Moderna, Drive Master, 4 Ruote Firenze, Patente Express Roma, Autoscuola Adriatica*.

**Eyebrow:** *Non solo parole.* / *Not just words.*

**i18n keys:** `landing.trust.eyebrow`, `.stats.[1..4].number`, `.stats.[1..4].caption`, `.stats.[1..4].subCaption`, `.partners.title`.

**Interactions:** Marquee `transform: translateX(...)` infinite loop. Pause on hover. Reduced-motion: static row, scroll horizontally with overflow-x.

---

### 6. For autoscuole (B2B band)

**Purpose:** Convert school owners browsing the consumer site into partner leads. Visually distinct world.

**Layout:** Full-bleed band with a different visual register: dark-ink background (`--color-ink`), cream text, single Italian-red accent stripe (1px, full-bleed) above and below the band. This is the only place the page goes "dark" — by design — and the only place red gets a structural role.

**Inner layout:** 7/12 left column with text + CTA, 5/12 right column with the product preview.

**Eyebrow (accent):** *Sei un'autoscuola?* / *Are you a driving school?*

**Heading (Satoshi 800, `--text-2xl`, white):**
- IT: *Porta la tua autoscuola nel futuro.*
- EN: *Bring your driving school into the future.*

**Body (`--text-base`, white at 70% opacity, max 56ch):**
- IT: *Gestisci iscrizioni, pagamenti, quiz e prenotazioni guide da un'unica dashboard. Con l'app ti prendi cura del tuo business e dei tuoi studenti dove e quando vuoi. Unisciti a noi! Iscrivi la tua autoscuola e contattaci per attivare la tua prova gratuita.*

**Imagery:** 
- `autoscuola-manager-image.jpg` inside a rounded-3xl container with a subtle border and shadow.
- `verified-autoscuola.png` floating in the top-left corner as a trust badge with a floating animation (`animate-float`).

**CTA:** Primary button, but on dark ground: white fill, ink text. Label: *Diventa partner* / *Become a partner*. Routes to `/partner` placeholder.

**Secondary link:** *Scopri come funziona* / *See how it works* — text link, brand-green color even on dark, lucide `ArrowRight` icon.

**i18n keys:** `landing.b2b.eyebrow`, `.heading`, `.body`, `.cta`, `.linkSecondary`.

---

### 7. FAQ

**Purpose:** Last-mile doubt removal before the final CTA.

**Layout:** Two-column on desktop (5/12 left = sticky heading + intro, 7/12 right = accordion). Mobile collapses to single column with heading on top.

**Left column (sticky on desktop):**
- Eyebrow: *Domande sincere, risposte chiare.* / *Honest questions, clear answers.*
- Heading: *Le cose che ti stai chiedendo.* / *The things you're wondering.*
- Sub-line: *Non hai trovato la tua? [Scrivici](#contact).* / *Didn't find yours? [Contact us](#contact).* (link routes to `#contact` anchor in footer or `/contatti`).

**Right column:** `Accordion` with single-open behavior. Each item's chevron rotates on open (Framer `transform: rotate`). Open transition uses `grid-template-rows` per DESIGN.md.

**Items (8 total):**

| # | Question (IT) | Question (EN) | Answer summary (IT, ≤320 chars) | Answer summary (EN) |
|---|---|---|---|---|
| 1 | Quanto costa iscriversi tramite Patentedigitale.it? | How much does it cost to enrol via Patentedigitale.it? | L'iscrizione è gratis. Paghi solo il prezzo dell'autoscuola che scegli, identico a quello che pagheresti andando direttamente in segreteria. La nostra commissione è a carico dell'autoscuola partner. | Enrolment is free. You pay only the price of the school you choose, identical to what you'd pay walking in. Our fee is on the partner school. |
| 2 | Quali documenti mi servono per iniziare? | What documents do I need to start? | Carta d'identità, codice fiscale, certificato medico (lo carichi dopo aver fatto la visita), una foto tessera digitale. Te li chiediamo uno alla volta, non tutti in una volta. | ID, codice fiscale, medical certificate (uploaded after the visit), one digital ID photo. We ask one at a time, not all at once. |
| 3 | Posso cambiare autoscuola dopo l'iscrizione? | Can I switch schools after enrolling? | Sì. Hai 14 giorni di ripensamento dal primo pagamento, durante i quali puoi annullare e scegliere un'altra autoscuola partner senza costi aggiuntivi. | Yes. You have a 14-day cooling-off period from your first payment, during which you can cancel and choose another partner school at no extra cost. |
| 4 | I miei dati sono al sicuro? | Is my data secure? | Sì. I tuoi dati sono trattati secondo il GDPR, salvati su server europei, cifrati a riposo e in transito. I pagamenti passano da provider certificati PCI-DSS (PayPal, Stripe). | Yes. Your data is GDPR-compliant, stored on European servers, encrypted at rest and in transit. Payments go through PCI-DSS certified providers (PayPal, Stripe). |
| 5 | Se la mia autoscuola non è partner, cosa succede? | What if my preferred school isn't a partner? | Puoi segnalarcela: la contattiamo entro 7 giorni e le proponiamo l'adesione. Nel frattempo, ti suggeriamo le 3 partner più vicine. | You can flag it: we'll contact them within 7 days and propose joining. In the meantime, we suggest the 3 closest partner schools. |
| 6 | Funziona se non sono italiano? | Does it work if I'm not Italian? | Sì. Il sito è disponibile in italiano e inglese, e supportiamo l'iscrizione di residenti stranieri con permesso di soggiorno valido o cittadinanza UE. | Yes. The site is available in Italian and English, and we support enrolment for foreign residents with a valid permit or EU citizenship. |
| 7 | Posso pagare a rate? | Can I pay in instalments? | Sì, su richiesta. Le autoscuole partner offrono piani in 3 o 6 rate senza interessi tramite Klarna o Scalapay, dove disponibile. | Yes, on request. Partner schools offer 3- or 6-instalment plans with no interest via Klarna or Scalapay, where available. |
| 8 | Quanto tempo ci vuole per prendere la patente? | How long does it take to get the licence? | Mediamente 3–4 mesi dall'iscrizione all'esame pratico. Con il nostro sistema di prenotazione guide, gli iscritti del 2024 hanno ridotto questo tempo del 22%. | On average 3–4 months from enrolment to practical test. With our lesson booking system, 2024 students cut this time by 22%. |

**i18n keys:** `landing.faq.eyebrow`, `.heading`, `.subline`, `.items.[1..8].q`, `.items.[1..8].a`. Markdown allowed in answers (links).

---

### 8. Testimonials

**Purpose:** Human voices, three audience flavors. NOT corporate stock testimonials.

**Layout:** Three columns on desktop, swipeable carousel on mobile (swipe via Embla or similar). Each cell is a small portrait photo (square, `--radius-md`, 88px), a quote in Boska italic at `--text-md`, and a name + role line beneath in Satoshi 400 sm.

**Eyebrow:** *Voci dalla strada.* / *Voices from the road.*

**Items:**

| # | Persona | Quote (IT) | Quote (EN) | Name & role (IT) | Image search |
|---|---|---|---|---|---|
| 1 | Teen | "L'ho fatta tutta dal letto, in pigiama, in mezz'ora. Mia madre non ci credeva." | "I did the whole thing from bed, in pyjamas, in half an hour. My mum couldn't believe it." | Sofia, 18 — Milano | "young woman smiling phone candid" |
| 2 | Parent | "Ho potuto pagare io, ma è stato lui a fare tutto. Per la prima volta non sono dovuta andare in segreteria." | "I paid, but he did everything. First time I didn't have to go to the school office." | Cristina, 47 — Bologna | "italian mother smiling portrait" |
| 3 | Intl | "I switched my Romanian licence to an Italian one without speaking Italian once. The English support saved me." | "Ho convertito la mia patente romena senza parlare una parola di italiano. Il supporto in inglese mi ha salvato." | Andrei, 29 — Roma | "young professional man smiling candid" |

**i18n keys:** `landing.testimonials.eyebrow`, `.items.[1..3].quote`, `.items.[1..3].name`, `.items.[1..3].imageAlt`.

---

### 9. Final CTA band

**Purpose:** Last conversion push before the footer.

**Layout:** Full-bleed band, `--color-brand` solid background, cream text. Tall (`--space-10` vertical). Centered single-column inside the container — this is the ONE centered-stack on the page; everywhere else is asymmetric.

**Heading (Satoshi 800, `--text-3xl`, cream):**
- IT: *Pronto a guidare?*
- EN: *Ready to drive?*

**Sub (`--text-md`, cream at 80% opacity, max 48ch):**
- IT: *Trova la tua autoscuola in 30 secondi. Senza account, senza email, senza impegno.*
- EN: *Find your driving school in 30 seconds. No account, no email, no commitment.*

**CTA:** Primary button on cream, brand-ink text + brand-fill on hover-invert. Label: *Trova autoscuola* + lucide `MapPin`.

**Decorative:** Mascot (third and final appearance) at 96px, top-right corner of the band, slightly tilted (-6deg), peeking out — reinforces the "warm" personality at the moment of conversion.

**i18n keys:** `landing.finalCta.heading`, `.subhead`, `.cta`.

---

### 10. Footer

**Purpose:** Reassurance + legal + secondary navigation. The "boring but essential" surface.

**Layout:** 4-column on desktop (brand+description, navigate, legal, social), 2-column on tablet, single-column on mobile. `--color-bg-sunken` background, `--space-9` vertical padding, hairline `--color-line` top border.

**Column 1 — Brand:** Mascot (40px) + wordmark, then a 2-line description:
- IT: *La piattaforma che digitalizza le autoscuole italiane. Studenti, scuole, segreteria — tutto online.*
- EN: *The platform digitalising Italian driving schools. Students, schools, admin — all online.*

**Column 2 — Naviga / Navigate:** Links — *Come funziona, Trova autoscuola, FAQ, Per le autoscuole, Accedi*.

**Column 3 — Legale / Legal:** Links — *Privacy policy, Termini di servizio, Cookie policy, P.IVA: 12345678901, Sede: Via Esempio 12, Milano*.

**Column 4 — Seguici / Follow us:** Three social icon buttons (Instagram, TikTok, Facebook) using lucide; placeholder handles `@patentedigitale_it` etc. Then language switch (duplicate of nav, here as a secondary access point).

**Bottom strip:** `© 2026 Patentedigitale.it · Tutti i diritti riservati.` left-aligned. `Made with ♥ in Italia` right-aligned (the only place we permit a heart glyph; replace if anti-emoji rule extended).

**i18n keys:** `landing.footer.brandDescription`, `.nav.[*]`, `.legal.[*]`, `.social.[ig|tt|fb].handle`, `.bottomLeft`, `.bottomRight`.

---

## Key states (across all sections)

| State | Where it appears | Behavior |
|---|---|---|
| Default | Every section | Renders as specced. |
| Loading | None on landing v1 | All copy is static. (Backend integrations come later.) |
| Empty | None on landing v1 | All counts and lists are placeholders. |
| Error | Form-shaped CTAs (404 routes for `/cerca`, `/iscrizione`, `/partner`) | Placeholder pages render an inline `Alert` saying *"Stiamo costruendo questa pagina. Torna presto."* / *"We're building this page. Check back soon."* with a back-to-home link. |
| Reduced motion | Every animated section | All Framer animations degrade to opacity-only or instant per DESIGN.md. |
| Locale switch | Whole page | Language switch updates `i18next` locale, `<html lang>`, and forces a soft re-render. URL gains `?lang=en` or path-prefix `/en` (implementer's call; recommend path prefix for SEO). |
| Keyboard navigation | Whole page | Visible focus rings (`--color-focus-ring`) on every interactive element. Tab order matches reading order. Skip-to-main link at the very top. |

## Interaction model

- **Primary CTA** (*Trova autoscuola*): routes to `/cerca` (placeholder page in v1).
- **Secondary CTA in hero** (*Come funziona*): smooth-scrolls to `#how-it-works` section.
- **B2B CTA** (*Diventa partner*): routes to `/partner` (placeholder).
- **Language switch:** updates locale, persists in `localStorage` (`pd:locale`), updates URL.
- **Sign-in button:** routes to `/accedi` (placeholder, login form scaffolded but no backend).
- **FAQ accordion:** single-open. Click on closed → opens with chevron rotation. Click on open → closes.
- **Testimonial carousel (mobile):** swipeable via touch + arrow buttons. No auto-advance.
- **Trust band marquee:** auto-scroll at 40px/s, pause on hover, static for reduced-motion.
- **Mobile nav drawer:** opens via hamburger, closes via close-icon, escape key, or backdrop click. Traps focus while open.

## Content requirements (summary)

All copy in this document is the v1 source of truth. Sub-agents transcribe verbatim into `web/src/locales/it.json` and `web/src/locales/en.json`. Italian is the default; English keys must exist for every Italian key. Pluralization keys use ICU MessageFormat where counts vary.

Numerical placeholders flagged with `// TODO: replace with real metric` JSON comment when the data exists.

Imagery alt-text is part of the locale, NOT the component prop.

## Recommended impeccable references for implementation

When subagents hit a specific question during build, point them at:

- `reference/spatial-design.md` — for the alternating-row layout (section 4) and the diagonal step layout (section 3).
- `reference/motion-design.md` — for the hero entrance choreography, scroll reveals, and reduced-motion.
- `reference/interaction-design.md` — for the FAQ accordion, mobile carousel, and form-shaped placeholder pages.
- `reference/brand.md` — already loaded; the page lives in this register and any judgment call defers to it.
- `reference/animate.md` — for marquee implementation specifics.

## Open questions for implementation

These are deferred to the implementer; resolve with a one-line note in the PR.

1. **Hero mascot extraction.** `nuovo-banner.png` already contains the headline text inside the image. Does the implementer crop the mascot out (preferred) or fall back to `logo.jpg` against a custom illustrated road backdrop (acceptable)?
2. **Locale routing.** Path-prefix (`/en/...`) recommended for SEO; query string (`?lang=en`) is simpler. Pick one.
3. **Testimonial carousel library.** Embla Carousel React is the recommended pick (lightweight, headless, accessible). Approve before installing.
4. **Marquee library.** Plain CSS `@keyframes translateX` works for the trust band; if reduced-motion handling gets gnarly, fall back to `react-fast-marquee`.
5. **Analytics.** Out of scope for v1, but include a `<script>` placeholder slot in the document head with a comment marker.
6. **Open Graph / SEO.** Add `<title>`, `<meta description>`, OG image, Twitter card. OG image can be a static export of the hero (designed in v1.1).

## Acceptance criteria

The landing page ships when ALL of the following are true. Subagents verify each item before marking the task complete.

- [ ] Lighthouse mobile score ≥ 95 on Performance, Accessibility, Best Practices, SEO.
- [ ] Page loads (LCP) under 2s on a throttled 4G connection.
- [ ] All 10 sections render at every breakpoint from 320px to 1920px without horizontal scroll.
- [ ] Italian and English locales both render every string with no missing-key fallbacks.
- [ ] Language switch persists across navigation.
- [ ] All interactive elements have visible focus rings; tab order matches reading order.
- [ ] All animations respect `prefers-reduced-motion: reduce`.
- [ ] No FontAwesome anywhere; all icons via lucide-react.
- [ ] No raw hex colors in components; all colors via tokens.
- [ ] No "click here", no em dashes, no kindergarten language; voice rules from PRODUCT.md respected.
- [ ] Mascot images (`logo.jpg`, `nuovo-banner.png`) copied verbatim from `/patente-digitale/` to `/web/src/assets/mascot/` with no modifications.
- [ ] Vercel deploy succeeds on the `main` branch with a custom domain placeholder configured.
- [ ] PRODUCT.md and DESIGN.md cited in PR description.
