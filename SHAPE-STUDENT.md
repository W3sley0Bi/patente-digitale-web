# Shape: Student experience upgrade

Confirmed brief. Read PRODUCT.md + DESIGN.md + STACK.md first. Product register (app UI, not landing).

## Goals (user-confirmed)

1. **Split dashboard → Guide.** Student dashboard becomes a *glance*. A new `/student/dashboard/guide` holds the *act* (book + manage lessons). Mirrors the school-side `DrivingSchoolGuide`. "Guide" = *guida* = driving lessons.
2. **Status visibility, both sides.** A shared `StatusPill` (color + icon + label, never color-only per DESIGN a11y rule). Student sees pills on every lesson + a dashboard banner surfacing the most recent status change. School sees pills in the requests inbox + a calendar legend.
3. **Calendar.** Per-student secret `.ics` subscription feed (true "auto-add every time without asking" for Google + Apple/iCloud) PLUS one-tap "add this lesson" (Google link + `.ics` download). Store preference on the profile.

## Domain (existing, do not change)

`BookingStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed"` (`src/lib/booking/types.ts`).
`effectiveStatus(b)` already downgrades past confirmed → completed (`src/lib/booking/helpers.ts`). Always render the **effective** status.
`Booking` carries `starts_at`, `ends_at`, `duration_min`, `status`, `cancelled_by`, `cancel_reason`, `decided_at`, `updated_at` — enough for pills, banner and `.ics` with no new booking columns.

## Status → visual mapping (tokens, no raw hex/oklch in components)

| status | meaning | bg token | text token | lucide icon |
|---|---|---|---|---|
| confirmed | green | `brand-soft` | `brand-ink` | `CheckCircle2` |
| pending | amber | `warning-soft` (NEW) | `warning-ink` (NEW) | `Clock` |
| declined | red | `accent-soft` | `accent-ink` | `XCircle` |
| cancelled | grey | `bg-sunken` | `ink-muted` | `Ban` |
| completed | blue | `info-soft` (NEW) | `info-ink` (NEW) | `CircleCheck` / `Flag` |

New tokens (`warning-soft`, `warning-ink`, `info-soft`, `info-ink`) get added to `src/styles/tokens.css` and documented in DESIGN.md Color section with a one-line justification (DESIGN.md permits this). `brand-soft/ink`, `accent-soft/ink`, `bg-sunken`, `ink-muted` already exist.

## Component contracts (agreed paths + signatures — build to these exactly)

```ts
// src/components/booking/StatusPill.tsx
export function StatusPill({ status, className }: { status: BookingStatus; className?: string }): JSX.Element
// icon + i18n label `booking.mine.status.${status}` + mapped tokens. size 14 icon, text-xs, rounded-full, px-2.5 py-1, gap-1.5.

// src/components/booking/AddToCalendar.tsx
export function AddToCalendar({ booking, schoolName, instructorName, className }:
  { booking: Booking; schoolName?: string; instructorName?: string; className?: string }): JSX.Element
// dropdown (shadcn dropdown-menu): "Google" → opens googleCalendarUrl in new tab; "Apple / .ics" → downloadIcs(). Only render for confirmed/completed.

// src/lib/calendar/ics.ts
export function buildIcsEvent(opts: { uid: string; start: Date; end: Date; title: string; description?: string; location?: string }): string // full VCALENDAR text
export function downloadIcs(filename: string, ics: string): void
export function googleCalendarUrl(opts: { start: Date; end: Date; title: string; details?: string; location?: string }): string

// src/components/student/CalendarPreference.tsx
export function CalendarPreference(): JSX.Element
// dashboard widget. Reads profile (calendar_feed_token, calendar_auto). Toggle "auto-add all confirmed lessons" (persists profiles.calendar_auto).
// Shows subscribe links built from feed URL: Google = https://calendar.google.com/calendar/r?cid=<webcal-encoded>, Apple = webcal://<feedUrl>.
// feedUrl = `${VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${calendar_feed_token}` (https→webcal for the webcal: scheme).

// src/components/student/StatusChangeBanner.tsx
export function StatusChangeBanner(): JSX.Element | null
// loads listMyBookings(), picks the most recent confirmed/declined/cancelled by decided_at||updated_at within last 14 days, renders StatusPill + one-line message. null if none.
```

## Backend (FILES ONLY — never deploy, never run MCP apply_migration; live project auto-pauses)

```
supabase/migrations/019_calendar.sql
  alter table public.profiles
    add column if not exists calendar_feed_token uuid not null default gen_random_uuid(),
    add column if not exists calendar_auto boolean not null default false;
  -- existing RLS "profiles_own_row" already covers reads of own token.

supabase/functions/calendar-feed/index.ts   (Deno, mirror functions/notify/index.ts conventions)
  GET ?token=<uuid> → look up profile by calendar_feed_token (service role),
  fetch that student's confirmed (effective) bookings, emit text/calendar VCALENDAR.
  Headers: Content-Type: text/calendar; charset=utf-8. CORS like notify. No token → 400. Unknown token → 404.
```

## Routing / nav

- `src/App.tsx`: add protected student route `/student/dashboard/guide` → `StudentGuide`.
- `src/components/student/StudentLayout.tsx`: add nav item between dashboard and profile: `{ href: "/student/dashboard/guide", icon: Car, label: "student.nav.guide", end: false }` (lucide `Car`).

## Dashboard (glance) after restructure

`src/routes/StudentDashboard.tsx`: keep greeting + `CompleteNamePrompt`. Replace the booking panel with:
enrollment status card → `StatusChangeBanner` → next-confirmed-lesson summary + pending-count + primary CTA linking to `/student/dashboard/guide` → `CalendarPreference` (only when enrolled+active). No booking form, no full lesson list on the dashboard.

`src/routes/StudentGuide.tsx`: the enrollment/school-loading logic currently in `StudentBookingPanel` moves here, rendering `BookLessonForm` + `MyLessons`.

## i18n

Agents DO NOT edit `src/i18n/locales/*.json`. Each agent returns the list of new keys it referenced with English copy; the orchestrator adds IT/EN/AR. Existing `booking.mine.status.*` labels already cover the pills.

## Guardrails

- Tailwind v4 + token utilities only. No raw hex/oklch/`gray-*` in components. New tokens only via tokens.css + DESIGN.md.
- No new npm deps (banned: date libs — use `Intl`/native `Date`). shadcn `dropdown-menu` already present.
- Respect `prefers-reduced-motion`. WCAG AA.
- No commits, no deploys, no Supabase MCP mutations.
