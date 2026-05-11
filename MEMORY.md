# MEMORY.md

Living context document for `patente-digitale-web`. Captures goals, priorities, decisions, and open questions that are NOT obvious from PRODUCT.md / DESIGN.md / STACK.md / README.md.

Update this file whenever a decision is made, a priority shifts, or context changes.

---

## 1. Mission (north star)

Become the consumer entry point for Italian autoscuola digitalization: a directory + onboarding layer that turns the bureaucratic "find a driving school + enroll + study" path into a 5-minute mobile flow.

Two-sided product:
- **Students** — search, compare, enroll, study (quiz).
- **Autoscuole (driving schools)** — claim listing, manage profile, receive student leads.

Trust is the brand promise. Italian flag accents only as accent system. Mascot = warmth lever.

---

## 2. Current top priorities (ordered)

### P0 — School data model + low-friction onboarding (ACTIVE)

The single most important question right now:

> How do we design the school profile schema AND the onboarding UX so that real autoscuole owners actually fill in their data without friction?

**Strategic frame (decided 2026-05-10):**

The map dataset (built from scraped Google Maps API → static GeoJSON) is just *showcase*. Showing points + public data offers the same value Google Maps already does — no reason to trust us. **The differentiator is the enriched profile only the owner can provide:** photos, exact pricing per license type, estimation of time-to-license, vehicle fleet, instructor info, etc.

So the funnel is:
1. **Public dataset (low value)** → owner notices their school is listed
2. **Claim** → owner becomes a verified user
3. **Enrichment** → owner adds the info that makes the listing useful for students
4. **Trust signal** → "verified" badge, full data, photos = the moat vs Google Maps

Two coupled problems:

1. **What fields to collect.** Today `claimed_schools` only has basic contact + untyped JSONB for `licenses` and `prices`. The PDF wishlist (pages 6–7 of `Documento senza titolo (1).pdf`) lists ~50 candidate fields. Need to decide MUST-have for v1 vs nice-to-have vs out-of-scope. Held off until data modeling session.
2. **How to ask for them.** Long forms kill conversion. Need progressive disclosure, smart defaults, "claim now, fill later" pattern. Today the form is a single dense page.

Goal: maximize the % of claimed schools that complete a "rich enough" profile to be useful to students.

### P1 — Admin dashboard for incoming claim requests

Currently `pending_claims` rows accumulate with no review UI. "Richiesta in revisione → e mo?" is the symptom. Phase 1 SQL is already drafted in README.md (admin role, RLS policies, `approve_claim` RPC). Phase 2 is the `/admin/dashboard` UI.

Blocked? No — can be done in parallel with P0 once data model stabilizes (admin needs to see the same fields).

### P2 — Real review system

Replace placeholder testimonials ("Sofia, 18 — Milano") with a custom review system. Reviews stored in Supabase (NOT Google Places).

Open: who can review? (only logged-in students who claimed enrollment? open?), moderation flow, schema, abuse prevention.

### P3 — Misc UX bugs (most already fixed)

- ✅ Auth magic-link redirect to homepage — **fixed**.
- ✅ Claim data leakage via stale `localStorage` — **fixed**.
- ⏸ Geocoder fails on small towns (e.g. San Francesco al Campo) — defer, discuss later.
- ❌ NOT a bug — "Scrivici" link not opening in Chrome was the user's local Chrome (popup blocker / adblocker), not a code issue.
- 🟡 Mobile auth menu (avatar tap, "Accedi" visibility) — open per README.md "Known Issues".
- 🟡 City search opens map but doesn't auto-select typed city — open.
- 🟡 Missing little car icon in hero — open.
- 🟡 "Perché digitale" copy too vague — open.
- 🟡 "Sito web" field should be optional (or "non ho un sito" checkbox) — open.

### Backlog (very low priority, roadmap only)

- **Student enrollment flow.** Defer until we have many claimed schools AND the directory business is validated. Today `/iscrizione` is placeholder by design.
- **Quiz Online.** Placeholder route exists. Roadmap item, not active work.
- **ES / FR localization.** Last roadmap point. Today ships IT / EN / AR. Do NOT add Spanish or French now.
- **Dataset upgrade (Google Places vs MIT FOIA).** Discussed in README. Use OSM + claim 4848 as the official count for now.

---

## 3. Source of truth: dataset numbers

- Map base data: OpenStreetMap via Overpass (~1375 records actually rendered).
- Public-facing claim: **"4848 autoscuole"** (positioned as the official figure).
- Discrepancy is known and accepted for now. MIT FOIA / Google Places is the long-term fix, not the current fix.

---

## 4. Personas (recap, see PRODUCT.md for detail)

1. Italian teen 17–19 — primary, mobile-first, friction-allergic.
2. Parent payer 40–55 — co-decider, desktop, trust-driven.
3. International student/worker 20–35 — secondary, needs EN, growing.

The job-to-be-done across all three: *"Find the right autoscuola near me, enroll without queueing, pay safely, stop thinking about it."*

---

## 5. Canonical claim flows (recap, see README.md for detail)

| Flow | Persona | Trigger | Outcome |
|------|---------|---------|---------|
| **0** | Student | Signup as student | Approved immediately |
| **1** | Autoscuola — auto-claim | DB match + website + matching `@domain` email | RPC `claim_school_via_domain`, approved automatically |
| **2** | Autoscuola — manual, in DB | DB match, no website OR no domain email | `pending_claims` row → admin review |
| **3** | Autoscuola — manual, not in DB | School absent from DB | `pending_claims` row (no `place_id`) → admin review |

Flows 2 + 3 are the bottleneck on P1 admin dashboard.

---

## 6. Database state (Supabase, project `dodwkggrwlydimlbmvgk`)

Schema lives in `supabase/migrations/001_initial_schema.sql`.

| Table | Rows (snapshot 2026-05-10) | Notes |
|-------|----------------------------|-------|
| `profiles` | 4 | `role` ∈ {`student`, `autoscuola`}. `admin` role NOT yet added. |
| `pending_claims` | 2 | All flows 2 + 3 land here. No admin review UI yet. |
| `driving_schools` *(was `claimed_schools` pre-002)* | 0 | Empty — no claim has been approved end-to-end. `licenses` and `prices` are untyped JSONB. To be renamed + extended in `002_data_model_v1.sql`. |

Missing tables (per current roadmap):
- `reviews` — to be designed (P2).
- Any enrollment / lead table — deferred (backlog).
- Any quiz schema — deferred (backlog).

---

## 7. Stack (locked, see STACK.md)

React 19 + Vite + TypeScript (strict) + Tailwind v4 + shadcn/ui + Base UI + Framer Motion + react-i18next + react-router 7 + Leaflet + Supabase + Biome + pnpm. Hosted on Vercel.

Banned: ESLint+Prettier (use Biome), CSS-in-JS, FontAwesome, date libs (use `Intl`), competing UI kits (Mantine/MUI/Chakra).

---

## 8. Open questions / unresolved

- **What is `3a40132`?** Mystery code surfacing in the search/city UI per the PDF. Origin unknown — could be a stale test row, an autocomplete artifact, a CAP-shaped string. To investigate when we touch search.
- **Reviews access control.** Who is allowed to write a review? Only students who can prove enrollment, or anyone authenticated? TBD.
- **Geocoder.** OSM Nominatim fails on small Italian towns. Switch geocoder, fall back to manual `lat`/`lng` pin, or provide CAP-only? Defer.
- **Profile field set — full data modeling session pending.** 3-tier sketch agreed in principle (Tier 1: name, address, phone, hours, license types; Tier 2: pricing, payment methods, languages, vehicles, time-to-license; Tier 3: instructors, pass rates, services, accessibility). Photos optional even at Tier 1. License types are already populated in the GeoJSON. Schedule a dedicated session to lock the schema, JSONB shapes for `licenses` and `prices`, completion-meter weights, and how multi-instructor / multi-vehicle records are stored.
- **Onboarding UX shape = pattern (c).** Minimum claim → dashboard → progressive completion cards + multi-channel nudges (no-reply email, in-app notifications, in-app mailbox). Implementation TBD.
- **Student ↔ school messaging — future, low priority.** Two candidate shapes: (a) verified schools surface a WhatsApp Business number on their profile; (b) limited p2p in-app messaging with 48h auto-delete and no message persistence. Constraint: Supabase-only backend, infra cost ~0. Pick when feature becomes priority.
- **Privacy / Terms / Cookie pages.** Need legal text, not just a layout. Who drafts?
- **Partners / "Iscrivi la tua autoscuola" / "Scopri come funziona" landing pages.** Mockups in PDF — designed but not built.
- **Owner incentive — Founding Partner program (DECIDED in principle, details TBD):**
  - Free profile forever (when paid subscriptions launch)
  - "Founding Partner" badge on the listing
  - Free access to beta features as they ship
  - Case study / interview published on the site
  - Eligibility: ≥80% profile completion (the gamification gate)
  - Cap: **uncapped**, time-boxed (window TBD)
  - **Open:** the time-box deadline, copy of the email pitch.
- **Outreach channel sequence (proposed, TBD):**
  - PoliTo student-led framing for credibility in the email
  - Consorzio delle Autoscuole for institutional endorsement / bulk reach
  - Direct cold email using contacts extracted from the GeoJSON `website` field (visit website → grab email)
  - Order, ownership, and copy still to define.
- **Verification automation.** Today verification is fully manual. Need a plan for automation:
  - P.IVA → Camera di Commercio API check (does an open API exist? cost?)
  - Email domain matching against website domain (already used in Flow 1)
  - Government/MIT registry cross-check (ties to MIT FOIA item)
  - Until automated: admin dashboard (P1) is the human bottleneck.
- **Google Maps ToS exposure.** The current GeoJSON was built by scraping Google Maps API. README.md flags the legal risk (Google ToS §3.2.3 prohibits storing Places data > 30 days or building an offline dataset). Open: do we migrate the dataset to OSM-only / MIT-sourced before going public, or accept the risk during private-beta? Decision needed.
- **First target cohort for outreach.** Which schools do we contact first? Torino (proximity + PoliTo angle), Milano (volume), or Consorzio members (bulk channel)?
- **Existing outreach asset.** Is there an email list / contact channel to schools already, or does outreach start cold?

---

## 9. Decision log

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-10 | Skip ES + FR for now; keep IT / EN / AR | Low ROI vs P0 work; revisit when partner network is national |
| 2026-05-10 | Review system = custom (Supabase), not Google Places | Avoids Google ToS limits; full control over moderation |
| 2026-05-10 | Student enrollment flow = backlog, not active | Premature until directory is validated and full of schools |
| 2026-05-10 | Public count = 4848 autoscuole | Treated as the official market size |
| 2026-05-10 | Quiz Online = placeholder, low priority | Need directory + claims to work first |
| 2026-05-10 | Reviews = custom Supabase, not Google Places | Full control over moderation + abuse prevention |
| 2026-05-10 | Map dataset = scraped Google Maps → static GeoJSON (showcase only) | Fast first paint; the moat is owner-enriched data, not the dataset itself |
| 2026-05-10 | Verification = manual (admin reviews claim) for now | Automate later (P.IVA / Camera di Commercio / domain match) |
| 2026-05-10 | Revenue model v1 = commission on enrollment | Subscription SKU comes later, gated on shipping value-add services |
| 2026-05-10 | Google Maps ToS = accepted risk during private/early phase | Bet: by the time Google notices, dataset is rebuilt via owner claims (data is then user-contributed, not scraped) |
| 2026-05-10 | Founding Partner package defined | Status + scarcity lever for early owner claims |
| 2026-05-10 | Onboarding shape = pattern (c): minimum claim → dashboard → progressive completion | Friction-minimum; lets owner finish later; powers completion-meter UI |
| 2026-05-10 | Tier 1 MVP fields: name, address, phone, opening hours, license types | Price moved to Tier 2; photos optional in Tier 1 |
| 2026-05-10 | Verification API research = NOT now | Manual review via admin dashboard until claim volume justifies it |
| 2026-05-10 | Outreach contacts source = emails extracted from school websites (already in GeoJSON) | Cold list available without buying / scraping anew |
| 2026-05-10 | License types ALREADY in GeoJSON | Manually added by us during dataset prep — survives a Google ToS rebuild |
| 2026-05-10 | Gating model = gamify, Founding badge at ≥80% completion | Forces enrichment without blocking claim |
| 2026-05-10 | Founding Partner = uncapped, time-boxed (window TBD) | IT market has only ~8–9k schools total; per-region or per-100 cap would torch early-adopter revenue, since early adopters are likely the willing payers |
| 2026-05-10 | Google ToS = parked, not a priority concern right now | Revisit only when traction or press exposure makes it material |
| 2026-05-10 | Outreach to public `info@` / `segreteria@` = acceptable | B2B legitimate-interest defensible; opt-out in first email; don't persist as marketing DB unless replied |
| 2026-05-10 | Push-to-completion via no-reply email + in-app notifications + in-app mailbox | Multi-channel nudge so owner returns to finish profile |
| 2026-05-10 | Student–school messaging = future, p2p style with 48h auto-delete OR public WhatsApp Business number | Keep infra cost near zero (Supabase only); avoid storing conversation data; not a priority |
| 2026-05-10 | "Iscriviti" CTA gated to paying schools (commission deal or paid sub) | Aligns enrollment flow with revenue model |
| 2026-05-11 | Normalize licenses + vehicles to child tables (`school_licenses`, `school_vehicles`); drop JSONB `prices` / `vehicles` / `time_to_license` on `claimed_schools` | Per-license price/time is the #1 student filter axis; JSONB-keyed is painful to index. Consistency: vehicles follow same pattern, enabling "has automatic / electric" filters. |
| 2026-05-11 | Drop `school_instructors` from v1 | Low priority; re-add when product needs it |
| 2026-05-11 | Photos = Supabase Storage (not Postgres `bytea`); R2 as growth path | bytea in Postgres bloats backups, no CDN, slow. Supabase Storage is RLS-aware + free 1 GB. R2 wins at scale (zero egress). |
| 2026-05-11 | Drop `notifications` table from v1 | Dashboard banners + transactional email cover all v1 nudge cases. Reintroduce only when ≥3 in-app event kinds need persistent read-state. |
| 2026-05-11 | 1 owner → MANY schools is supported (no schema change); dashboard needs school-picker | Franchise/chain case is real. `claimed_schools.user_id` FK already M:1. UI assumption "one school per dashboard" is the only thing that needs updating. |
| 2026-05-11 | Student enrollment relationship NOT modeled in v1.1 | Stays in backlog. When built: 1 student → ≤1 *active* enrollment, history allowed. Don't pre-add table. |
| 2026-05-11 | Rename `claimed_schools` → `driving_schools` (DB + code) | Original name implied state ("claimed"); new name names the entity. Folded into `002_data_model_v1.sql` since 002 hasn't shipped — single migration, no transition state. RPC `claim_school_via_domain` → `claim_driving_school_via_domain` for consistency. |
| 2026-05-11 | Services → normalized `school_services` table (was `text[]` on `driving_schools`) | Per-service active toggle + price + future offer windows. Pure-tag arrays (`payment_methods`, `languages_spoken`, `documents_required`, `instructor_specializations`) stay as `text[]` because they have no per-item state. |
| 2026-05-11 | Add PDF-wishlist gap fields | After full recap: `mobile`, `fiscal_code`, `proprietary_app`, `instructor_count`, `has_female_instructor`, `instructor_specializations`, `avg_exam_wait_days` on `driving_schools`; `automatic_available`, `insurance_included` on `school_licenses`; service codes extended with `cap`, `lezioni_individuali`, `lezioni_di_gruppo`. |
| 2026-05-11 | Skip "numero studenti attivi" + Google rating import | Private + gameable signal; Google rating needs Places API call per render. Document as future options. |
| 2026-05-11 | Drop `payment_methods` from `driving_schools` | Premature signal; few students filter on this at first contact. Re-add when conversion data justifies it. |
| 2026-05-11 | `languages_spoken` is a constrained enum at the DB layer | Check constraint `<@ array['it','en','fr','es','ar','ro','de','sq','zh','ru']`. Adding a new code = migration + UI update. Completion weight bumped 4→8 to reflect priority. |
| 2026-05-11 | Money columns = `float8`, NOT integer cents | User preference for simplicity. `_cents` suffix removed everywhere. Trade-off accepted: float math drifts at the 13th decimal; UI must round to 2 decimals at render time (use `Intl.NumberFormat('it-IT', currency)`). Commission / sum logic must apply explicit rounding policy. |
| 2026-05-11 | Drop `currency` column everywhere | EUR-only product for the foreseeable future. Re-add only if/when a non-EUR market opens. |
| 2026-05-11 | Rename `school_licenses` → `driving_licences` (British spelling) | Matches column `licence_code`; reads naturally as the entity name. Variables in code should track the same convention. |
| 2026-05-11 | Drastically simplify `driving_licences` | Only `id, school_id, licence_code, price, timestamps`. All Tier 2 detail (theory/practice split, lesson counts, time-to-licence, automatic_available, insurance_included, what_is_included) deferred to v2. Re-add when product asks for per-licence comparisons. |
| 2026-05-11 | Connect `school_vehicles.licence_id` → `driving_licences.id` (FK, on delete set null) | 1 licence : many vehicles. Lets us answer "automatic available for B?" via JOIN, no per-licence flag. |
| 2026-05-11 | Drop `school_services` for now | Service catalog not a priority before claimed schools exist. Reintroduce when offering catalog matters. |
| 2026-05-11 | Introduce `school_memberships` (student ↔ school, status `pending|accepted|rejected|cancelled`) | Lightweight enrollment without payment. Gates reviews to verified attendees. Foundation for future paid-enrollment flow — same table extends with payment fields. |
| 2026-05-11 | Reviews FK'd to `school_memberships`; trigger enforces accepted status + author/school match | Replaces old `unique(school_id, author_id)`. Hard guarantee: no review without a real, accepted membership. |
| 2026-05-11 | School memberships are invitation-only in v1 (`membership_invitations` + `redeem_membership_invitation` RPC) | Avoids the "is this enrollment?" confusion. School opts students in via code/link shared out-of-band. Self-request flow may be re-enabled later (status `pending` already reserved). |
| 2026-05-11 | Role-enforcement triggers on `driving_schools.user_id` and `school_memberships.student_id` (Option A) | Hard SQL gate: school owner must be `autoscuola\|admin`; member must be `student`. Catches UI/RLS holes by failing at insert. |
| 2026-05-11 | **v2.0 simplification pass.** Dropped `reviews`, `school_memberships`, `membership_invitations` for v1 — no UI surface yet, value unclear without it. Re-add together when the enrolled-student surface ships. | Keeps v1 focused on the actual P0: school-data enrichment. |
| 2026-05-11 | Merge `pending_claims` into `driving_schools` via `status` column | One row per school across its whole lifecycle. Approval = `UPDATE`, not row move. `place_id` uniqueness becomes partial — only on `status='accepted'`. RLS public-read filters by status. Migration copies existing pending_claims rows into driving_schools then drops the table. |
| 2026-05-11 | Drop the student-role trigger | No `school_memberships` table any more, so nothing to gate. Owner-role trigger stays. |

---

## 10. Data model v1 — summary

Full spec: [`docs/data-model.md`](docs/data-model.md). Static visual: [`docs/er-diagram.html`](docs/er-diagram.html). Interactive draggable: [`docs/er-diagram-interactive.html`](docs/er-diagram-interactive.html).

**Tables (v2.0 — simplified, 2026-05-11):**
- `profiles` — existing; add `admin` to `role` check.
- `driving_schools` — renamed from `claimed_schools`. **Merges in the old `pending_claims` table via a `status ∈ {pending, accepted, rejected}` column** + `claim_notes` + `decided_at` + `decided_by`. PDF gap-analysis additions: `mobile`, `fiscal_code`, `proprietary_app`, `instructor_count`, `has_female_instructor`, `instructor_specializations`, `avg_exam_wait_days`. Public RLS read = `where status='accepted'`. `place_id` unique partial-indexed where status='accepted'.
- `driving_licences` — NEW child. `(id, school_id, licence_code, price float8, timestamps)`.
- `school_vehicles` — NEW child. FK-connected to `driving_licences` via `licence_id`. Filterable on `category` / `transmission` / `fuel`.
- `school_photos` — NEW child, 5-photo cap. Bytes in **Supabase Storage** (NOT Postgres `bytea`). Growth path: Cloudflare R2.
- `school_completion` — VIEW. Founding Partner gate `≥80 AND verified`.

**Dropped from v1.x:** `pending_claims` (folded into `driving_schools.status`), `reviews`, `school_memberships`, `membership_invitations`, `school_services`, `school_instructors`, `notifications`, `payment_methods` column.

**RPCs:** `claim_driving_school_via_domain` (renamed), `approve_claim(p_school_id)`, `reject_claim(p_school_id, p_reason)`. The two claim-decision RPCs flip status on the same row — no row-moving.

**v2.0 shipped:** Migration `supabase/migrations/002_data_model_v1.sql` written + 7 source files updated (rename + status-merge). Zero residual references to `claimed_schools` / `pending_claims` / `claim_school_via_domain` in `src/` or `scripts/`. `pnpm tsc --noEmit` clean.

**Follow-ups deliberately left for later (surgical-only rule):**
1. `ClaimForm.tsx` — `fullName` input is still collected and validated but no longer written anywhere (pending_claims used to hold it). The value should be propagated to `profiles.full_name` for the current user on submit. Out of scope for the rename; flag for a follow-up task.
2. `DrivingSchoolDashboard.tsx` — `claim?.status === "rejected"` branch is unreachable because `fetchClaim` filters `status='pending'`. Pre-existing dead code (was unreachable in the old `pending_claims` world too). Decide: either widen the filter to `.in("status", ["pending","rejected"])` so rejected claims surface for the owner, or delete the dead branch.
3. `SchoolEditor.tsx` — the upsert still writes a `licenses` field on the school row, but in v2.0 that data belongs in the `driving_licences` child table. Refactor the editor to write child rows when product needs per-licence pricing UI.

**Cardinality invariants (see `docs/data-model.md` §9):**
- 1 owner → MANY schools — already supported by `driving_schools.user_id` FK. Franchise/chain case works. Dashboard needs a multi-school picker when an owner has ≥2 rows; flag for `DrivingSchoolDashboard.tsx`.
- 1 student → 0..1 ACTIVE `school_memberships` — enforced by partial unique index `where status in ('pending','accepted')`. Historical rejected/cancelled rows accumulate freely.
- 1 `school_memberships` → 0..1 `reviews` — enforced by `unique (membership_id)` + trigger requiring `status='accepted'`.

**Filterable tag arrays (on `driving_schools` as `text[]` + GIN):** `languages_spoken` (constrained to a DB-level enum), `documents_required`, `instructor_specializations`. Non-filterable structured JSONB: `opening_hours`, `pass_rates`, `medical_visit`, `exam_fees`, `accessibility`, `social`, `proprietary_app`.

**Money:** `float8` columns — `driving_licences.price` plus `price` keys inside `exam_fees` / `medical_visit` JSONB. EUR-only product; no `currency` column anywhere. Render with `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` for 2-decimal rounding.

**Migration target:** `supabase/migrations/002_data_model_v1.sql`. First statement = the rename, so all subsequent SQL uses `driving_schools`. Code surface for the rename: 6 files (`src/components/driving-school/SchoolEditor.tsx`, `src/hooks/useCerca.ts`, `src/routes/SignupDrivingSchool.tsx`, `src/routes/DrivingSchoolEdit.tsx`, `supabase/migrations/001_initial_schema.sql`, `scripts/sync-claimed-schools.mjs`).

---

## 11. How to use this file

- Read this BEFORE starting any non-trivial change.
- Update sections 2, 8, 9 as priorities/decisions evolve.
- Don't duplicate content already in PRODUCT.md / DESIGN.md / STACK.md / README.md — link or reference instead.
- Section 8 (open questions) is the live work surface — close items by moving them into section 9 with a date.
