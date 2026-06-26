# Booking Engine v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an enrolled student request a driving lesson, let the pilot school confirm/decline and manage lessons in a week calendar, with DB-enforced prevention of instructor double-booking.

**Architecture:** New Supabase tables (`instructors`, `enrollments`, `bookings`) + extended `driving_schools`, behind RLS, with all state transitions done through `security definer` RPCs (matching the existing `claim`/`approve_claim` pattern). A thin typed lib layer (`src/lib/booking/`) wraps the RPCs and reads. UI is added into the existing `StudentDashboard` and `DrivingSchoolDashboard` routes. Transactional email goes through a single Supabase Edge Function (`notify`) using Resend, invoked app-side and non-blocking.

**Tech Stack:** Postgres (Supabase, project `dodwkggrwlydimlbmvgk`) with `btree_gist` exclusion constraints; React 19 + react-router 7; `@supabase/supabase-js`; Vitest + Testing Library (unit/component); Playwright (e2e); Deno (edge function); react-i18next (it/en/ar).

**Spec:** `docs/superpowers/specs/2026-06-26-booking-engine-design.md`

---

## Conventions (read before starting)

- **Migrations** are plain numbered SQL files in `supabase/migrations/`. Next number is **006**. Applied with `supabase db push` (project linked in `supabase/config.toml`).
- **RPCs** follow the existing style: `language plpgsql security definer set search_path = ''` and **fully-qualified** identifiers (`public.foo`, `auth.uid()`). See `004_claim_via_domain_full_payload.sql`.
- **RLS** is already enabled on `profiles`, `driving_schools`, `driving_licences`, etc. Owner check pattern: `auth.uid() = (select user_id from public.driving_schools where id = school_id)`.
- **Tests:** pure logic → Vitest under a `__tests__` dir next to the file; DB guarantees → a Node integration script run with the service-role key; full flow → Playwright in `e2e/`.
- **i18n:** every user-facing string is a key under a new `booking` namespace in `src/i18n/locales/{it,en,ar}.json` (tab-indented). IT is the default; EN required; AR may mirror EN for v1.
- **Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (scripts), and a new `RESEND_API_KEY` (edge function secret).

---

## File Structure

**Create:**
- `supabase/migrations/006_booking_engine.sql` — all schema, indexes, exclusion constraint, RLS, RPCs.
- `scripts/verify-booking-schema.mjs` — integration check of the two hard DB guarantees.
- `src/lib/booking/types.ts` — shared TS types.
- `src/lib/booking/helpers.ts` — pure helpers (no I/O).
- `src/lib/booking/helpers.test.ts` — unit tests for helpers.
- `src/lib/booking/api.ts` — supabase wrappers (RPC + selects).
- `src/components/booking/InstructorsManager.tsx` — school: instructor CRUD.
- `src/components/booking/ServiceSettings.tsx` — school: `lesson_duration_min` + `booking_enabled`.
- `src/components/booking/RequestsInbox.tsx` — school: pending bookings → confirm/decline.
- `src/components/booking/EnrollmentsInbox.tsx` — school: pending enrollments → approve/reject.
- `src/components/booking/WeekCalendar.tsx` — school: confirmed lessons, week grid.
- `src/components/booking/EnrollButton.tsx` — student: request enrollment.
- `src/components/booking/BookLessonForm.tsx` — student: request a lesson.
- `src/components/booking/MyLessons.tsx` — student: list own bookings + cancel.
- `supabase/functions/notify/index.ts` — Deno edge function, sends email via Resend.
- `e2e/booking.spec.ts` — happy-path e2e.

**Modify:**
- `src/i18n/locales/it.json`, `en.json`, `ar.json` — add `booking` namespace.
- `src/routes/DrivingSchoolDashboard.tsx` — mount school booking surfaces.
- `src/routes/StudentDashboard.tsx` — mount student booking surfaces.

---

## Phase A — Database foundation

### Task 1: Integration check for the hard guarantees (write the failing test first)

**Files:**
- Create: `scripts/verify-booking-schema.mjs`

This script proves the two non-negotiable guarantees at the DB level: (1) an instructor cannot have two overlapping **confirmed** bookings, (2) a student cannot be `active` at two schools. It uses the service-role key (bypasses RLS) so it tests the **constraints**, not the policies.

- [ ] **Step 1: Write the verification script**

```js
// scripts/verify-booking-schema.mjs
// Run: node scripts/verify-booking-schema.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in env (.env.local).
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });
const fails = [];
const ok = (m) => console.log(`  ok: ${m}`);
const bad = (m) => { fails.push(m); console.error(`  FAIL: ${m}`); };

// helpers
async function rawUser() {
  // create a throwaway auth user to satisfy FKs; returns id
  const { data, error } = await db.auth.admin.createUser({ email: `t-${crypto.randomUUID()}@example.test`, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  // --- guarantee 1: instructor double-booking blocked ---
  const ownerId = await rawUser();
  await db.from("profiles").update({ role: "autoscuola", approved: true }).eq("id", ownerId);
  const { data: school, error: se } = await db.from("driving_schools")
    .insert({ user_id: ownerId, place_id: `verify-${crypto.randomUUID()}`, name: "Verify School", status: "accepted", lesson_duration_min: 60, booking_enabled: true })
    .select("id").single();
  if (se) throw se;
  const { data: instr } = await db.from("instructors").insert({ school_id: school.id, name: "Mario" }).select("id").single();
  const studentId = await rawUser();
  const base = "2030-01-01T10:00:00Z";
  const ins1 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: base, duration_min: 60, status: "confirmed" });
  if (ins1.error) bad(`first confirmed booking should insert: ${ins1.error.message}`); else ok("first confirmed booking inserts");
  const ins2 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: "2030-01-01T10:30:00Z", duration_min: 60, status: "confirmed" });
  if (ins2.error) ok("overlapping confirmed booking rejected by exclusion constraint"); else bad("overlapping confirmed booking was NOT rejected");
  const ins3 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: "2030-01-01T10:30:00Z", duration_min: 60, status: "pending" });
  if (ins3.error) bad(`pending overlap should be allowed: ${ins3.error.message}`); else ok("pending overlap allowed (only confirmed is constrained)");

  // --- guarantee 2: one active school per student ---
  const { data: school2 } = await db.from("driving_schools")
    .insert({ user_id: ownerId, place_id: `verify-${crypto.randomUUID()}`, name: "Verify School 2", status: "accepted", lesson_duration_min: 60, booking_enabled: true })
    .select("id").single();
  const e1 = await db.from("enrollments").insert({ school_id: school.id, student_id: studentId, status: "active" });
  if (e1.error) bad(`first active enrollment should insert: ${e1.error.message}`); else ok("first active enrollment inserts");
  const e2 = await db.from("enrollments").insert({ school_id: school2.id, student_id: studentId, status: "active" });
  if (e2.error) ok("second active enrollment rejected (one school per student)"); else bad("second active enrollment was NOT rejected");
  const e3 = await db.from("enrollments").insert({ school_id: school2.id, student_id: studentId, status: "pending" });
  if (e3.error) bad(`pending enrollment elsewhere should be allowed: ${e3.error.message}`); else ok("pending enrollment elsewhere allowed");

  // cleanup
  await db.from("driving_schools").delete().eq("user_id", ownerId);
  await db.auth.admin.deleteUser(ownerId);
  await db.auth.admin.deleteUser(studentId);

  if (fails.length) { console.error(`\n${fails.length} check(s) failed.`); process.exit(1); }
  console.log("\nAll booking-schema guarantees verified.");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/verify-booking-schema.mjs`
Expected: FAIL — tables `instructors`/`enrollments`/`bookings` (and `lesson_duration_min` column) do not exist yet; the script errors out before any "ok".

---

### Task 2: Write migration 006 — schema + indexes + exclusion constraint

**Files:**
- Create: `supabase/migrations/006_booking_engine.sql`

- [ ] **Step 1: Extensions + extend `driving_schools`**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- 006_booking_engine.sql — Booking engine v1
-- See docs/superpowers/specs/2026-06-26-booking-engine-design.md
-- instructors, enrollments, bookings + RLS + state-transition RPCs.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist;

alter table public.driving_schools
  add column if not exists lesson_duration_min int,
  add column if not exists booking_enabled     boolean not null default false;
```

- [ ] **Step 2: `instructors` table**

```sql
create table if not exists public.instructors (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.driving_schools(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists instructors_school_idx on public.instructors (school_id) where active;
```

- [ ] **Step 3: `enrollments` table + one-active-school index**

```sql
create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.driving_schools(id) on delete cascade,
  student_id   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','active','rejected','left')),
  licence_code text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  unique (school_id, student_id)
);

-- one student may be ACTIVE at only one school at a time
create unique index if not exists one_active_school_per_student
  on public.enrollments (student_id) where status = 'active';

create index if not exists enrollments_school_status_idx on public.enrollments (school_id, status);
create index if not exists enrollments_student_idx       on public.enrollments (student_id);
```

- [ ] **Step 4: `bookings` table + exclusion constraint**

```sql
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  student_id    uuid not null references auth.users(id) on delete cascade,
  instructor_id uuid references public.instructors(id) on delete set null,
  starts_at     timestamptz not null,
  duration_min  int not null check (duration_min > 0),
  ends_at       timestamptz generated always as (starts_at + make_interval(mins => duration_min)) stored,
  status        text not null default 'pending'
                check (status in ('pending','confirmed','declined','cancelled','completed')),
  cancelled_by  text check (cancelled_by in ('student','school')),
  cancel_reason text,
  licence_code  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  decided_at    timestamptz,
  -- a confirmed booking must have an instructor assigned
  constraint bookings_confirmed_needs_instructor
    check (status <> 'confirmed' or instructor_id is not null)
);

-- HARD GUARANTEE: no two confirmed lessons overlap for the same instructor
alter table public.bookings
  add constraint bookings_no_instructor_overlap
  exclude using gist (
    instructor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');

create index if not exists bookings_school_start_idx     on public.bookings (school_id, starts_at);
create index if not exists bookings_student_idx          on public.bookings (student_id, starts_at desc);
create index if not exists bookings_instructor_start_idx on public.bookings (instructor_id, starts_at);
create index if not exists bookings_status_idx           on public.bookings (school_id, status);
```

(Do not push yet — RLS + RPCs come next, in the same migration file.)

---

### Task 3: RLS policies (append to `006_booking_engine.sql`)

**Files:**
- Modify: `supabase/migrations/006_booking_engine.sql`

- [ ] **Step 1: Enable RLS + policies**

```sql
-- ──── RLS ────
alter table public.instructors enable row level security;
alter table public.enrollments enable row level security;
alter table public.bookings    enable row level security;

-- helper: is the current user an admin?
-- (reuse inline subquery to avoid a new function; matches 002 style)

-- instructors: school owner full; active-enrolled students may read
create policy "instructors_owner_all" on public.instructors
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
create policy "instructors_admin_all" on public.instructors
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "instructors_enrolled_read" on public.instructors
  for select using (
    exists (select 1 from public.enrollments e
            where e.school_id = instructors.school_id
              and e.student_id = auth.uid()
              and e.status = 'active')
  );

-- enrollments: student reads/inserts own; school owner reads own school; admin all
create policy "enrollments_student_read" on public.enrollments
  for select using (auth.uid() = student_id);
create policy "enrollments_student_insert" on public.enrollments
  for insert with check (auth.uid() = student_id and status = 'pending');
create policy "enrollments_owner_read" on public.enrollments
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
create policy "enrollments_admin_all" on public.enrollments
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- bookings: student reads own; school owner reads own school; admin all.
-- inserts/updates happen through RPCs (security definer), so no broad write policy.
create policy "bookings_student_read" on public.bookings
  for select using (auth.uid() = student_id);
create policy "bookings_owner_read" on public.bookings
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
create policy "bookings_admin_all" on public.bookings
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');
```

Note: state changes (`request_*`, `confirm_*`, etc.) are `security definer` RPCs and bypass RLS, so we deliberately do **not** add student/owner write policies on `bookings`/`enrollments`. The RPCs do their own authorization checks.

---

### Task 4: State-transition RPCs (append to `006_booking_engine.sql`)

**Files:**
- Modify: `supabase/migrations/006_booking_engine.sql`

- [ ] **Step 1: Enrollment RPCs**

```sql
-- ──── Enrollment RPCs ────

create or replace function public.request_enrollment(p_school_id uuid, p_licence_code text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if (select role from public.profiles where id = v_uid) <> 'student' then
    raise exception 'role_must_be_student';
  end if;

  insert into public.enrollments (school_id, student_id, status, licence_code)
  values (p_school_id, v_uid, 'pending', p_licence_code)
  on conflict (school_id, student_id) do update
    set status = case when public.enrollments.status in ('rejected','left')
                      then 'pending' else public.enrollments.status end,
        licence_code = excluded.licence_code
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_enrollment(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  select school_id into v_school from public.enrollments where id = p_enrollment_id;
  if v_school is null then raise exception 'enrollment_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  -- raises unique_violation 'one_active_school_per_student' if the student is active elsewhere
  update public.enrollments
    set status = 'active', decided_at = now()
    where id = p_enrollment_id and status = 'pending';
exception when unique_violation then
  raise exception 'student_active_elsewhere';
end;
$$;

create or replace function public.reject_enrollment(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  select school_id into v_school from public.enrollments where id = p_enrollment_id;
  if v_school is null then raise exception 'enrollment_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.enrollments set status = 'rejected', decided_at = now()
    where id = p_enrollment_id and status in ('pending','active');
end;
$$;
```

- [ ] **Step 2: Booking RPCs**

```sql
-- ──── Booking RPCs ────

create or replace function public.request_booking(p_school_id uuid, p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_duration int;
  v_enabled boolean;
  v_licence text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select lesson_duration_min, booking_enabled into v_duration, v_enabled
    from public.driving_schools where id = p_school_id;
  if v_enabled is not true then raise exception 'booking_disabled'; end if;
  if v_duration is null or v_duration <= 0 then raise exception 'lesson_duration_not_set'; end if;

  select licence_code into v_licence from public.enrollments
    where school_id = p_school_id and student_id = v_uid and status = 'active';
  if not found then raise exception 'not_enrolled'; end if;

  insert into public.bookings (school_id, student_id, starts_at, duration_min, status, licence_code)
  values (p_school_id, v_uid, p_starts_at, v_duration, 'pending', v_licence)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.confirm_booking(p_booking_id uuid, p_instructor_id uuid, p_starts_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  select school_id into v_school from public.bookings where id = p_booking_id;
  if v_school is null then raise exception 'booking_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  if (select school_id from public.instructors where id = p_instructor_id) <> v_school then
    raise exception 'instructor_not_in_school';
  end if;

  update public.bookings
    set instructor_id = p_instructor_id,
        starts_at     = coalesce(p_starts_at, starts_at),
        status        = 'confirmed',
        decided_at    = now(),
        updated_at    = now()
    where id = p_booking_id and status = 'pending';
  if not found then raise exception 'booking_not_pending'; end if;
exception when exclusion_violation then
  raise exception 'instructor_busy';
end;
$$;

create or replace function public.decline_booking(p_booking_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  select school_id into v_school from public.bookings where id = p_booking_id;
  if v_school is null then raise exception 'booking_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.bookings
    set status = 'declined', cancel_reason = p_reason, decided_at = now(), updated_at = now()
    where id = p_booking_id and status = 'pending';
  if not found then raise exception 'booking_not_pending'; end if;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid; v_student uuid; v_by text;
begin
  select school_id, student_id into v_school, v_student from public.bookings where id = p_booking_id;
  if v_school is null then raise exception 'booking_not_found'; end if;

  if auth.uid() = v_student then v_by := 'student';
  elsif auth.uid() = (select user_id from public.driving_schools where id = v_school) then v_by := 'school';
  elsif (select role from public.profiles where id = auth.uid()) = 'admin' then v_by := 'school';
  else raise exception 'forbidden';
  end if;

  update public.bookings
    set status = 'cancelled', cancelled_by = v_by, cancel_reason = p_reason, updated_at = now()
    where id = p_booking_id and status in ('pending','confirmed');
  if not found then raise exception 'booking_not_cancellable'; end if;
end;
$$;
```

- [ ] **Step 3: Push the migration**

Run: `supabase db push`
Expected: applies `006_booking_engine.sql` with no errors. If `supabase` is not linked, run `supabase link --project-ref dodwkggrwlydimlbmvgk` first.

- [ ] **Step 4: Run the integration check from Task 1 — now it should pass**

Run: `node scripts/verify-booking-schema.mjs`
Expected: PASS — every line prints `ok:` and the final `All booking-schema guarantees verified.`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/006_booking_engine.sql scripts/verify-booking-schema.mjs
git commit -m "feat(db): booking engine schema, RLS, and state-transition RPCs"
```

---

## Phase B — Typed lib layer

### Task 5: Shared types + pure helpers (TDD)

**Files:**
- Create: `src/lib/booking/types.ts`
- Create: `src/lib/booking/helpers.ts`
- Test: `src/lib/booking/helpers.test.ts`

- [ ] **Step 1: Write the types**

```ts
// src/lib/booking/types.ts
export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed";
export type EnrollmentStatus = "pending" | "active" | "rejected" | "left";

export interface Instructor {
  id: string;
  school_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  school_id: string;
  student_id: string;
  status: EnrollmentStatus;
  licence_code: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface Booking {
  id: string;
  school_id: string;
  student_id: string;
  instructor_id: string | null;
  starts_at: string;   // ISO
  duration_min: number;
  ends_at: string;     // ISO (generated)
  status: BookingStatus;
  cancelled_by: "student" | "school" | null;
  cancel_reason: string | null;
  licence_code: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}
```

- [ ] **Step 2: Write the failing helper tests**

```ts
// src/lib/booking/helpers.test.ts
import { describe, it, expect } from "vitest";
import { isCancellable, effectiveStatus, groupByDay, overlaps } from "./helpers";
import type { Booking } from "./types";

const mk = (over: Partial<Booking>): Booking => ({
  id: "b", school_id: "s", student_id: "u", instructor_id: null,
  starts_at: "2030-01-01T10:00:00Z", duration_min: 60, ends_at: "2030-01-01T11:00:00Z",
  status: "pending", cancelled_by: null, cancel_reason: null, licence_code: null,
  created_at: "", updated_at: "", decided_at: null, ...over,
});

describe("isCancellable", () => {
  it("allows pending and confirmed", () => {
    expect(isCancellable(mk({ status: "pending" }))).toBe(true);
    expect(isCancellable(mk({ status: "confirmed" }))).toBe(true);
  });
  it("blocks terminal states", () => {
    expect(isCancellable(mk({ status: "cancelled" }))).toBe(false);
    expect(isCancellable(mk({ status: "declined" }))).toBe(false);
    expect(isCancellable(mk({ status: "completed" }))).toBe(false);
  });
});

describe("effectiveStatus", () => {
  it("reports completed for past confirmed lessons", () => {
    const past = mk({ status: "confirmed", ends_at: "2000-01-01T11:00:00Z" });
    expect(effectiveStatus(past, new Date("2020-01-01T00:00:00Z"))).toBe("completed");
  });
  it("leaves future confirmed as confirmed", () => {
    const fut = mk({ status: "confirmed", ends_at: "2030-01-01T11:00:00Z" });
    expect(effectiveStatus(fut, new Date("2020-01-01T00:00:00Z"))).toBe("confirmed");
  });
  it("never rewrites non-confirmed statuses", () => {
    expect(effectiveStatus(mk({ status: "pending", ends_at: "2000-01-01T11:00:00Z" }), new Date())).toBe("pending");
  });
});

describe("overlaps", () => {
  it("detects overlap", () => {
    expect(overlaps(mk({}), mk({ starts_at: "2030-01-01T10:30:00Z", ends_at: "2030-01-01T11:30:00Z" }))).toBe(true);
  });
  it("treats touching edges as non-overlapping", () => {
    expect(overlaps(mk({}), mk({ starts_at: "2030-01-01T11:00:00Z", ends_at: "2030-01-01T12:00:00Z" }))).toBe(false);
  });
});

describe("groupByDay", () => {
  it("buckets bookings by ISO date", () => {
    const g = groupByDay([mk({ id: "a" }), mk({ id: "b", starts_at: "2030-01-02T09:00:00Z" })]);
    expect(Object.keys(g).sort()).toEqual(["2030-01-01", "2030-01-02"]);
    expect(g["2030-01-01"].map((x) => x.id)).toEqual(["a"]);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test -- src/lib/booking/helpers.test.ts`
Expected: FAIL — `./helpers` has no such exports.

- [ ] **Step 4: Implement helpers**

```ts
// src/lib/booking/helpers.ts
import type { Booking, BookingStatus } from "./types";

export function isCancellable(b: Booking): boolean {
  return b.status === "pending" || b.status === "confirmed";
}

/** Confirmed lessons whose end is in the past read as completed; everything else unchanged. */
export function effectiveStatus(b: Booking, now: Date = new Date()): BookingStatus {
  if (b.status === "confirmed" && new Date(b.ends_at).getTime() <= now.getTime()) return "completed";
  return b.status;
}

/** Half-open interval overlap [start, end). Touching edges do not overlap. */
export function overlaps(a: Booking, b: Booking): boolean {
  return new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);
}

/** Group bookings by local-independent ISO date (UTC day). */
export function groupByDay(bookings: Booking[]): Record<string, Booking[]> {
  const out: Record<string, Booking[]> = {};
  for (const b of bookings) {
    const day = b.starts_at.slice(0, 10);
    (out[day] ??= []).push(b);
  }
  for (const day of Object.keys(out)) {
    out[day].sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  }
  return out;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test -- src/lib/booking/helpers.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/booking/types.ts src/lib/booking/helpers.ts src/lib/booking/helpers.test.ts
git commit -m "feat(booking): shared types and pure helpers with tests"
```

---

### Task 6: Supabase wrappers

**Files:**
- Create: `src/lib/booking/api.ts`

These are thin wrappers; no test (no logic beyond passthrough). Each returns `{ data, error }`-style or throws on RPC error, consistent with existing usage of `supabase` in the codebase.

- [ ] **Step 1: Implement api.ts**

```ts
// src/lib/booking/api.ts
import { supabase } from "@/lib/supabase";
import type { Booking, Enrollment, Instructor } from "./types";

// ── reads ──
export async function listSchoolBookings(schoolId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings")
    .select("*").eq("school_id", schoolId).order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Booking[];
}
export async function listMyBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings")
    .select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}
export async function listInstructors(schoolId: string): Promise<Instructor[]> {
  const { data, error } = await supabase.from("instructors")
    .select("*").eq("school_id", schoolId).order("name");
  if (error) throw error;
  return (data ?? []) as Instructor[];
}
export async function listSchoolEnrollments(schoolId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase.from("enrollments")
    .select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}
export async function getMyEnrollment(): Promise<Enrollment | null> {
  const { data, error } = await supabase.from("enrollments")
    .select("*").in("status", ["pending", "active"]).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Enrollment) ?? null;
}

// ── instructor CRUD (RLS-guarded direct writes) ──
export async function addInstructor(schoolId: string, name: string): Promise<void> {
  const { error } = await supabase.from("instructors").insert({ school_id: schoolId, name });
  if (error) throw error;
}
export async function setInstructorActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("instructors").update({ active }).eq("id", id);
  if (error) throw error;
}

// ── service settings (RLS-guarded; owner policy on driving_schools) ──
export async function setServiceSettings(schoolId: string, durationMin: number, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("driving_schools")
    .update({ lesson_duration_min: durationMin, booking_enabled: enabled }).eq("id", schoolId);
  if (error) throw error;
}

// ── RPC mutations (throw on error; caller maps .message to i18n) ──
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
};
export const requestEnrollment = (schoolId: string, licence?: string) =>
  rpc("request_enrollment", { p_school_id: schoolId, p_licence_code: licence ?? null });
export const approveEnrollment = (id: string) => rpc("approve_enrollment", { p_enrollment_id: id });
export const rejectEnrollment  = (id: string) => rpc("reject_enrollment", { p_enrollment_id: id });
export const requestBooking = (schoolId: string, startsAt: string) =>
  rpc("request_booking", { p_school_id: schoolId, p_starts_at: startsAt });
export const confirmBooking = (id: string, instructorId: string, startsAt?: string) =>
  rpc("confirm_booking", { p_booking_id: id, p_instructor_id: instructorId, p_starts_at: startsAt ?? null });
export const declineBooking = (id: string, reason?: string) =>
  rpc("decline_booking", { p_booking_id: id, p_reason: reason ?? null });
export const cancelBooking = (id: string, reason?: string) =>
  rpc("cancel_booking", { p_booking_id: id, p_reason: reason ?? null });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors in `src/lib/booking/`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/api.ts
git commit -m "feat(booking): supabase api wrappers"
```

---

### Task 7: i18n keys

**Files:**
- Modify: `src/i18n/locales/it.json`, `src/i18n/locales/en.json`, `src/i18n/locales/ar.json`

- [ ] **Step 1: Add the `booking` namespace to `it.json`** (top-level key, tab-indented like the rest)

```json
	"booking": {
		"enroll": {
			"cta": "Iscriviti a questa autoscuola",
			"pending": "Richiesta inviata, in attesa di conferma",
			"active": "Sei iscritto",
			"error": "Impossibile inviare la richiesta"
		},
		"book": {
			"title": "Prenota una guida",
			"date": "Data",
			"time": "Ora",
			"duration": "Durata: {{min}} min",
			"submit": "Richiedi guida",
			"success": "Richiesta inviata",
			"notEnrolled": "Devi essere iscritto per prenotare",
			"disabled": "Le prenotazioni non sono attive",
			"error": "Impossibile inviare la richiesta"
		},
		"mine": {
			"title": "Le mie guide",
			"empty": "Nessuna guida ancora",
			"cancel": "Annulla",
			"cancelReason": "Motivo (facoltativo)",
			"status": {
				"pending": "In attesa",
				"confirmed": "Confermata",
				"declined": "Rifiutata",
				"cancelled": "Annullata",
				"completed": "Completata"
			}
		},
		"school": {
			"requests": "Richieste di guida",
			"noRequests": "Nessuna richiesta",
			"assignInstructor": "Assegna istruttore",
			"confirm": "Conferma",
			"decline": "Rifiuta",
			"instructorBusy": "Istruttore già occupato in quella fascia",
			"enrollments": "Richieste di iscrizione",
			"approve": "Approva",
			"reject": "Rifiuta",
			"activeElsewhere": "Lo studente è già iscritto a un'altra autoscuola",
			"calendar": "Calendario",
			"instructors": "Istruttori",
			"addInstructor": "Aggiungi istruttore",
			"instructorName": "Nome istruttore",
			"settings": "Impostazioni prenotazioni",
			"durationLabel": "Durata guida (minuti)",
			"enabledLabel": "Prenotazioni attive",
			"save": "Salva"
		}
	},
```

- [ ] **Step 2: Add the English mirror to `en.json`** (same shape, English copy)

```json
	"booking": {
		"enroll": { "cta": "Enroll at this school", "pending": "Request sent, awaiting approval", "active": "You're enrolled", "error": "Could not send request" },
		"book": { "title": "Book a lesson", "date": "Date", "time": "Time", "duration": "Duration: {{min}} min", "submit": "Request lesson", "success": "Request sent", "notEnrolled": "You must be enrolled to book", "disabled": "Booking is not active", "error": "Could not send request" },
		"mine": { "title": "My lessons", "empty": "No lessons yet", "cancel": "Cancel", "cancelReason": "Reason (optional)", "status": { "pending": "Pending", "confirmed": "Confirmed", "declined": "Declined", "cancelled": "Cancelled", "completed": "Completed" } },
		"school": { "requests": "Lesson requests", "noRequests": "No requests", "assignInstructor": "Assign instructor", "confirm": "Confirm", "decline": "Decline", "instructorBusy": "Instructor already booked in that slot", "enrollments": "Enrollment requests", "approve": "Approve", "reject": "Reject", "activeElsewhere": "Student is already enrolled at another school", "calendar": "Calendar", "instructors": "Instructors", "addInstructor": "Add instructor", "instructorName": "Instructor name", "settings": "Booking settings", "durationLabel": "Lesson duration (minutes)", "enabledLabel": "Booking active", "save": "Save" }
	},
```

- [ ] **Step 3: Add the same English block to `ar.json`** (placeholder parity for v1; translation can follow later).

- [ ] **Step 4: Verify JSON validity + typecheck**

Run: `pnpm exec biome check src/i18n/locales` then `pnpm build` is not needed yet; just `node -e "['it','en','ar'].forEach(l=>require('./src/i18n/locales/'+l+'.json'))"`
Expected: no JSON parse errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/it.json src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat(i18n): booking namespace (it/en/ar)"
```

---

## Phase C — UI surfaces

> All components import from `@/lib/booking/api`, `@/lib/booking/types`, `@/lib/booking/helpers`, and `useTranslation()`. Error handling: catch the thrown error, map known `error.message` codes (e.g. `instructor_busy`, `student_active_elsewhere`, `not_enrolled`, `booking_disabled`) to the i18n strings above; otherwise show a generic error. Match the existing Tailwind token classes seen in `DrivingSchoolDashboard.tsx` (`bg-bg`, `border-line`, `text-ink`, `bg-brand-soft`, etc.).

### Task 8: School — ServiceSettings

**Files:**
- Create: `src/components/booking/ServiceSettings.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/ServiceSettings.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setServiceSettings } from "@/lib/booking/api";

export function ServiceSettings({ schoolId, initialDuration, initialEnabled, onSaved }: {
  schoolId: string; initialDuration: number | null; initialEnabled: boolean; onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const [duration, setDuration] = useState(initialDuration ?? 60);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    try { await setServiceSettings(schoolId, duration, enabled); onSaved?.(); }
    catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.settings")}</h3>
      <label className="mt-4 block text-sm">
        {t("booking.school.durationLabel")}
        <input type="number" min={15} step={15} value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-1 block w-32 rounded-md border border-line bg-bg px-3 py-1.5" />
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("booking.school.enabledLabel")}
      </label>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button type="button" onClick={save} disabled={saving}
        className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {t("booking.school.save")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `pnpm exec tsc -b --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git add src/components/booking/ServiceSettings.tsx && git commit -m "feat(booking): school service settings"`

---

### Task 9: School — InstructorsManager

**Files:**
- Create: `src/components/booking/InstructorsManager.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/InstructorsManager.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addInstructor, listInstructors, setInstructorActive } from "@/lib/booking/api";
import type { Instructor } from "@/lib/booking/types";

export function InstructorsManager({ schoolId }: { schoolId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Instructor[]>([]);
  const [name, setName] = useState("");
  const load = () => listInstructors(schoolId).then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, [schoolId]);

  const add = async () => {
    if (!name.trim()) return;
    await addInstructor(schoolId, name.trim());
    setName(""); await load();
  };
  const toggle = async (i: Instructor) => { await setInstructorActive(i.id, !i.active); await load(); };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.instructors")}</h3>
      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t("booking.school.instructorName")}
          className="flex-1 rounded-md border border-line bg-bg px-3 py-1.5 text-sm" />
        <button type="button" onClick={add} className="rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-white">
          {t("booking.school.addInstructor")}
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between py-2 text-sm">
            <span className={i.active ? "text-ink" : "text-ink-faint line-through"}>{i.name}</span>
            <button type="button" onClick={() => toggle(i)} className="text-xs text-ink-muted hover:text-brand">
              {i.active ? "✓" : "—"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): instructors manager"`

---

### Task 10: School — EnrollmentsInbox

**Files:**
- Create: `src/components/booking/EnrollmentsInbox.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/EnrollmentsInbox.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { approveEnrollment, listSchoolEnrollments, rejectEnrollment } from "@/lib/booking/api";
import type { Enrollment } from "@/lib/booking/types";

export function EnrollmentsInbox({ schoolId }: { schoolId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Enrollment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = () => listSchoolEnrollments(schoolId).then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, [schoolId]);

  const pending = items.filter((e) => e.status === "pending");
  const act = async (fn: () => Promise<unknown>, busyCode = "student_active_elsewhere") => {
    setErr(null);
    try { await fn(); await load(); }
    catch (e) {
      const m = (e as Error).message;
      setErr(m === busyCode ? t("booking.school.activeElsewhere") : m);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.enrollments")}</h3>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <ul className="mt-4 divide-y divide-line">
        {pending.map((e) => (
          <li key={e.id} className="flex items-center justify-between py-3 text-sm">
            <span className="text-ink">{e.student_id.slice(0, 8)} · {e.licence_code ?? "—"}</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => act(() => approveEnrollment(e.id))}
                className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white">{t("booking.school.approve")}</button>
              <button type="button" onClick={() => act(() => rejectEnrollment(e.id))}
                className="rounded-md border border-line px-3 py-1 text-xs">{t("booking.school.reject")}</button>
            </span>
          </li>
        ))}
        {pending.length === 0 && <li className="py-3 text-sm text-ink-faint">{t("booking.school.noRequests")}</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): enrollments inbox"`

---

### Task 11: School — RequestsInbox (confirm with instructor assignment)

**Files:**
- Create: `src/components/booking/RequestsInbox.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/RequestsInbox.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmBooking, declineBooking, listInstructors, listSchoolBookings } from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";

export function RequestsInbox({ schoolId, onChange }: { schoolId: string; onChange?: () => void }) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const [b, i] = await Promise.all([listSchoolBookings(schoolId), listInstructors(schoolId)]);
    setBookings(b); setInstructors(i.filter((x) => x.active));
  };
  useEffect(() => { void load().catch(() => {}); }, [schoolId]);

  const pending = bookings.filter((b) => b.status === "pending");
  const confirm = async (b: Booking) => {
    setErr(null);
    const instructorId = picked[b.id];
    if (!instructorId) { setErr(t("booking.school.assignInstructor")); return; }
    try { await confirmBooking(b.id, instructorId); await load(); onChange?.(); }
    catch (e) {
      const m = (e as Error).message;
      setErr(m === "instructor_busy" ? t("booking.school.instructorBusy") : m);
    }
  };
  const decline = async (b: Booking) => { await declineBooking(b.id); await load(); onChange?.(); };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.requests")}</h3>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <ul className="mt-4 divide-y divide-line">
        {pending.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="text-ink">{new Date(b.starts_at).toLocaleString()} · {b.duration_min}m</span>
            <span className="flex items-center gap-2">
              <select value={picked[b.id] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [b.id]: e.target.value }))}
                className="rounded-md border border-line bg-bg px-2 py-1 text-xs">
                <option value="">{t("booking.school.assignInstructor")}</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <button type="button" onClick={() => confirm(b)}
                className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white">{t("booking.school.confirm")}</button>
              <button type="button" onClick={() => decline(b)}
                className="rounded-md border border-line px-3 py-1 text-xs">{t("booking.school.decline")}</button>
            </span>
          </li>
        ))}
        {pending.length === 0 && <li className="py-3 text-sm text-ink-faint">{t("booking.school.noRequests")}</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): requests inbox with instructor assignment"`

---

### Task 12: School — WeekCalendar

**Files:**
- Create: `src/components/booking/WeekCalendar.tsx`

A simple 7-column week grid of confirmed lessons. No external calendar lib. Uses `groupByDay`.

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/WeekCalendar.tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Booking, Instructor } from "@/lib/booking/types";
import { groupByDay } from "@/lib/booking/helpers";

function weekDays(from: Date): string[] {
  const monday = new Date(from);
  const day = (monday.getUTCDay() + 6) % 7; // 0 = Monday
  monday.setUTCDate(monday.getUTCDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function WeekCalendar({ bookings, instructors, weekStart }: {
  bookings: Booking[]; instructors: Instructor[]; weekStart: Date;
}) {
  const { t } = useTranslation();
  const confirmed = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);
  const byDay = useMemo(() => groupByDay(confirmed), [confirmed]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const nameOf = (id: string | null) => instructors.find((i) => i.id === id)?.name ?? "—";

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-4">
      <h3 className="mb-3 font-sans text-lg font-black text-ink">{t("booking.school.calendar")}</h3>
      <div className="grid grid-cols-7 gap-2 text-xs">
        {days.map((day) => (
          <div key={day} className="min-h-24 rounded-lg border border-line p-2">
            <div className="mb-1 font-bold text-ink-muted">{day.slice(5)}</div>
            {(byDay[day] ?? []).map((b) => (
              <div key={b.id} className="mb-1 rounded bg-brand-soft px-1.5 py-1 text-brand-ink">
                {new Date(b.starts_at).toISOString().slice(11, 16)} · {nameOf(b.instructor_id)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): week calendar grid"`

---

### Task 13: Student — EnrollButton

**Files:**
- Create: `src/components/booking/EnrollButton.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/EnrollButton.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyEnrollment, requestEnrollment } from "@/lib/booking/api";

export function EnrollButton({ schoolId, licenceCode }: { schoolId: string; licenceCode?: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"none" | "pending" | "active">("none");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMyEnrollment().then((e) => {
      if (e && e.school_id === schoolId) setStatus(e.status === "active" ? "active" : "pending");
    }).catch(() => {});
  }, [schoolId]);

  const enroll = async () => {
    setErr(null);
    try { await requestEnrollment(schoolId, licenceCode); setStatus("pending"); }
    catch (e) { setErr((e as Error).message); }
  };

  if (status === "active") return <span className="text-sm font-bold text-brand-ink">{t("booking.enroll.active")}</span>;
  if (status === "pending") return <span className="text-sm text-ink-muted">{t("booking.enroll.pending")}</span>;
  return (
    <div>
      <button type="button" onClick={enroll} className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white">
        {t("booking.enroll.cta")}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{t("booking.enroll.error")}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): enroll button"`

---

### Task 14: Student — BookLessonForm

**Files:**
- Create: `src/components/booking/BookLessonForm.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/BookLessonForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestBooking } from "@/lib/booking/api";

export function BookLessonForm({ schoolId, durationMin, onBooked }: {
  schoolId: string; durationMin: number; onBooked?: () => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!date || !time) return;
    setBusy(true); setErr(null); setMsg(null);
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    try {
      await requestBooking(schoolId, startsAt);
      setMsg(t("booking.book.success")); onBooked?.();
    } catch (e) {
      const code = (e as Error).message;
      const map: Record<string, string> = {
        not_enrolled: t("booking.book.notEnrolled"),
        booking_disabled: t("booking.book.disabled"),
      };
      setErr(map[code] ?? t("booking.book.error"));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.book.title")}</h3>
      <p className="mt-1 text-xs text-ink-muted">{t("booking.book.duration", { min: durationMin })}</p>
      <div className="mt-4 flex gap-2">
        <label className="text-sm">{t("booking.book.date")}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-md border border-line bg-bg px-3 py-1.5" /></label>
        <label className="text-sm">{t("booking.book.time")}
          <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)}
            className="mt-1 block rounded-md border border-line bg-bg px-3 py-1.5" /></label>
      </div>
      {msg && <p className="mt-3 text-sm text-brand-ink">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button type="button" onClick={submit} disabled={busy}
        className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {t("booking.book.submit")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): book lesson form"`

---

### Task 15: Student — MyLessons

**Files:**
- Create: `src/components/booking/MyLessons.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/booking/MyLessons.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cancelBooking, listMyBookings } from "@/lib/booking/api";
import { effectiveStatus, isCancellable } from "@/lib/booking/helpers";
import type { Booking } from "@/lib/booking/types";

export function MyLessons({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Booking[]>([]);
  const load = () => listMyBookings().then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, [refreshKey]);

  const cancel = async (b: Booking) => {
    const reason = window.prompt(t("booking.mine.cancelReason")) ?? undefined;
    await cancelBooking(b.id, reason); await load();
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.mine.title")}</h3>
      <ul className="mt-4 divide-y divide-line">
        {items.map((b) => {
          const st = effectiveStatus(b);
          return (
            <li key={b.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-ink">{new Date(b.starts_at).toLocaleString()}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-ink-muted">{t(`booking.mine.status.${st}`)}</span>
                {isCancellable(b) && (
                  <button type="button" onClick={() => cancel(b)}
                    className="rounded-md border border-line px-3 py-1 text-xs">{t("booking.mine.cancel")}</button>
                )}
              </span>
            </li>
          );
        })}
        {items.length === 0 && <li className="py-3 text-sm text-ink-faint">{t("booking.mine.empty")}</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat(booking): my lessons list with cancel"`

---

### Task 16: Mount school surfaces in DrivingSchoolDashboard

**Files:**
- Modify: `src/routes/DrivingSchoolDashboard.tsx`

The dashboard already fetches the owner's claim and renders only when `approved`. Extend the approved branch to (a) fetch the school's `id`, `lesson_duration_min`, `booking_enabled`, and (b) render the booking surfaces below the existing metrics block.

- [ ] **Step 1: Extend the claim fetch to include id + settings**

In `fetchClaim`, change the select and the `ClaimRow` interface:

```tsx
interface ClaimRow {
  id: string;
  status: "pending" | "accepted" | "rejected";
  name: string;
  lesson_duration_min: number | null;
  booking_enabled: boolean;
}
```

```tsx
const { data } = await supabase
  .from("driving_schools")
  .select("id, status, name, lesson_duration_min, booking_enabled")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Note: the existing `!approved` branch reads `claim?.status === "pending"`; the new fields are nullable and don't affect that path.

- [ ] **Step 2: Render booking surfaces in the approved branch**

Add imports at top:

```tsx
import { useState } from "react";
import { ServiceSettings } from "@/components/booking/ServiceSettings";
import { InstructorsManager } from "@/components/booking/InstructorsManager";
import { EnrollmentsInbox } from "@/components/booking/EnrollmentsInbox";
import { RequestsInbox } from "@/components/booking/RequestsInbox";
import { WeekCalendar } from "@/components/booking/WeekCalendar";
import { listSchoolBookings, listInstructors } from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";
```

Inside the component (approved branch only renders when `claim?.id` exists), add a small effect to load calendar data and a refresh counter. Insert this block just before the closing `</DrivingSchoolLayout>`:

```tsx
{claim?.id && (
  <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <ServiceSettings
      schoolId={claim.id}
      initialDuration={claim.lesson_duration_min}
      initialEnabled={claim.booking_enabled}
      onSaved={handleRefresh}
    />
    <InstructorsManager schoolId={claim.id} />
    <EnrollmentsInbox schoolId={claim.id} />
    <RequestsInbox schoolId={claim.id} onChange={() => setCalRefresh((n) => n + 1)} />
    <div className="lg:col-span-2">
      <CalendarPane schoolId={claim.id} refreshKey={calRefresh} />
    </div>
  </div>
)}
```

Add `const [calRefresh, setCalRefresh] = useState(0);` near the other `useState` hooks, and define `CalendarPane` at the bottom of the file:

```tsx
function CalendarPane({ schoolId, refreshKey }: { schoolId: string; refreshKey: number }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  useEffect(() => {
    Promise.all([listSchoolBookings(schoolId), listInstructors(schoolId)])
      .then(([b, i]) => { setBookings(b); setInstructors(i); })
      .catch(() => {});
  }, [schoolId, refreshKey]);
  return <WeekCalendar bookings={bookings} instructors={instructors} weekStart={new Date()} />;
}
```

- [ ] **Step 3: Typecheck + lint** — `pnpm exec tsc -b --noEmit && pnpm exec biome check src/routes/DrivingSchoolDashboard.tsx` → no errors.
- [ ] **Step 4: Commit** — `git commit -am "feat(booking): mount school booking surfaces in dashboard"`

---

### Task 17: Mount student surfaces in StudentDashboard

**Files:**
- Modify: `src/routes/StudentDashboard.tsx`

- [ ] **Step 1: Read the current file** to find the main content container.

Run: `sed -n '1,60p' src/routes/StudentDashboard.tsx` — identify where the page body renders.

- [ ] **Step 2: Add student booking surfaces**

Add imports:

```tsx
import { useState, useEffect } from "react";
import { MyLessons } from "@/components/booking/MyLessons";
import { BookLessonForm } from "@/components/booking/BookLessonForm";
import { EnrollButton } from "@/components/booking/EnrollButton";
import { getMyEnrollment } from "@/lib/booking/api";
import { supabase } from "@/lib/supabase";
import type { Enrollment } from "@/lib/booking/types";
```

Add a panel that adapts to enrollment state and render it in the page body:

```tsx
function StudentBookingPanel() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    getMyEnrollment().then(async (e) => {
      setEnrollment(e);
      if (e?.status === "active") {
        const { data } = await supabase.from("driving_schools")
          .select("lesson_duration_min").eq("id", e.school_id).maybeSingle();
        if (data?.lesson_duration_min) setDurationMin(data.lesson_duration_min);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {enrollment?.status === "active" && (
        <BookLessonForm schoolId={enrollment.school_id} durationMin={durationMin}
          onBooked={() => setRefresh((n) => n + 1)} />
      )}
      <MyLessons refreshKey={refresh} />
    </div>
  );
}
```

Render `<StudentBookingPanel />` inside the existing dashboard body. (Enrollment itself is initiated from the school's page via `EnrollButton`; see Task 18.)

- [ ] **Step 3: Typecheck + lint** → no errors.
- [ ] **Step 4: Commit** — `git commit -am "feat(booking): mount student booking surfaces in dashboard"`

---

### Task 18: Place EnrollButton on the school detail surface

**Files:**
- Modify: the school detail/result view in `src/routes/Cerca.tsx` (search results) **or** the school card component it renders.

- [ ] **Step 1: Locate where a single accepted school is shown to a logged-in student.**

Run: `grep -rn "driving_schools" src/routes/Cerca.tsx src/components | head` and identify the school detail/card render.

- [ ] **Step 2: Render `<EnrollButton schoolId={school.id} licenceCode={selectedLicence} />`** in that view, gated to logged-in students (use `useProfile()` → `role === "student"`). If no licence selection exists in that view, pass no `licenceCode` (it is optional).

- [ ] **Step 3: Typecheck + lint** → no errors.
- [ ] **Step 4: Commit** — `git commit -am "feat(booking): enroll button on school detail"`

---

## Phase D — Notifications

### Task 19: `notify` edge function

**Files:**
- Create: `supabase/functions/notify/index.ts`

Single function, switches on `event`, renders subject/body, sends via Resend. Recipient email is passed in by the caller (the app knows the logged-in user's email and can look up the school's `email`).

- [ ] **Step 1: Implement**

```ts
// supabase/functions/notify/index.ts
// Deploy: supabase functions deploy notify
// Secret:  supabase secrets set RESEND_API_KEY=...
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Event =
  | "enrollment_requested" | "enrollment_approved"
  | "booking_requested" | "booking_confirmed" | "booking_declined" | "booking_cancelled";

const SUBJECTS: Record<Event, string> = {
  enrollment_requested: "Nuova richiesta di iscrizione",
  enrollment_approved: "Iscrizione approvata",
  booking_requested: "Nuova richiesta di guida",
  booking_confirmed: "Guida confermata",
  booking_declined: "Guida rifiutata",
  booking_cancelled: "Guida annullata",
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  try {
    const { event, to, body } = await req.json() as { event: Event; to: string; body?: string };
    const subject = SUBJECTS[event];
    if (!subject || !to) return new Response("bad request", { status: 400 });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return new Response("no provider", { status: 500 });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Patentedigitale <noreply@patentedigitale.it>",
        to, subject,
        html: `<p>${subject}.</p>${body ? `<p>${body}</p>` : ""}<p>— Patentedigitale.it</p>`,
      }),
    });
    if (!res.ok) return new Response(await res.text(), { status: 502 });
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
```

- [ ] **Step 2: Deploy + set secret**

Run:
```bash
supabase secrets set RESEND_API_KEY=<key>
supabase functions deploy notify
```
Expected: function deploys; `supabase functions list` shows `notify`.

- [ ] **Step 3: Commit** — `git add supabase/functions/notify/index.ts && git commit -m "feat(notify): transactional email edge function"`

---

### Task 20: Wire notifications into the api layer (non-blocking)

**Files:**
- Modify: `src/lib/booking/api.ts`

- [ ] **Step 1: Add a fire-and-forget notify helper**

```ts
// add to src/lib/booking/api.ts
async function notify(event: string, to: string | null | undefined, body?: string) {
  if (!to) return;
  try { await supabase.functions.invoke("notify", { body: { event, to, body } }); }
  catch { /* email is best-effort; never block the user action */ }
}
```

- [ ] **Step 2: Call `notify` after the relevant mutations**

After each RPC resolves, fire the matching event. The caller must pass the recipient address; add an optional `to` parameter where the calling component already has it (student email from `useAuth().user?.email`; school email from the fetched `driving_schools.email`). Example for confirm/decline/cancel — extend signatures:

```ts
export const confirmBooking = async (id: string, instructorId: string, startsAt?: string, studentEmail?: string) => {
  await rpc("confirm_booking", { p_booking_id: id, p_instructor_id: instructorId, p_starts_at: startsAt ?? null });
  await notify("booking_confirmed", studentEmail);
};
```

Apply the same pattern to `declineBooking` (→ student), `cancelBooking` (→ other side), `requestBooking` (→ school email), `requestEnrollment` (→ school email), `approveEnrollment` (→ student email). Update the calling components (Tasks 11, 13, 14, 15) to pass the address they already hold.

- [ ] **Step 3: Typecheck** → no errors.
- [ ] **Step 4: Commit** — `git commit -am "feat(booking): fire transactional notifications after mutations"`

---

## Phase E — End-to-end verification

### Task 21: Playwright happy-path e2e

**Files:**
- Create: `e2e/booking.spec.ts`

Covers: school enables booking + adds instructor → student enrolls → school approves → student books → school confirms (instructor assigned) → student cancels. Use the existing e2e auth/setup conventions in `e2e/` (inspect a sibling spec first: `ls e2e && sed -n '1,40p' e2e/*.spec.ts`). Seed two accounts (one `autoscuola`, one `student`) via the service-role key in a `beforeAll`, mirroring `scripts/verify-booking-schema.mjs`.

- [ ] **Step 1: Inspect existing e2e patterns** — `ls e2e && sed -n '1,60p' e2e/$(ls e2e | grep spec | head -1)`.

- [ ] **Step 2: Write the spec** following those patterns. Assertions, in order:
  - school dashboard: toggle `booking_enabled`, set duration 60, add instructor "Mario" → both visible after reload.
  - student: enroll → status shows pending.
  - school: approve enrollment → disappears from pending.
  - student: submit BookLessonForm for a future slot → success message; lesson appears in MyLessons as `pending`.
  - school: RequestsInbox shows the request; pick "Mario", confirm → request clears; WeekCalendar shows the slot.
  - student: MyLessons shows `confirmed`; cancel → status `cancelled`.

- [ ] **Step 3: Run** — `pnpm test:e2e -- booking.spec.ts`
Expected: PASS.

- [ ] **Step 4: Run the full suite + build to catch regressions**

Run: `pnpm test && pnpm build`
Expected: unit tests pass; SSR build + prerender succeed.

- [ ] **Step 5: Commit** — `git add e2e/booking.spec.ts && git commit -m "test(e2e): booking happy path"`

---

## Self-Review notes (spec coverage)

- **In-platform + Supabase** → Phase A migration on the linked project; no standalone app. ✓
- **Request → school confirms** → `request_booking` + `confirm_booking`; no instant-book path. ✓
- **Instructors modeled + overlap solved hard** → `instructors` table + `bookings_no_instructor_overlap` exclusion constraint (Task 2/Task 1 proves it). ✓
- **Logged-in students only** → student-role checks in RPCs + route guards. ✓
- **Enrolled students only** → `request_booking` requires an `active` enrollment. ✓
- **Enrollment: student requests, school approves** → `request_enrollment` / `approve_enrollment`. ✓
- **One active school per student** → `one_active_school_per_student` partial unique index + `student_active_elsewhere` error surfaced. ✓
- **Cancellation either side, free, with reason, frees slot** → `cancel_booking` (records `cancelled_by`/`cancel_reason`); exclusion is scoped to `confirmed`, so cancel frees the slot. ✓
- **Notifications in-app + email** → in-app inboxes/lists (Phase C) + `notify` edge function + wiring (Phase D). ✓
- **Lesson: date+time + fixed duration set by school at setup** → `ServiceSettings` writes `lesson_duration_min`; `request_booking` snapshots it; `BookLessonForm` collects date+time. ✓
