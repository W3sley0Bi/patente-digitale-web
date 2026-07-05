# Students Table Rework — Design

**Date:** 2026-07-05
**Status:** Approved in discussion, pending spec review

## Problem

Driving-school owners need to manually add students (name + contact info) who have not
signed up, so booking-notification emails reach them. Today this is impossible:
`enrollments.student_id` and `bookings.student_id` are `NOT NULL` FKs to `auth.users(id)`,
and `profiles.id` *is* the auth user id — no student can exist without an auth account.

## Decision

Replace `enrollments` with a new central `students` table. A student row belongs to a
school and *optionally* links to an auth user. Manually added students are rows with
`auth_user_id IS NULL`; when the person later signs up, the **same row** is claimed by
setting `auth_user_id` — booking history carries over with no merge step.

`profiles` is **kept** (its role check backs ~30 RLS policies/RPCs) but slimmed to
identity-only: `id`, `role`, `approved`. `full_name` and `phone` move to `students`.

We are pre-production: one clean migration, backfill existing data, drop `enrollments`.
No dual-model period.

## Schema

```sql
create table public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  auth_user_id  uuid references auth.users(id) on delete set null,   -- NULLABLE
  full_name     text not null,
  email         text,          -- contact email for UNCLAIMED students only (see Email Resolution)
  phone         text,
  licence_code  text,
  status        text not null default 'pending'
                check (status in ('pending','active','rejected','left')),
  source        text not null default 'self'
                check (source in ('self','manual')),
  claim_token   uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  -- unclaimed students must be reachable (fix #2)
  constraint students_unclaimed_needs_email
    check (auth_user_id is not null or email is not null)
);

-- claimed: one row per (school, auth user) — plain UNIQUE would allow NULL dupes,
-- which is intended for manual students (fix #4)
create unique index students_school_authuser_uq
  on public.students (school_id, auth_user_id) where auth_user_id is not null;

-- one ACTIVE enrollment per auth user across all schools (preserved from enrollments)
create unique index students_one_active_per_user
  on public.students (auth_user_id) where status = 'active' and auth_user_id is not null;

-- no duplicate manual adds within a school (fix #3); cross-school not enforced
create unique index students_school_email_unclaimed_uq
  on public.students (school_id, lower(email)) where auth_user_id is null;

create index students_school_idx on public.students (school_id);
create index students_authuser_idx on public.students (auth_user_id);
create index students_claim_token_idx on public.students (claim_token);
```

`bookings.student_id` is repointed: `references public.students(id) on delete restrict`.
Soft removal (`status='left'`) is the normal path; hard delete of a student with
bookings is blocked (fix #6). A dedicated RPC may hard-delete a mistake row only when
it has no bookings.

`profiles` drops `full_name` and `phone` (moved to `students`); the blank-name guard
trigger from migration 021 is dropped with them.

## Email Resolution (fix #1)

`students.email` never syncs with auth. Hard rule everywhere (notify edge function,
list RPCs):

- `auth_user_id IS NOT NULL` → resolve email from `auth.users.email`
- `auth_user_id IS NULL` → use `students.email`

On claim, `students.email` is set to NULL (the auth account is now the source of truth).

## Claim Flow (fix #5)

Two paths, token is primary:

1. **Claim token (deterministic).** School shares a per-student link containing
   `claim_token`. Logged-in student (role `student`) opens it → RPC
   `claim_student_record(token)` sets `auth_user_id = auth.uid()`, nulls `email`,
   rotates the token. Fails if the row is already claimed, or if the user already has
   an active enrollment elsewhere (existing global rule).
2. **Email-match (suggestion only).** When a student self-enrolls via the existing
   school invite link and their auth email matches an unclaimed row (same school,
   case-insensitive), `request_enrollment` claims that row instead of inserting a new
   one — the invite link carries the school's intent. Outside the invite flow, a match
   is only *surfaced* to the school for manual confirmation, never auto-linked.

Self-enrollment otherwise unchanged: `request_enrollment` inserts a `students` row with
`auth_user_id = auth.uid()`, `source='self'`, `status='pending'`; school approves or
rejects as today.

## Manual Add

New RPC `add_student_manual(school_id, full_name, email, phone, licence_code)` —
school owner (or admin) only. Inserts `source='manual'`, `status='active'`,
`auth_user_id = NULL`. Email required (constraint). Duplicate email in the same school
→ friendly error. `licence_code` stays nullable for manual rows (school may not have it
yet); it remains required in the self-service `request_enrollment` path.

Manual students can be booked by the school immediately; they cannot log in, so
student-side RLS simply never matches their rows until claimed.

## RLS / RPC Surface

- **students RLS:** school owner full access to own school's rows; student sees rows
  where `auth_user_id = auth.uid()`; admin all. (Mirrors current enrollments policies.)
- **bookings RLS:** student-side predicates change from `auth.uid() = student_id` to
  `exists (select 1 from students s where s.id = bookings.student_id
  and s.auth_user_id = auth.uid())`.
- **Rewritten RPCs:** `request_enrollment`, `approve_enrollment`, `reject_enrollment`,
  `list_enrolled_students`, `list_enrollment_requests`, `school_update_student`, all
  booking RPCs that touch `student_id`, plus new `add_student_manual` and
  `claim_student_record`. `school_update_student` may now also edit `email` — but only
  while `auth_user_id IS NULL`.
- **notify edge function:** stops calling `auth.admin.getUserById` unconditionally;
  applies the Email Resolution rule from the `students` row.

## Migration & Backfill (single migration, e.g. `025_students_table.sql`)

1. Create `students` + indexes.
2. Backfill: `insert into students (...) select e.*, p.full_name, p.phone, null email
   from enrollments e join profiles p on p.id = e.student_id` — `auth_user_id` set,
   `email` NULL (claimed rows resolve via auth).
3. Add `bookings.student_id_new`, populate via `(school_id, old student_id)` → new
   `students.id` mapping, swap column, restore indexes/FK (`on delete restrict`).
4. Rewrite RLS policies and RPCs listed above.
5. Drop `enrollments`; drop `profiles.full_name` / `profiles.phone` and the name-guard
   trigger.

## Frontend

- Students page: "Add student" action → dialog (name, email, phone, licence code);
  unclaimed rows badged (e.g. "not registered") with a copy-claim-link action.
- Enrollment/booking hooks and types updated to the new row shape (student identity
  now comes from `students`, not `profiles` + `auth.users` join).
- Deep-link enrollment flow unchanged for users; internally `request_enrollment`
  gains the email-match claim behaviour.
- Manual-add dialog includes a consent nudge: "the student has agreed to be contacted
  by email" (GDPR, fix #7 — copy only, no schema).

## Out of Scope

- Removing `profiles` entirely (separate effort; role/approved stay).
- Cross-school duplicate detection for unclaimed emails.
- SMS or other notification channels.

## Testing

- Migration on a seeded local db: enrollments/bookings counts preserved, mapping spot-checks.
- RPC tests: manual add (happy, duplicate email, non-owner), claim by token (happy,
  already-claimed, active-elsewhere), email-match claim via invite flow, booking as
  school for unclaimed student, notify email resolution both branches.
- RLS: student cannot read other students' rows; school cannot read other schools'.
