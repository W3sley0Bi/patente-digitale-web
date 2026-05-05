# Product

## Register

brand

## Users

Three primary personas, in priority order.

**1. Italian teen, 17–19 (primary)** — first patente B (car license). Mobile-first. Anxious about exam, allergic to bureaucracy, used to friction-free apps (Instagram, TikTok, food delivery, Revolut). Reaches the site after a Google search like *"come prendere la patente"* or via TikTok/Instagram referral. Wants the autoscuola decision in under 5 minutes and to brag to friends about how easy it was.

**2. Parent payer, 40–55 (co-decider, often the wallet)** — paying for their kid's patente, less mobile-fluent, wants reassurance that money + data are safe and the autoscuola is reputable. Visits on desktop. Will scroll for trust signals (real autoscuole, transparent pricing, real reviews, contact info, P.IVA, privacy).

**3. International student / worker, 20–35 (secondary, growing)** — converting a foreign license, taking patente from scratch in Italy, or assisting a relative. Italian B1–B2 at best. Needs the experience available in English from the very first paint. Heavy reliance on the language switcher in the nav.

The job-to-be-done across all three: *"Find the right autoscuola near me, enroll without standing in a segreteria queue, pay safely, and stop thinking about it."*

## Product Purpose

Patentedigitale.it is the consumer entry point of an Italian autoscuola digitalization platform. The landing page exists to:

1. **Convert** — drive *Trova autoscuola* searches and *Iscrizione* starts.
2. **Reassure** — establish that this is a serious operator (real partner network, transparent process, secure payments) and not a sketchy intermediary.
3. **Educate** — explain in three beats how the platform works (search, enroll, study) so visitors understand the value before they touch a form.
4. **Recruit B2B** — convert autoscuole owners browsing the site into partner leads.

Success looks like: high CTR on *Trova autoscuola*, a non-trivial *Sei un'autoscuola?* lead rate, and bounce-rate parity with category leaders despite Italian-flag-derived branding (which historically reads as gov-slop).

## Brand Personality

Three words: **trustworthy, warm, modern**.

- **Trustworthy** beats playful. The site moves money and personal data (codice fiscale, residence, payment). Visual register must read "regulated and safe" before "fun".
- **Warm** beats clinical. Italian audience expects human signal — a face, a voice, a bit of color and humor. Fully sterile reads as cold and foreign.
- **Modern** beats default. The whole pitch is *not the bureaucratic past*. Every visual choice should feel "next generation of Italian web" — comparable to Satispay, Lottomatica's recent redesign, Carrefour Italia's latest ecommerce — not government portals or pre-2018 SaaS.

The mascot (smiling green car with an orange backpack) stays as-is and is the warmth lever. It does not need to scream from the hero; it earns its keep as a recurring spot illustration that humanizes an otherwise utility-grade product.

Voice in copy: short, direct, second-person ("tu", not "voi"), zero corporatese, zero exclamation marks except in the FAQ. No em dashes anywhere.

## Anti-references

The user did not name explicit anti-references. The following are derived from the brief and the impeccable shared bans, and apply to every implementation pass:

- **Generic SaaS landing template** — purple gradient hero, three identical icon-heading-subtitle cards, "trusted by" logo wall, hero metric cluster. The "AI-made-that" failure mode.
- **Italian government portal aesthetic** — drab navy, Times-style serif, table-of-contents-as-homepage, dense text blocks. The exact thing this product exists to replace.
- **Disney-kid cartoon site** — even though the mascot stays, the surrounding design must NOT lean kindergarten. No Comic-Sans-adjacent fonts, no rainbow palettes, no oversized rounded everything, no eight-year-old illustration style around the mascot.
- **Editorial-magazine landing** — display-italic serif headlines, ruled columns, drop caps, monochrome restraint. Wrong register for a "find an autoscuola fast" job.
- **Crypto / web3 neon-on-black** — high contrast neon, glassmorphism, geometric mascots-as-avatars. Wrong audience entirely.

## Design Principles

1. **Trust before delight.** Every section earns trust first (real partners, transparent steps, contactable humans, secure payments) and adds personality second. If a delight moment threatens the trust read, the delight loses.
2. **Mobile is the canvas.** ~70% of teens land on phone. Designed mobile-first; desktop is the reassurance surface for parents and is laid out second.
3. **Show the path, not the brochure.** A visitor must understand *Cerca → Iscriviti → Studia* within one fold of scroll. No hero that withholds the value proposition.
4. **Italian, but globally legible.** All copy is i18n-keyed from day one (IT default, EN ready). Visual language uses Italian flag colors *as accent system*, never as a literal tricolor stripe — the global audience must not be alienated.
5. **One mascot, used like punctuation.** The car appears in the hero (already designed), then twice more across the page as small spot illustrations that mark transitions. It never appears inside cards, never sized below 48px, never re-stylized.

## Accessibility & Inclusion

- **WCAG 2.2 AA target** at minimum across every shipped surface.
- **Color contrast** — no green-on-white CTA below 4.5:1. Brand green tokens are tuned in DESIGN.md to pass on cream and white backgrounds.
- **Reduced motion** — every Framer Motion animation respects `prefers-reduced-motion: reduce` and degrades to opacity-only transitions or no transition at all.
- **Color blindness** — green and red (Italian flag accent system) are never the *only* signal for state. Always paired with an icon, label, or shape.
- **Keyboard** — full keyboard navigation, visible focus rings (custom-toned to brand green, not browser-default blue).
- **Screen readers** — semantic HTML, all images alt-texted in the active locale, lucide icons marked `aria-hidden` when decorative.
- **Localization** — IT and EN at launch, structure ready for ES / DE / FR / RO (the largest non-IT communities in Italy).
- **Form-fillable** — all inputs labeled, error messages descriptive in the user's language, autocomplete attributes set for codice fiscale, address, payment.
