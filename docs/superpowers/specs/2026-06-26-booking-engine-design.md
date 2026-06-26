# Booking Engine v1 — Design

**Date:** 2026-06-26
**Status:** Approved (design), pending implementation plan
**Context:** First real service for a pilot driving school. Pulls forward the "Motore di Prenotazione" from the Q1 2027 roadmap. Students request driving lessons; the school manages all appointments in a calendar view, with hard prevention of instructor double-booking.

## Goal

Let an enrolled student request a driving lesson, let the pilot school confirm/decline and manage lessons in a week calendar, and guarantee no instructor is ever double-booked. Built into the existing platform and persisted in Supabase.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Where it lives | In the existing React app + Supabase DB. No standalone app, no mock/local data. |
| Booking flow | Request → school confirms. No instant-book in v1. |
| Instructors | Modeled as entities; each confirmed booking assigned to one instructor. |
| Student access | Logged-in students only (existing `student` role). |
| Who can book | Enrolled students only. |
| Enrollment | Student requests → school approves. |
| Student↔school cardinality | School has many students; **a student has exactly one active school**. |
| Cancellation | Either side cancels (pending or confirmed), free, optional reason; slot frees; other side notified. |
| Notifications | In-app lists/badges + transactional email (Resend via Supabase Edge Function). |
| Lesson definition | Student picks date+time. Duration is fixed per school; the school sets `lesson_duration_min` at service setup. Licence code carried from enrollment. |

## Section 1 — Data model

New tables added to Supabase (reusing `profiles`, `driving_schools`, `driving_licences`).

### `instructors`
- `id` uuid pk
- `school_id` uuid → `driving_schools` (cascade)
- `name` text
- `active` boolean default true
- `created_at` timestamptz
- School owner manages (CRUD).

### `enrollments` (student ↔ school link)
- `id` uuid pk
- `school_id` uuid → `driving_schools`
- `student_id` uuid → auth user
- `status` text check in (`pending`, `active`, `rejected`, `left`)
- `licence_code` text (the licence the student is enrolling for; sourced from school's `driving_licences`)
- `created_at`, `decided_at` timestamptz
- `unique(school_id, student_id)` — no duplicate pair.
- **`create unique index one_active_school_per_student on enrollments (student_id) where status = 'active';`** — enforces one active school per student at the DB level. Pending requests to multiple schools are allowed; only one can become active. Leaving a school (`rejected`/`left`) frees the student to enroll elsewhere. History preserved.

Rationale for a link table over `profiles.school_id`: keeps enrollment **status** (drives the request→approve flow), keeps **history**, and lets booking RLS check "active enrollment at this school" cleanly without overloading the profile row.

### `bookings`
- `id` uuid pk
- `school_id` uuid → `driving_schools`
- `student_id` uuid → auth user
- `instructor_id` uuid → `instructors`, **null until confirmed**
- `starts_at` timestamptz
- `duration_min` int — snapshot of the school's `lesson_duration_min` at request time
- `ends_at` timestamptz — generated as `starts_at + duration_min`
- `status` text check in (`pending`, `confirmed`, `declined`, `cancelled`, `completed`)
- `cancelled_by` text check in (`student`, `school`) null
- `cancel_reason` text null
- `licence_code` text — carried from the student's active enrollment
- `created_at`, `updated_at`, `decided_at` timestamptz

### `driving_schools` (extend)
- `lesson_duration_min` int — school sets at service setup
- `booking_enabled` boolean default false — per-school gate for the pilot

### Overlap guarantee (DB-level)
Enable `btree_gist`. Add an exclusion constraint on `bookings` over `instructor_id` and the time range `[starts_at, ends_at)`, scoped `WHERE status = 'confirmed'`. Two confirmed lessons for the same instructor cannot overlap, even under concurrent requests. This is the structural solution to the double-booking pain — not application-only logic.

## Section 2 — Booking lifecycle

```
student requests → pending (no instructor assigned)
school confirms  → assign instructor (+ optional time tweak) → confirmed
                   [exclusion constraint blocks overlapping a busy instructor]
school declines  → declined
either side      → cancelled (records cancelled_by + cancel_reason); slot frees
after ends_at    → completed (computed/marked lazily on read; no cron in v1)
```

- Confirm is the only transition that assigns `instructor_id`. If the chosen instructor already has a confirmed lesson in that range, the DB rejects the write; the UI surfaces this loudly and the school re-picks instructor or time.
- `cancelled` and `declined` are outside the exclusion constraint's `WHERE`, so cancelling frees the slot automatically.
- `completed` is derived (status `confirmed` and `ends_at < now()`); no scheduled job needed for v1.

## Section 3 — Surfaces

**Student** (`StudentDashboard` + school page):
- "Enroll" action on the school page → creates a `pending` enrollment.
- "My lessons" list: pending / confirmed / past.
- "Book a lesson" form: date + time picker; duration shown as fixed by the school. Only available when the student has an `active` enrollment and the school has `booking_enabled`.

**School** (`DrivingSchoolDashboard`):
- Week calendar of confirmed lessons, grouped/colored per instructor.
- Requests inbox: pending bookings → confirm (assign instructor) or decline.
- Pending enrollments: approve / reject.
- Instructors management: CRUD.
- Service settings: `lesson_duration_min`, `booking_enabled` toggle.

**Admin** (`AdminDashboard`): no new v1 surface.

**Calendar:** a simple week/day grid component built in-app. No new calendar library added in v1.

## Section 4 — Notifications

A Supabase Edge Function sends transactional email via Resend, invoked app-side after the relevant writes. Events:
- Enrollment requested → school
- Enrollment approved → student
- Booking requested → school
- Booking confirmed / declined → student
- Booking cancelled → the other side

In-app surfacing is via the dashboard lists and unread/pending badges.

## Section 5 — Security (RLS)

- **`enrollments`**: student may insert their own (`pending`) and read their own; school owner may read + update rows for their school; admin all.
- **`bookings`**: student may insert only when they have an `active` enrollment at that `school_id`; student may read and cancel their own; school owner may read + update bookings for their school; admin all.
- **`instructors`**: school owner CRUD; enrolled (active) students may read their school's instructors.

All new tables have RLS enabled, consistent with the existing `driving_schools` / `driving_licences` policies.

## Section 6 — Testing

- **Unit:** overlap detection and the booking state-machine transitions.
- **RLS:** policy tests — student cannot book without active enrollment; cannot read others' bookings; school owner scoped to own school.
- **E2E (Playwright):** happy path — enroll → school approves → student requests lesson → school confirms (instructor assigned) → cancel.
