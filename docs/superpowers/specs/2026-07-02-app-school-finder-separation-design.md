# App School Finder / Marketing Search Separation

## Problem

`/search` (marketing "find a driving school" page) and `/app/signup/driving-school` (owner claim flow) are the only two school-search surfaces today. Neither serves a logged-in **student** picking a school to enroll in — students currently reuse the marketing `/search` page plus an inline `EnrollButton` in `SchoolDetailPanel`. This couples the student in-app experience to marketing routing/CTAs (e.g. the owner-claim link rendered in `SchoolDetailPanel.tsx:246`), which the student flow should never surface.

Goal: give students a school finder that lives inside the app, is visually/behaviorally consistent with the marketing search (shared building blocks), but is structurally independent — it must not link out to marketing pages or the owner claim flow, and vice versa.

## Scope

In scope:
- New app-scoped school finder for students, shown only while they have no active enrollment.
- Gating logic added to `StudentDashboard.tsx`.

Out of scope (untouched):
- Marketing search: `src/routes/Cerca.tsx`, `src/components/cerca/CercaPage.tsx`, `SchoolDetailPanel.tsx`, `FilterBar.tsx`, `ResultsList.tsx`, `SchoolMap.tsx`, `SchoolCard.tsx` (these are reused as-is, not modified).
- Owner claim flow: `ClaimSearch.tsx`, `ClaimForm.tsx`, `SignupDrivingSchool.tsx`, route `/app/signup/driving-school`.

## Design

### Visibility rule

Reuse existing enrollment primitives (`EnrollmentStatus` in `src/lib/booking/types.ts:7`, `getMyEnrollment()` in `src/lib/booking/api.ts:82-91`) — no new data model needed.

```
enrollment == null || status in (pending, rejected, left) -> show finder
status == active                                           -> hide finder
```

Wired inline into `StudentDashboard.tsx` (not a new route), alongside the existing `EnrollmentStatusCard` / `isActive` gate at line ~213.

### New components

`src/components/booking/school-finder/`
- `AppSchoolFinderPanel.tsx` — container. Reuses `useCerca` (data/filter state), `FilterBar`, `ResultsList`, `SchoolMap`, `SchoolCard` unmodified — these are already generic with no marketing-specific coupling.
- `AppSchoolDetailPanel.tsx` — new, forked from `SchoolDetailPanel.tsx` conceptually but not by reuse. Shows school info + `EnrollButton` only. Does **not** render the owner-claim CTA or any marketing link.

Rationale for forking the detail panel instead of adding a `mode` prop to the existing one: a shared file that branches on marketing-vs-app context is exactly the coupling this change removes. A future edit to one context could leak into the other through a shared conditional. Two small, single-purpose files are cheaper to keep correct than one branching file.

### Data flow

Same as marketing: `useCerca` merges static `/data/autoscuole.geojson` with Supabase `driving_schools` (status=accepted) via `mergeDelta`. No changes to this hook.

### Navigation boundary

- `AppSchoolFinderPanel` / `AppSchoolDetailPanel` contain zero links to `/search` or `/app/signup/driving-school`.
- Marketing `SchoolDetailPanel` and `CercaPage` are not modified and keep their existing owner-claim CTA — this is intentional and out of scope.

### Testing

- Unit test for the visibility gate in `StudentDashboard` (shows finder for null/pending/rejected/left, hides for active).
- Reuse existing `useCerca` test coverage; no new data-layer tests needed since the hook is unchanged.
- New component test for `AppSchoolFinderPanel` asserting no marketing/claim links are rendered.

## Non-goals

- No changes to the owner claim flow or its route.
- No changes to marketing `/search` behavior, copy, or CTAs.
- No new "onboarding" concept — enrollment status already models this.
