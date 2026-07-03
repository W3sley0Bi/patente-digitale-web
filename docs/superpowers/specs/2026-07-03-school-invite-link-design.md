# School invite link / QR enrollment

## Problem

Students currently only reach a school's enroll CTA by searching for it in `/cerca` or the in-app finder. Schools want a shareable link + printable QR (e.g. on a poster or business card) that drops a student straight onto that school's enroll flow, whether the student is signed in, signed out, or brand new.

## Approach

Reuse the existing marketing search deep-link infrastructure rather than building new routes or tables.

**Link shape:** `<origin>/cerca?placeId=<driving_schools.place_id>` — the same URL shape `useCerca` already auto-selects on load (built in commits `0cb45d7`, `761185b`). No new route, no invite token table. One static link per school, generated on demand from data the school already has (its own `place_id`).

**Landing behavior (already built, commit `f27a44f`):**
- Logged-in student → `SchoolDetailPanel` renders `EnrollButton` directly.
- Anonymous visitor → sees a "log in to enroll" CTA linking to `/app/login?next=/app/student?placeId=<id>`.

This design adds the pieces needed to make that flow actually one-tap and handle the edge cases the school-owner asked about.

## Changes

### 1. Auto-open the enroll dialog on deep link

Today, arriving via `?placeId=` only auto-*selects* the school panel; the student still has to tap "Iscriviti" to open `EnrollDialog`. Add a signal (e.g. expose whether `selected` came from the initial URL placeId vs. a manual click, already tracked internally by `useCerca`'s `initialPlaceIdRef`/`autoSelectAttemptedRef`) down to `EnrollButton` so it can auto-open the dialog once resolved to `status === "none"`. Do not auto-open when status is `pending`, `active`, or the new `blocked` state below.

### 2. New `blocked` status in `EnrollButton`

Current gap: `EnrollButton` (`src/components/booking/EnrollButton.tsx`) only compares `getMyEnrollment()` against the current school's id. If the student has an ACTIVE enrollment at a *different* school, the check misses it, `status` stays `"none"`, the CTA renders, and submitting would hit the DB's `one_active_school_per_student` unique constraint as an unhandled error.

Fix: add a fourth status, `blocked`, set when `getMyEnrollment()` returns `status === "active"` for a different `school_id`. Render a message (no CTA) instead, e.g. "Sei già iscritto a un'altra autoscuola." No auto-open in this state.

Pending-elsewhere is intentionally left alone — a student may have pending requests at multiple schools simultaneously (matches current DB constraint, which only enforces uniqueness on `active`).

### 3. Fix redirect/`next` preservation (blocks the anonymous-signup path today)

Three existing bugs prevent a brand-new student (sign-up, not login) from landing back on the invited school after auth:

1. `src/components/auth/ProtectedRoute.tsx:25` — builds `next` from `location.pathname` only, dropping the `?placeId=` query string. Include `location.search`.
2. `src/routes/Login.tsx` `goSignup`/`goLogin` — call `setSearchParams({ tab: ... }, { replace: true })`, replacing the whole query string and wiping any existing `next` param when the student switches between the login and signup tabs. Must preserve `next` across the tab switch.
3. `src/routes/Login.tsx` signup-student `onSuccess` — hardcodes `navigate("/app/student")`, ignoring `next` entirely. Should navigate to `next` if present, else fall back to `/app/student`.

The login path (existing user) already works end to end. The signup path (new student) does not, until these three are fixed. Since QR codes will realistically be scanned by both existing and brand-new students, both paths must work.

### 4. Link + QR display for schools

Add a card to `SchoolEditor.tsx` (school's own profile/settings page — chosen because it's where the school already manages the data the link is built from) showing:
- The plain invite URL, with a copy button.
- A QR code image, generated client-side, with a download-as-PNG button.

New dependency: a small client-side QR generation library (e.g. `qrcode`), no existing equivalent in the repo. No new backend endpoint — the URL is derived purely from the school's own `place_id`, already available wherever `SchoolEditor` runs.

## Explicitly out of scope (YAGNI)

- No per-invite tokens, expiry, revocation, or attribution/tracking — link is static and reusable, matching what a printed QR poster needs.
- No new database tables or columns.
- No "switch active school" flow — a student blocked by an active enrollment elsewhere must leave their current school through existing means first; this feature only surfaces that state clearly instead of failing silently.

## Testing

- `EnrollButton`: new test cases for `blocked` status (active elsewhere) and auto-open-on-deep-link behavior.
- `ProtectedRoute`: test that query string is preserved in the `next` redirect.
- `Login`: test that `next` survives a login↔signup tab switch, and that signup success navigates to `next` when present.
- `SchoolEditor`: render test asserting the invite link/QR card appears with the correct URL for a given `place_id`.
