# Driving school dashboard enrichment

## Problem

`DrivingSchoolDashboard.tsx` (overview page, `/app/driving-school`) shows only a title and two static nav tiles ("edit listing", "go to guide"). It surfaces no data even though the school already has students, bookings, and instructors. The student-facing dashboard (`StudentDashboard.tsx`) is much richer (enrollment status, next lesson, pending count). This spec brings the school overview to parity using data that already exists — no schema or RPC changes.

## Data sources (existing, no backend changes)

- `listSchoolEnrollments(schoolId)` → `students` rows (status: pending/active/rejected/left)
- `listSchoolBookings(schoolId)` → `bookings` rows (status via `effectiveStatus`)
- `listInstructors(schoolId)` → `instructors` rows (active flag)
- `listEnrollmentRequests(schoolId)` → pending enrollment requests (RPC, resolved names/emails)

All four already have client functions in `src/lib/booking/api.ts`.

## Layout

Replace the two-tile grid in `DrivingSchoolDashboard.tsx` (the `approved` branch, lines ~187-218) with:

1. **Stats row** — 4 compact cards, same visual language as `LessonsGlance` cards (`rounded-2xl border border-line bg-bg-raised`):
   - Active students (`students` where `status === "active"`)
   - Lessons this week (`bookings` where `effectiveStatus === "confirmed"` and `starts_at` within current calendar week)
   - Pending requests (count = pending enrollment requests + pending bookings), shown as a single number with a subtle warning tint if > 0
   - Active instructors (`instructors` where `active`)

2. **Needs attention** — combined list of pending enrollment requests and pending booking requests, most recent first, capped at 5 with a "view all" link when more exist. Each row: name + type (enrollment/booking) + relative time + link to `/app/driving-school/students` or `/app/driving-school/drive-bookings` respectively. Empty state: friendly "all caught up" message (no icon needed, text only, matching `booking.student.notEnrolled` empty-state style).

3. **Upcoming lessons** — next 5 confirmed bookings from now onward, each showing student name + instructor name + datetime. Reuses the same data fetch as the stats row (no separate query). Empty state: "no upcoming lessons" text.

The two removed nav tiles' destinations remain reachable via the existing sidebar (`DrivingSchoolLayout` `NAV_ITEMS` already lists guide/students/profile/settings), so no navigation is lost.

## Data flow

Single `useEffect` in `DrivingSchoolDashboard.tsx`, gated on `claim?.id` (only fires once `approved` and `claim` are resolved), firing the four list calls via `Promise.all`. Results stored in one `useState` object (`{ students, bookings, instructors, enrollmentRequests }`), loading flag defaults true until resolved. Derived values (stats, needs-attention list, upcoming lessons) computed with `useMemo`, following the existing `LessonsGlance` pattern in `StudentDashboard.tsx` (client-side filtering/sorting, no new RPCs).

Errors: on fetch failure, fall back to empty arrays (matching `listMyBookings().catch(() => setBookings([]))` pattern already used) rather than blocking the page — stats show 0 / empty states rather than an error screen.

## Components

- New `src/components/driving-school/DashboardStats.tsx` — the 4-card stats row, takes computed numbers as props.
- New `src/components/driving-school/DashboardAttention.tsx` — needs-attention list, takes merged+sorted items as props.
- New `src/components/driving-school/DashboardUpcoming.tsx` — upcoming lessons list, takes bookings as props.
- `DrivingSchoolDashboard.tsx` owns the fetch/derive logic and composes the three above.

Each component is presentational only (no data fetching), consistent with `LessonsGlance`'s co-located pattern being the exception (it fetches its own data in the student dashboard) — here we centralize fetching once since three sections share the same four data sources, avoiding 4x duplicate queries.

## i18n

New keys added under `school.dashboard.*` namespace (e.g. `school.dashboard.stats.activeStudents`, `school.dashboard.attention.title`, `school.dashboard.attention.empty`, `school.dashboard.upcoming.title`, `school.dashboard.upcoming.empty`) in both `it` and `en` locale files, following existing key structure.

## Testing

- Unit test for the stats/derivation logic (pure functions extracted where reasonable, or tested via component rendering with mocked API responses), covering: empty state (no data), mixed pending/active data, week-boundary edge case for "lessons this week".
- Existing `DrivingSchoolDashboard` is untested today (only `StudentDashboard.test.tsx` exists) — this is a reasonable point to add a basic render test for the new overview.

## Out of scope

- No new backend RPCs or schema changes.
- No charts/graphs — numbers and lists only, matching the app's existing minimal-chrome style.
- No date-range picker or historical trends — "this week" and "next 5" are fixed windows for v1.
