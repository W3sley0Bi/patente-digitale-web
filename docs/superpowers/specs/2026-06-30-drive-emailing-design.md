# Drive Emailing Feature — Design

**Date:** 2026-06-30
**Project:** patente-digitale-web (Patentedigitale.it)
**Status:** Approved design — pending implementation plan

## Goal

When a driving lesson ("drive"/booking) is confirmed — automatically or manually —
the **student** receives a branded HTML email containing all drive details and an
"add to calendar" option (`.ics` attachment + Google Calendar link). This email is
**on by default** and can be disabled in a new Settings view.

When a student **requests** a drive, the **school** receives a notification email —
regardless of whether auto-confirm is on or off. This is on by default and can be
disabled in the same Settings view (the school settings that are currently commented
out).

## Decisions (locked)

- **Settings UI:** new dedicated Settings view (uncomment `DrivingSchoolSettings`
  route + nav). Holds both toggles.
- **Calendar:** `.ics` attachment **and** a Google Calendar link button.
- **Language:** Italian only (matches existing email subjects).
- **Visual design:** match the web app brand (mascot logo, brand green, details card).

## Current state (baseline)

- **Stack:** Vite + React 19 + TypeScript; Supabase (Postgres + Deno edge functions).
- **Email infra exists:** `supabase/functions/notify/index.ts` sends via Resend
  (`from: Patentedigitale <noreply@patentedigitale.it>`). Today it accepts
  `{ event, to, body }` and renders a bare `<p>subject</p>` template.
- **Client notify helper:** `src/lib/booking/api.ts` → `notify(event, to, body)` does
  fire-and-forget `supabase.functions.invoke("notify", ...)`. Best-effort; never blocks.
- **Already wired:** `confirmBooking` calls `notify("booking_confirmed", studentEmail)`;
  `requestBooking` calls `notify("booking_requested", schoolEmail)`.
- **Auto-confirm path (`request_booking` RPC, migration 013):** when the school has
  `auto_confirm = true` and a free instructor exists, the booking is inserted as
  `confirmed`. The RPC returns only the booking `uuid` (no status). The frontend's
  `requestBooking` therefore fires only `booking_requested` (to the school) and the
  **student never gets a confirmation email** — this is the main gap to close.
- **Calendar helpers:** `src/lib/calendar/ics.ts` has RFC-5545 `.ics` builders
  (`buildIcsEvent`, `googleCalendarUrl`, etc.) — plain TS, but browser-oriented
  (`downloadIcs` uses DOM). Calendar feed edge function exists separately.
- **Settings today:** `ServiceSettings.tsx` (duration + auto-confirm toggle) embedded
  on the Guide page. `DrivingSchoolSettings.tsx` is a placeholder; its nav item in
  `DrivingSchoolLayout.tsx` is commented out.
- **Schema:** `driving_schools` has `name, email, phone, address, lesson_duration_min,
  booking_enabled, auto_confirm`. `bookings` has `school_id, student_id, instructor_id,
  starts_at, ends_at, duration_min, status`. Student email is in `auth.users.email`.

## Architecture

Move the email rendering and gating **server-side** into the `notify` edge function,
which becomes **booking-aware**. The client passes `{ event, bookingId }`; the function
loads the drive, checks the school's toggles, renders the branded email, and (for
confirmations) attaches the `.ics`.

### 1. DB migration — `supabase/migrations/022_email_settings.sql`

Add to `driving_schools`:

```sql
alter table public.driving_schools
  add column if not exists email_student_confirmation boolean not null default true,
  add column if not exists email_school_request       boolean not null default true;
```

`comment on column` for each. Existing owner RLS update policy already permits the
school to change these.

### 2. Edge function rewrite — `supabase/functions/notify/index.ts`

New input shape (backward compatible):

```ts
// New booking-aware path:
{ event: "booking_confirmed" | "booking_requested", bookingId: string }
// Legacy path (enrollment_*, booking_declined, booking_cancelled) still works:
{ event, to, body }
```

Flow for the booking-aware path:

1. **Authorize:** build a user-scoped Supabase client from the caller's
   `Authorization` header; confirm the caller can read the booking via RLS
   (`select id from bookings where id = bookingId`). If not visible → 403. This
   prevents arbitrary `bookingId` probing.
2. **Load details (service role):** booking (`starts_at`, `ends_at`, `duration_min`,
   `status`), `driving_schools` (`name`, `email`, `address`, `email_student_confirmation`,
   `email_school_request`), `instructors.name`, and student email from `auth.users`.
3. **Route by event:**
   - `booking_requested`:
     - if `email_school_request` → send "new request" email to `school.email`.
     - **and** if `booking.status === "confirmed"` (auto-confirm path) **and**
       `email_student_confirmation` → also send the student confirmation email with
       calendar. *(Closes the auto-confirm gap without any frontend status check.)*
   - `booking_confirmed` (manual path):
     - if `email_student_confirmation` → send the student confirmation email with calendar.
4. **Send via Resend**, using `attachments: [{ filename: "guida.ics", content: <base64> }]`
   for confirmations.

Env: uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (edge runtime defaults),
`RESEND_API_KEY`. All sends remain best-effort; failures return non-200 but the client
ignores them.

### 3. ICS builder for the edge runtime

Port the pure logic from `src/lib/calendar/ics.ts` (`buildIcsEvent`, `toIcsUtc`, line
folding, text escaping, `googleCalendarUrl`) into a Deno-safe module under
`supabase/functions/notify/` (no DOM usage — drop `downloadIcs`). UID format stays
`booking-<uuid>@patentedigitale.it`. Base64-encode the `.ics` string for the Resend
attachment.

### 4. Branded HTML email template

Inside the function (or a `template.ts` next to it). Table-based layout with inline
styles for email-client compatibility:

- Header: mascot logo (`https://patentedigitale.it/mascot-logo.png`), brand green.
- Body: greeting + a "drive details" card — school name, instructor, date & time
  (Europe/Rome, Italian formatting), duration, school address.
- CTA: "Aggiungi al calendario" button → `googleCalendarUrl(...)`; note that an `.ics`
  is attached for Apple/Outlook.
- Footer: `— Patentedigitale.it`.
- Italian copy throughout. Distinct subject/heading for the school "new request" mail
  vs. the student confirmation.

### 5. Frontend wiring — `src/lib/booking/api.ts`

- Extend the `notify()` helper to send `{ event, bookingId }` for booking events while
  keeping the legacy `{ event, to, body }` signature for enrollment / decline / cancel.
- `confirmBooking` → `notify("booking_confirmed", { bookingId: id })`.
- `requestBooking` → `notify("booking_requested", { bookingId: id })` (uses the returned
  booking id; no longer needs to pass `schoolEmail`).
- Add `setEmailSettings(schoolId, studentConfirm, schoolRequest)` (or extend
  `setServiceSettings`) writing the two new columns via the owner RLS policy.
- Booking/school read types extended with the two flags where the Settings view loads them.

### 6. New Settings view

- Uncomment the `DrivingSchoolSettings` route and the nav item in `DrivingSchoolLayout.tsx`.
- Build the view: two toggles reusing the ServiceSettings Apple-style switch —
  "Invia email di conferma allo studente" (default on) and "Avvisa la scuola a ogni
  richiesta" (default on) — each with Italian helper text. Load current flags for the
  school, persist on change via `setEmailSettings`.

## Data flow summary

| Scenario | Trigger | Emails sent (subject to toggles) |
|---|---|---|
| Manual confirm | school clicks confirm → `confirmBooking` → `notify("booking_confirmed")` | student confirmation + `.ics` |
| Auto-confirm | student requests → `request_booking` confirms → `notify("booking_requested")` | school "new request" **and** student confirmation + `.ics` |
| Manual pending | student requests (auto off / no instructor) → `notify("booking_requested")` | school "new request" only (booking is `pending`) |

## Error handling

- Email is best-effort; the edge function returns non-2xx on failure and the client
  swallows it (existing behavior). User actions never block on email.
- Unauthorized `bookingId` → 403, no send.
- Missing `RESEND_API_KEY` → 500 "no provider" (existing behavior).
- Toggle OFF → function short-circuits that recipient, returns ok.

## Testing

- Unit: ported ICS builder (UTC formatting, folding, escaping, Google URL) — mirror
  existing `ics` tests.
- Unit/logic: edge-function routing + gating — given a booking + flag combination, the
  correct recipients are chosen (table above as the test matrix).

## Out of scope

- Localized emails — Italian only.
- Redesign of enrollment / decline / cancel emails — kept in the current simple format.
- Open/click/bounce tracking and unsubscribe links.
