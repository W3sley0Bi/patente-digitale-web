# Students Table Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `enrollments` with a central `students` table whose rows optionally link to an auth user, so schools can manually add unregistered students who still receive booking emails; students later claim their row via token or invite-flow email match.

**Architecture:** One migration (`025_students_table.sql`) creates `students`, backfills from `enrollments` (reusing ids), repoints `bookings.student_id` to `students.id`, rewrites RLS + every RPC that touched student identity, adds `add_student_manual` / `claim_student_record` / `remove_student`, and drops `enrollments`. The notify and calendar-feed edge functions switch to the email-resolution rule (auth email when claimed, `students.email` when not). Frontend changes concentrate in `src/lib/booking/api.ts` + `types.ts`, the school students page (add dialog, unclaimed badge, claim-link copy), StudentEditSheet (email editable while unclaimed), and a new claim route.

**Tech Stack:** Supabase (Postgres migrations, SECURITY DEFINER RPCs, Deno edge functions), React + TypeScript + Vite, vitest, react-i18next.

**Spec:** `docs/superpowers/specs/2026-07-05-students-table-rework-design.md`

**Verification commands used throughout:**
- Frontend: `npx vitest run` (all tests), `npx tsc --noEmit`
- DB: apply migration to the dev Supabase project via Supabase MCP `apply_migration`, verify with `execute_sql`. If using the CLI instead: `supabase db push`, verify with `supabase db execute` / psql.

---

### Task 1: Migration — schema, backfill, repoint, RLS

**Files:**
- Create: `supabase/migrations/025_students_table.sql` (part 1 of the file; Task 2 appends the RPC section to the SAME file before it is applied in Task 3)

- [ ] **Step 1: Record pre-migration counts (for the Task 3 verification)**

Run against the dev project (Supabase MCP `execute_sql`):

```sql
select
  (select count(*) from public.enrollments) as enrollments,
  (select count(*) from public.bookings)    as bookings;
```

Note the two numbers; Task 3 asserts they are preserved.

- [ ] **Step 2: Write part 1 of the migration**

Create `supabase/migrations/025_students_table.sql` with exactly:

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- 025_students_table.sql — replace enrollments with a central students table.
-- See docs/superpowers/specs/2026-07-05-students-table-rework-design.md
--   • students: one row per student↔school relationship; auth_user_id NULLABLE
--     so schools can add students who never signed up ("unclaimed").
--   • bookings.student_id repointed auth.users(id) → students(id), on delete restrict.
--   • Claim: token RPC (deterministic) or email match inside request_enrollment.
--   • Email resolution rule: claimed → auth.users.email; unclaimed → students.email.
-- ════════════════════════════════════════════════════════════════════════════

-- ──── 1. students table ────

create table public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  auth_user_id  uuid references auth.users(id) on delete set null,
  full_name     text,
  email         text,   -- contact email for UNCLAIMED rows only; NULL once claimed
  phone         text,
  licence_code  text,
  status        text not null default 'pending'
                check (status in ('pending','active','rejected','left')),
  source        text not null default 'self'
                check (source in ('self','manual')),
  claim_token   uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  -- unclaimed students must be reachable by email
  constraint students_unclaimed_needs_email
    check (auth_user_id is not null or email is not null)
);

comment on column public.students.email is
  'Contact email while unclaimed. NULL once auth_user_id is set: claimed rows resolve email from auth.users.';

-- claimed: one row per (school, auth user). Partial: NULLs (manual rows) unlimited.
create unique index students_school_authuser_uq
  on public.students (school_id, auth_user_id) where auth_user_id is not null;

-- one ACTIVE enrollment per auth user across all schools (kept from enrollments)
create unique index students_one_active_per_user
  on public.students (auth_user_id) where status = 'active' and auth_user_id is not null;

-- no duplicate manual adds of the same email within one school
create unique index students_school_email_unclaimed_uq
  on public.students (school_id, lower(email)) where auth_user_id is null;

create index students_school_status_idx on public.students (school_id, status);
create index students_authuser_idx      on public.students (auth_user_id);
create index students_claim_token_idx   on public.students (claim_token);

-- ──── 2. backfill from enrollments (reuse ids → trivial bookings remap) ────

insert into public.students
  (id, school_id, auth_user_id, full_name, email, phone, licence_code,
   status, source, created_at, decided_at)
select e.id, e.school_id, e.student_id, p.full_name, null, p.phone,
       e.licence_code, e.status, 'self', e.created_at, e.decided_at
from public.enrollments e
left join public.profiles p on p.id = e.student_id;

-- ──── 3. repoint bookings.student_id ────

alter table public.bookings drop constraint bookings_student_id_fkey;

update public.bookings b
  set student_id = s.id
  from public.students s
  where s.school_id = b.school_id and s.auth_user_id = b.student_id;

-- every booking must have found a students row (enrollments are never deleted,
-- so an orphan here means the backfill is wrong — abort loudly)
do $$
declare v_orphans int;
begin
  select count(*) into v_orphans
  from public.bookings b
  where not exists (select 1 from public.students s where s.id = b.student_id);
  if v_orphans > 0 then
    raise exception 'bookings remap left % orphan rows', v_orphans;
  end if;
end $$;

-- soft removal (status=left) is the normal path; deleting a student with
-- bookings is blocked so drive history survives
alter table public.bookings
  add constraint bookings_student_id_fkey
  foreign key (student_id) references public.students(id) on delete restrict;

-- ──── 4. RLS ────

alter table public.students enable row level security;

create policy "students_self_read" on public.students
  for select using (auth.uid() = auth_user_id);
create policy "students_owner_read" on public.students
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
create policy "students_admin_all" on public.students
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- bookings: student-side read now goes through students
drop policy "bookings_student_read" on public.bookings;
create policy "bookings_student_read" on public.bookings
  for select using (
    exists (select 1 from public.students s
            where s.id = bookings.student_id and s.auth_user_id = auth.uid())
  );

-- instructors: enrolled-students read now goes through students
drop policy "instructors_enrolled_read" on public.instructors;
create policy "instructors_enrolled_read" on public.instructors
  for select using (
    exists (select 1 from public.students s
            where s.school_id = instructors.school_id
              and s.auth_user_id = auth.uid()
              and s.status = 'active')
  );
```

Do NOT apply yet — Task 2 appends the RPC section to this same file first.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/025_students_table.sql
git commit -m "feat(db): students table schema, backfill, bookings repoint, RLS (migration wip)"
```

---

### Task 2: Migration — RPC rewrites and new RPCs

**Files:**
- Modify: `supabase/migrations/025_students_table.sql` (append)

- [ ] **Step 1: Append the enrollment-lifecycle RPCs**

Append to `supabase/migrations/025_students_table.sql`:

```sql
-- ──── 5. enrollment lifecycle RPCs (names kept — frontend calls unchanged) ────

-- Self-enrollment. NEW: if the school holds an unclaimed row whose email matches
-- the caller's auth email (case-insensitive), the invite flow claims that row
-- instead of inserting a new one — the school's invite link carries intent.
create or replace function public.request_enrollment(
  p_school_id uuid,
  p_licence_code text,
  p_phone text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
  v_licence text := nullif(btrim(p_licence_code), '');
  v_phone text := nullif(btrim(p_phone), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if (select role from public.profiles where id = v_uid) <> 'student' then
    raise exception 'role_must_be_student';
  end if;
  if v_licence is null then raise exception 'licence_required'; end if;

  select lower(u.email::text) into v_email from auth.users u where u.id = v_uid;

  -- claim a matching unclaimed row at this school, if any
  update public.students
    set auth_user_id = v_uid,
        email        = null,
        claim_token  = gen_random_uuid(),
        licence_code = coalesce(v_licence, licence_code),
        phone        = coalesce(v_phone, phone)
    where school_id = p_school_id
      and auth_user_id is null
      and lower(email) = v_email
    returning id into v_id;
  if v_id is not null then
    if v_phone is not null then
      update public.profiles set phone = v_phone where id = v_uid;
    end if;
    return v_id;
  end if;

  insert into public.students
    (school_id, auth_user_id, full_name, phone, status, licence_code, source)
  values (
    p_school_id, v_uid,
    (select full_name from public.profiles where id = v_uid),
    v_phone, 'pending', v_licence, 'self')
  on conflict (school_id, auth_user_id) where auth_user_id is not null do update
    set status = case when public.students.status in ('rejected','left')
                      then 'pending' else public.students.status end,
        licence_code = excluded.licence_code,
        phone        = coalesce(excluded.phone, public.students.phone)
  returning id into v_id;

  if v_phone is not null then
    update public.profiles set phone = v_phone where id = v_uid;
  end if;
  return v_id;
exception when unique_violation then
  -- students_one_active_per_user: the caller is already active at another school
  raise exception 'student_active_elsewhere';
end;
$$;
revoke execute on function public.request_enrollment(uuid, text, text) from public, anon;
grant execute on function public.request_enrollment(uuid, text, text) to authenticated;

create or replace function public.approve_enrollment(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  select school_id into v_school from public.students where id = p_enrollment_id;
  if v_school is null then raise exception 'enrollment_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.students
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
  select school_id into v_school from public.students where id = p_enrollment_id;
  if v_school is null then raise exception 'enrollment_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  update public.students set status = 'rejected', decided_at = now()
    where id = p_enrollment_id and status in ('pending','active');
end;
$$;
```

- [ ] **Step 2: Append manual-add, claim, and remove RPCs**

```sql
-- ──── 6. manual add / claim / remove ────

-- School adds a student who hasn't signed up. Email required (row must be
-- reachable). Duplicate email at the same school → 'student_email_exists'.
create or replace function public.add_student_manual(
  p_school_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_licence_code text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(p_full_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_id uuid;
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  if v_name is null then raise exception 'name_required'; end if;
  if v_email is null then raise exception 'email_required'; end if;

  insert into public.students
    (school_id, full_name, email, phone, licence_code, status, source, decided_at)
  values (p_school_id, v_name, v_email,
          nullif(btrim(p_phone), ''), nullif(btrim(p_licence_code), ''),
          'active', 'manual', now())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'student_email_exists';
end;
$$;
revoke execute on function public.add_student_manual(uuid, text, text, text, text) from public, anon;
grant execute on function public.add_student_manual(uuid, text, text, text, text) to authenticated;

-- Logged-in student claims an unclaimed row via its token. The school-entered
-- roster data is kept; only the auth link changes. Token rotates on claim.
create or replace function public.claim_student_record(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if (select role from public.profiles where id = v_uid) <> 'student' then
    raise exception 'role_must_be_student';
  end if;

  update public.students
    set auth_user_id = v_uid,
        email        = null,
        claim_token  = gen_random_uuid()
    where claim_token = p_token and auth_user_id is null
    returning id into v_id;
  if v_id is null then raise exception 'claim_not_found'; end if;
  return v_id;
exception when unique_violation then
  -- active elsewhere, or already has a row at this school
  raise exception 'student_active_elsewhere';
end;
$$;
revoke execute on function public.claim_student_record(uuid) from public, anon;
grant execute on function public.claim_student_record(uuid) to authenticated;

-- Remove a student: hard-delete only for unclaimed mistake rows with no
-- bookings; otherwise soft (status='left') so drive history survives.
create or replace function public.remove_student(p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid; v_claimed boolean;
begin
  select school_id, auth_user_id is not null into v_school, v_claimed
    from public.students where id = p_student_id;
  if v_school is null then raise exception 'student_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  if not v_claimed
     and not exists (select 1 from public.bookings where student_id = p_student_id) then
    delete from public.students where id = p_student_id;
  else
    update public.students set status = 'left', decided_at = now()
      where id = p_student_id;
  end if;
end;
$$;
revoke execute on function public.remove_student(uuid) from public, anon;
grant execute on function public.remove_student(uuid) to authenticated;
```

- [ ] **Step 3: Append the list/edit RPCs**

```sql
-- ──── 7. school-facing list/edit RPCs ────
-- Email resolution rule everywhere: claimed → auth.users.email, unclaimed → students.email.

drop function if exists public.list_enrolled_students(uuid);
create function public.list_enrolled_students(p_school_id uuid)
returns table(
  student_id uuid,       -- students.id (NOT an auth uid)
  full_name text,
  email text,
  phone text,
  licence_code text,
  is_claimed boolean,
  claim_token uuid       -- non-null only while unclaimed (for the copy-link UI)
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select s.id, s.full_name,
           coalesce(u.email::text, s.email),
           s.phone, s.licence_code,
           s.auth_user_id is not null,
           case when s.auth_user_id is null then s.claim_token end
    from public.students s
    left join auth.users u on u.id = s.auth_user_id
    where s.school_id = p_school_id and s.status = 'active'
    order by s.full_name nulls last;
end;
$$;
grant execute on function public.list_enrolled_students(uuid) to authenticated;

create or replace function public.list_enrollment_requests(p_school_id uuid)
returns table(
  enrollment_id uuid,
  student_id uuid,       -- students.id
  full_name text,
  email text,
  licence_code text,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select s.id, s.id, s.full_name,
           coalesce(u.email::text, s.email),
           s.licence_code, s.created_at
    from public.students s
    left join auth.users u on u.id = s.auth_user_id
    where s.school_id = p_school_id and s.status = 'pending'
    order by s.created_at desc;
end;
$$;
grant execute on function public.list_enrollment_requests(uuid) to authenticated;

-- School edits roster data on the students row only (profiles untouched).
-- NEW p_email: editable only while the row is unclaimed.
drop function if exists public.school_update_student(uuid, uuid, text, text, text);
create function public.school_update_student(
  p_school_id uuid,
  p_student_id uuid,     -- students.id
  p_full_name text default null,
  p_phone text default null,
  p_licence_code text default null,
  p_email text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_claimed boolean;
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select auth_user_id is not null into v_claimed
    from public.students
    where id = p_student_id and school_id = p_school_id and status = 'active';
  if v_claimed is null then raise exception 'not_enrolled'; end if;
  if p_email is not null and v_claimed then raise exception 'email_not_editable'; end if;

  update public.students
    set full_name    = coalesce(nullif(btrim(p_full_name), ''), full_name),
        phone        = case when p_phone is null then phone
                            else nullif(btrim(p_phone), '') end,
        licence_code = case when p_licence_code is null then licence_code
                            else nullif(btrim(p_licence_code), '') end,
        email        = case when p_email is null then email
                            else lower(nullif(btrim(p_email), '')) end
    where id = p_student_id;
exception when unique_violation then
  raise exception 'student_email_exists';
end;
$$;
grant execute on function public.school_update_student(uuid, uuid, text, text, text, text) to authenticated;
```

Note: the check constraint `students_unclaimed_needs_email` rejects clearing the
email of an unclaimed row (passing `p_email = ''`); that surfaces as a check
violation — acceptable, the UI requires the field.

- [ ] **Step 4: Append the booking RPC rewrites**

Only the parts that touched student identity change; everything else is copied
verbatim from migrations 015/024. `confirm_booking`, `decline_booking`, and
`confirm_pending_requests` don't touch student identity — leave them alone.

```sql
-- ──── 8. booking RPCs: student identity now lives in students ────

-- list_available_slots: the "caller already holds this slot" check must map the
-- auth uid to their students rows.
create or replace function public.list_available_slots(
  p_school_id uuid, p_day date, p_instructor_id uuid default null)
returns setof timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_duration int;
  v_enabled  boolean;
  v_dow      int := extract(isodow from p_day)::int;
  v_student  uuid := auth.uid();
begin
  select lesson_duration_min, booking_enabled
    into v_duration, v_enabled
    from public.driving_schools where id = p_school_id;

  if v_enabled is not true or v_duration is null or v_duration <= 0 then
    return;
  end if;

  return query
  with candidate as (
    select ia.instructor_id, gs as slot
    from public.instructor_availability ia
    join public.instructors ins
      on ins.id = ia.instructor_id
     and ins.school_id = p_school_id
     and ins.active
    cross join lateral generate_series(
      (p_day + ia.start_time) at time zone 'Europe/Rome',
      (p_day + ia.end_time)   at time zone 'Europe/Rome' - make_interval(mins => v_duration),
      make_interval(mins => v_duration)
    ) as gs
    where ia.weekday = v_dow
      and (p_instructor_id is null or ins.id = p_instructor_id)
  )
  select distinct c.slot
  from candidate c
  where c.slot > now()
    and not exists (
      select 1 from public.bookings b
      where b.instructor_id = c.instructor_id
        and b.status = 'confirmed'
        and tstzrange(b.starts_at, b.ends_at)
            && tstzrange(c.slot, c.slot + make_interval(mins => v_duration))
    )
    and not exists (
      -- the calling student already holds this time (pending or confirmed)
      select 1 from public.bookings sb
      join public.students st on st.id = sb.student_id
      where st.auth_user_id = v_student
        and sb.status in ('pending', 'confirmed')
        and tstzrange(sb.starts_at, sb.ends_at)
            && tstzrange(c.slot, c.slot + make_interval(mins => v_duration))
    )
  order by c.slot;
end;
$$;

-- request_booking: enrollment lookup + inserted student_id via students
create or replace function public.request_booking(
  p_school_id uuid, p_starts_at timestamptz, p_preferred_instructor_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_student uuid;
  v_duration int;
  v_enabled  boolean;
  v_auto     boolean;
  v_licence  text;
  v_id       uuid;
  v_end      timestamptz;
  v_dow      int;
  v_t_start  time;
  v_t_end    time;
  v_instructor uuid;
  v_pref     uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select lesson_duration_min, booking_enabled, auto_confirm
    into v_duration, v_enabled, v_auto
    from public.driving_schools where id = p_school_id;
  if v_enabled is not true then raise exception 'booking_disabled'; end if;
  if v_duration is null or v_duration <= 0 then raise exception 'lesson_duration_not_set'; end if;

  select id, licence_code into v_student, v_licence from public.students
    where school_id = p_school_id and auth_user_id = v_uid and status = 'active';
  if not found then raise exception 'not_enrolled'; end if;

  if not exists (
    select 1 from public.list_available_slots(
      p_school_id, (p_starts_at at time zone 'Europe/Rome')::date) s
    where s = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  v_pref := null;
  if p_preferred_instructor_id is not null and exists (
    select 1 from public.instructors
    where id = p_preferred_instructor_id and school_id = p_school_id and active
  ) then
    v_pref := p_preferred_instructor_id;
  end if;

  if v_auto is true then
    v_end     := p_starts_at + make_interval(mins => v_duration);
    v_dow     := extract(isodow from (p_starts_at at time zone 'Europe/Rome'))::int;
    v_t_start := (p_starts_at at time zone 'Europe/Rome')::time;
    v_t_end   := (v_end       at time zone 'Europe/Rome')::time;

    select ins.id into v_instructor
    from public.instructors ins
    where ins.school_id = p_school_id and ins.active
      and exists (
        select 1 from public.instructor_availability ia
        where ia.instructor_id = ins.id and ia.weekday = v_dow
          and ia.start_time <= v_t_start and ia.end_time >= v_t_end
      )
      and not exists (
        select 1 from public.bookings b
        where b.instructor_id = ins.id and b.status = 'confirmed'
          and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
      )
    order by (case when ins.id = v_pref then 0 else 1 end), ins.created_at
    limit 1;

    if v_instructor is not null then
      begin
        insert into public.bookings (
          school_id, student_id, instructor_id, starts_at, duration_min,
          status, licence_code, decided_at, preferred_instructor_id)
        values (
          p_school_id, v_student, v_instructor, p_starts_at, v_duration,
          'confirmed', v_licence, now(), v_pref)
        returning id into v_id;
        return v_id;
      exception when exclusion_violation then
        v_instructor := null;
      end;
    end if;
  end if;

  insert into public.bookings (
    school_id, student_id, starts_at, duration_min, status, licence_code,
    preferred_instructor_id)
  values (p_school_id, v_student, p_starts_at, v_duration, 'pending', v_licence, v_pref)
  returning id into v_id;
  return v_id;
end;
$$;

-- create_booking_as_school: p_student_id is now students.id (manual students bookable)
create or replace function public.create_booking_as_school(
  p_school_id uuid, p_student_id uuid, p_instructor_id uuid, p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_duration int; v_enabled boolean; v_licence text;
  v_dow int; v_t_start time; v_t_end time; v_end timestamptz; v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select lesson_duration_min, booking_enabled
    into v_duration, v_enabled
    from public.driving_schools where id = p_school_id;
  if v_enabled is not true then raise exception 'booking_disabled'; end if;
  if v_duration is null or v_duration <= 0 then raise exception 'lesson_duration_not_set'; end if;

  select licence_code into v_licence from public.students
    where id = p_student_id and school_id = p_school_id and status = 'active';
  if not found then raise exception 'student_not_enrolled'; end if;

  if not exists (
    select 1 from public.instructors
    where id = p_instructor_id and school_id = p_school_id and active
  ) then
    raise exception 'instructor_not_in_school';
  end if;

  v_end     := p_starts_at + make_interval(mins => v_duration);
  v_dow     := extract(isodow from (p_starts_at at time zone 'Europe/Rome'))::int;
  v_t_start := (p_starts_at at time zone 'Europe/Rome')::time;
  v_t_end   := (v_end       at time zone 'Europe/Rome')::time;

  if not exists (
    select 1 from public.instructor_availability ia
    where ia.instructor_id = p_instructor_id and ia.weekday = v_dow
      and ia.start_time <= v_t_start and ia.end_time >= v_t_end
  ) then
    raise exception 'instructor_unavailable';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.student_id = p_student_id and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'student_busy';
  end if;

  insert into public.bookings (
    school_id, student_id, instructor_id, starts_at, duration_min,
    status, licence_code, decided_at)
  values (
    p_school_id, p_student_id, p_instructor_id, p_starts_at, v_duration,
    'confirmed', v_licence, now())
  returning id into v_id;
  return v_id;
exception when exclusion_violation then
  raise exception 'instructor_busy';
end;
$$;

-- update_booking_as_school: same change (p_student_id = students.id)
create or replace function public.update_booking_as_school(
  p_booking_id uuid, p_student_id uuid, p_instructor_id uuid, p_starts_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_school uuid; v_duration int; v_licence text;
  v_dow int; v_t_start time; v_t_end time; v_end timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select school_id, duration_min into v_school, v_duration
    from public.bookings where id = p_booking_id;
  if v_school is null then raise exception 'booking_not_found'; end if;

  if v_uid <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select licence_code into v_licence from public.students
    where id = p_student_id and school_id = v_school and status = 'active';
  if not found then raise exception 'student_not_enrolled'; end if;

  if not exists (
    select 1 from public.instructors
    where id = p_instructor_id and school_id = v_school and active
  ) then
    raise exception 'instructor_not_in_school';
  end if;

  v_end     := p_starts_at + make_interval(mins => v_duration);
  v_dow     := extract(isodow from (p_starts_at at time zone 'Europe/Rome'))::int;
  v_t_start := (p_starts_at at time zone 'Europe/Rome')::time;
  v_t_end   := (v_end       at time zone 'Europe/Rome')::time;

  if not exists (
    select 1 from public.instructor_availability ia
    where ia.instructor_id = p_instructor_id and ia.weekday = v_dow
      and ia.start_time <= v_t_start and ia.end_time >= v_t_end
  ) then
    raise exception 'instructor_unavailable';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.id <> p_booking_id
      and b.instructor_id = p_instructor_id and b.status = 'confirmed'
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'instructor_busy';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.id <> p_booking_id
      and b.student_id = p_student_id and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'student_busy';
  end if;

  update public.bookings
    set student_id    = p_student_id,
        instructor_id = p_instructor_id,
        starts_at     = p_starts_at,
        ends_at       = v_end,
        status        = 'confirmed',
        licence_code  = v_licence,
        decided_at    = now(),
        updated_at    = now()
    where id = p_booking_id;
exception when exclusion_violation then
  raise exception 'instructor_busy';
end;
$$;

-- cancel_booking: "is the caller the student" check goes through students
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid; v_student uuid; v_by text;
  v_starts_at timestamptz;
  v_policy text;
  v_cutoff int;
begin
  select school_id, student_id, starts_at
  into v_school, v_student, v_starts_at
  from public.bookings where id = p_booking_id;

  if v_school is null then raise exception 'booking_not_found'; end if;

  if exists (select 1 from public.students s
             where s.id = v_student and s.auth_user_id = auth.uid()) then
    v_by := 'student';
    select cancellation_policy, cancellation_cutoff_hours
    into v_policy, v_cutoff
    from public.driving_schools where id = v_school;

    if v_policy = 'no_cancel' then
      raise exception 'cancellation_not_allowed';
    elsif v_policy = 'custom' then
      if v_starts_at - now() < v_cutoff * interval '1 hour' then
        raise exception 'cancellation_past_cutoff';
      end if;
    end if;
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

-- ──── 9. drop the old table ────
drop table public.enrollments;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/025_students_table.sql
git commit -m "feat(db): rewrite RPCs for students table; add manual-add/claim/remove RPCs"
```

---

### Task 3: Apply the migration and verify

- [ ] **Step 1: Apply**

Via Supabase MCP: `apply_migration` with name `025_students_table` and the full
file content. (CLI alternative: `supabase db push`.)
Expected: success, no errors (the orphan-guard `do` block would abort loudly).

- [ ] **Step 2: Verify counts and shape (execute_sql)**

```sql
select
  (select count(*) from public.students)                                as students,
  (select count(*) from public.students where auth_user_id is not null) as claimed,
  (select count(*) from public.bookings)                                as bookings,
  (select count(*) from public.bookings b
     where not exists (select 1 from public.students s where s.id = b.student_id)) as orphans;
```

Expected: `students` = the enrollments count from Task 1 Step 1, `claimed` =
same number (all backfilled rows are claimed), `bookings` = the bookings count
from Task 1, `orphans` = 0.

```sql
select to_regclass('public.enrollments');
```

Expected: NULL (table gone).

- [ ] **Step 3: Smoke-test the new RPCs as service role (execute_sql)**

```sql
-- constraint: unclaimed row without email must fail
do $$
begin
  insert into public.students (school_id, full_name, status, source)
  values ((select id from public.driving_schools limit 1), 'X', 'active', 'manual');
  raise exception 'constraint did not fire';
exception when check_violation then null;
end $$;
```

Expected: succeeds silently (check violation caught).

- [ ] **Step 4: Commit nothing (DB-only step); mark task done**

---

### Task 4: notify edge function — email resolution rule

**Files:**
- Modify: `supabase/functions/notify/index.ts`

- [ ] **Step 1: Replace the student email/preference resolution block**

In `handleBookingEvent`, replace lines 253–268 (the two blocks that call
`admin.auth.admin.getUserById(booking.student_id)` and read
`profiles.email_confirmations` by `booking.student_id`) with:

```ts
	// booking.student_id is a students.id. Email resolution rule:
	// claimed row → auth.users email; unclaimed → students.email.
	const { data: studentData, error: studentRowError } = await admin
		.from("students")
		.select("auth_user_id, email")
		.eq("id", booking.student_id)
		.maybeSingle();
	if (studentRowError)
		return new Response(studentRowError.message, { status: 500, headers: CORS });
	const studentRow = studentData as {
		auth_user_id: string | null;
		email: string | null;
	} | null;

	let studentEmail = "";
	let studentWantsConfirmation = true;
	if (studentRow?.auth_user_id) {
		const { data: userData, error: userError } =
			await admin.auth.admin.getUserById(studentRow.auth_user_id);
		if (userError)
			return new Response(userError.message, { status: 500, headers: CORS });
		studentEmail = userData?.user?.email ?? "";

		// Student-controlled preference; unclaimed students have no account to
		// opt out with, so they default to receiving confirmations.
		const { data: studentProfile } = await admin
			.from("profiles")
			.select("email_confirmations")
			.eq("id", studentRow.auth_user_id)
			.maybeSingle();
		studentWantsConfirmation =
			(studentProfile as { email_confirmations: boolean } | null)
				?.email_confirmations ?? true;
	} else {
		studentEmail = studentRow?.email ?? "";
	}
```

Keep everything after (school recipient fallback, `decideRecipients`, the
switch) unchanged — `decideRecipients` already handles an empty `studentEmail`.

- [ ] **Step 2: Typecheck / lint the function**

Run: `deno check supabase/functions/notify/index.ts` (or `npx biome check supabase/functions/notify/index.ts` if deno isn't installed — match whatever the repo's existing check is).
Expected: no errors.

- [ ] **Step 3: Deploy**

Via Supabase MCP `deploy_edge_function` for `notify` (or `supabase functions deploy notify`).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/notify/index.ts
git commit -m "feat(notify): resolve student email via students row (claimed vs unclaimed)"
```

---

### Task 5: calendar-feed edge function — map auth user to students rows

**Files:**
- Modify: `supabase/functions/calendar-feed/index.ts`

- [ ] **Step 1: Replace the bookings query filter**

The feed token resolves to a profile (auth uid), but `bookings.student_id` is
now a `students.id`. Replace the bookings query (around line 103):

```ts
	// bookings.student_id is a students.id — collect this user's student rows first
	const { data: studentRows, error: studentRowsError } = await admin
		.from("students")
		.select("id")
		.eq("auth_user_id", (profile as { id: string }).id);
	if (studentRowsError)
		return new Response(studentRowsError.message, { status: 500, headers: CORS });
	const studentIds = ((studentRows ?? []) as { id: string }[]).map((r) => r.id);

	const { data: bookings, error: bookingsError } = await admin
		.from("bookings")
		.select("id, school_id, starts_at, ends_at, status")
		.in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"])
		.in("status", ["confirmed", "completed"])
		.gte("ends_at", since)
		.order("starts_at", { ascending: true });
```

- [ ] **Step 2: Check + deploy + commit**

Run the same check as Task 4 Step 2 on this file; deploy `calendar-feed`; then:

```bash
git add supabase/functions/calendar-feed/index.ts
git commit -m "feat(calendar-feed): map auth user to students rows for booking lookup"
```

---

### Task 6: Frontend data layer — types and api

**Files:**
- Modify: `src/lib/booking/types.ts`
- Modify: `src/lib/booking/api.ts`
- Test: `src/lib/booking/__tests__/api.test.ts`

- [ ] **Step 1: Update types.ts**

Replace the `Enrollment` interface (keep `EnrollmentStatus`, it's unchanged):

```ts
export interface Student {
	id: string;
	school_id: string;
	auth_user_id: string | null; // null = unclaimed (manually added, not registered)
	full_name: string | null;
	email: string | null; // contact email while unclaimed; null once claimed
	phone: string | null;
	status: EnrollmentStatus;
	source: "self" | "manual";
	licence_code: string | null;
	created_at: string;
	decided_at: string | null;
}
```

`Booking.student_id` keeps its name but now holds a `students.id`; update its
comment:

```ts
	student_id: string; // students.id (not an auth uid)
```

- [ ] **Step 2: Update api.ts — reads**

- `listSchoolEnrollments`: change `.from("enrollments")` to `.from("students")`,
  return type `Student[]`, import `Student` instead of `Enrollment`.
- `getMyEnrollment`: change `.from("enrollments")` to `.from("students")`,
  return type `Promise<Student | null>` (RLS `students_self_read` scopes rows to
  the caller, same as before).
- `EnrolledStudent` gains the claim fields:

```ts
export interface EnrolledStudent {
	student_id: string; // students.id
	full_name: string | null;
	email: string | null;
	phone: string | null;
	licence_code: string | null;
	is_claimed: boolean;
	claim_token: string | null; // set only while unclaimed
}
```

- [ ] **Step 3: Update api.ts — mutations**

`updateStudentAsSchool` gains optional email:

```ts
export async function updateStudentAsSchool(
	schoolId: string,
	studentId: string,
	fields: {
		full_name?: string;
		phone?: string | null;
		licence_code?: string | null;
		email?: string; // editable only while the student is unclaimed
	},
): Promise<void> {
	const { error } = await supabase.rpc("school_update_student", {
		p_school_id: schoolId,
		p_student_id: studentId,
		p_full_name: fields.full_name ?? null,
		p_phone: fields.phone ?? null,
		p_licence_code: fields.licence_code ?? null,
		p_email: fields.email ?? null,
	});
	if (error) throw error;
}
```

Add the three new functions (near the other enrollment mutations at the bottom):

```ts
/** School manually adds a student who hasn't registered. Returns students.id. */
export const addStudentManual = (
	schoolId: string,
	fields: {
		full_name: string;
		email: string;
		phone?: string;
		licence_code?: string;
	},
) =>
	rpc("add_student_manual", {
		p_school_id: schoolId,
		p_full_name: fields.full_name,
		p_email: fields.email,
		p_phone: fields.phone ?? null,
		p_licence_code: fields.licence_code ?? null,
	}) as Promise<string>;

/** Logged-in student claims a manually-added record via its token. */
export const claimStudentRecord = (token: string) =>
	rpc("claim_student_record", { p_token: token }) as Promise<string>;

/** Remove a student: hard-delete for unclaimed mistake rows without bookings,
 * soft (status='left') otherwise. */
export const removeStudent = (studentId: string) =>
	rpc("remove_student", { p_student_id: studentId }) as Promise<void>;
```

- [ ] **Step 4: Write tests for the new api functions**

Open `src/lib/booking/__tests__/api.test.ts`, follow its existing mocking
pattern (it mocks `@/lib/supabase`), and add cases asserting parameter mapping:

```ts
describe("addStudentManual", () => {
	it("maps fields to rpc params", async () => {
		await addStudentManual("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
		});
		expect(rpcMock).toHaveBeenCalledWith("add_student_manual", {
			p_school_id: "school-1",
			p_full_name: "Mario Rossi",
			p_email: "mario@example.com",
			p_phone: null,
			p_licence_code: null,
		});
	});
});

describe("claimStudentRecord", () => {
	it("passes the token", async () => {
		await claimStudentRecord("tok-1");
		expect(rpcMock).toHaveBeenCalledWith("claim_student_record", {
			p_token: "tok-1",
		});
	});
});
```

(Adapt `rpcMock` to the file's actual mock handle.)

- [ ] **Step 5: Fix all compile errors from the rename**

Run: `npx tsc --noEmit`
Every `Enrollment` import (EnrollButton, EnrollDialog, EnrollBlockedDialog,
useCerca, dashboards, tests…) switches to `Student`; the fields they use
(`status`, `school_id`, `id`) are unchanged. Fix until clean.

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run`
Expected: PASS (fix any fixture shapes that still model old columns).

```bash
git add src/lib/booking docs
git commit -m "feat(api): students data layer — Student type, manual add, claim, remove"
```

---

### Task 7: i18n strings

**Files:**
- Modify: the locale resource files under `src/i18n/` (find them with `ls src/i18n`; add each key to every locale, Italian first-class)

- [ ] **Step 1: Add keys**

Under `booking.school`:

| key | it | en |
|---|---|---|
| `addStudent` | Aggiungi allievo | Add student |
| `addStudentTitle` | Aggiungi un allievo | Add a student |
| `addStudentHint` | L'allievo riceverà le email di notifica delle guide a questo indirizzo. Conferma di avere il suo consenso a essere contattato. | The student will receive drive notification emails at this address. Confirm you have their consent to be contacted. |
| `addStudentName` | Nome e cognome | Full name |
| `addStudentEmail` | Email | Email |
| `addStudentPhone` | Telefono (facoltativo) | Phone (optional) |
| `addStudentLicence` | Patente (facoltativo) | Licence (optional) |
| `addStudentSubmit` | Aggiungi | Add |
| `addStudentEmailExists` | Esiste già un allievo con questa email. | A student with this email already exists. |
| `unclaimedBadge` | Non registrato | Not registered |
| `copyClaimLink` | Copia link di registrazione | Copy registration link |
| `claimLinkCopied` | Link copiato | Link copied |
| `removeStudent` | Rimuovi allievo | Remove student |

Under `claim` (top level):

| key | it | en |
|---|---|---|
| `claim.working` | Collegamento del tuo profilo… | Linking your record… |
| `claim.success` | Profilo collegato! Ora vedi le tue guide. | Record linked! You can now see your drives. |
| `claim.notFound` | Link non valido o già utilizzato. | Invalid or already-used link. |
| `claim.activeElsewhere` | Risulti già iscritto a un'altra autoscuola. | You are already enrolled at another driving school. |

- [ ] **Step 2: Commit**

```bash
git add src/i18n
git commit -m "feat(i18n): strings for manual student add and claim flow"
```

---

### Task 8: AddStudentDialog + students page wiring

**Files:**
- Create: `src/components/driving-school/AddStudentDialog.tsx`
- Modify: `src/routes/DrivingSchoolStudents.tsx`
- Test: `src/components/driving-school/__tests__/AddStudentDialog.test.tsx`

- [ ] **Step 1: Write the failing component test**

Follow the repo's existing component-test pattern (see
`src/components/booking/__tests__/RequestsInbox.test.tsx` for the mocking
style). Test: renders fields; submit calls `addStudentManual` with entered
values; on `student_email_exists` error shows the i18n error string.

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddStudentDialog } from "../AddStudentDialog";

const addStudentManual = vi.fn();
vi.mock("@/lib/booking/api", () => ({
	addStudentManual: (...a: unknown[]) => addStudentManual(...a),
}));

describe("AddStudentDialog", () => {
	it("submits name/email and calls onAdded", async () => {
		addStudentManual.mockResolvedValue("new-id");
		const onAdded = vi.fn();
		render(
			<AddStudentDialog
				schoolId="school-1"
				open
				onOpenChange={() => {}}
				onAdded={onAdded}
			/>,
		);
		fireEvent.change(screen.getByLabelText(/nome|full name/i), {
			target: { value: "Mario Rossi" },
		});
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "mario@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: /aggiungi|add/i }));
		await waitFor(() => expect(onAdded).toHaveBeenCalled());
		expect(addStudentManual).toHaveBeenCalledWith("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
			phone: undefined,
			licence_code: undefined,
		});
	});
});
```

(Wrap with the i18n test provider the other component tests use.)

- [ ] **Step 2: Run it — expect FAIL (component doesn't exist)**

Run: `npx vitest run src/components/driving-school/__tests__/AddStudentDialog.test.tsx`

- [ ] **Step 3: Implement AddStudentDialog**

Model the dialog chrome on `StudentEditSheet.tsx` (same open/onOpenChange
contract, same input styling). Shape:

```tsx
interface AddStudentDialogProps {
	schoolId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdded: () => void; // parent refetches the list
}
```

Fields: full name (required), email (required, `type="email"`), phone, licence
code. Consent hint text `t("booking.school.addStudentHint")` under the email
field. Submit → `addStudentManual(schoolId, fields)`; on success reset + close +
`onAdded()`; on error with `message === "student_email_exists"` show
`t("booking.school.addStudentEmailExists")`, otherwise a generic error line.

- [ ] **Step 4: Run the test — expect PASS**

- [ ] **Step 5: Wire into DrivingSchoolStudents**

In `src/routes/DrivingSchoolStudents.tsx`:
- Add state `const [addOpen, setAddOpen] = useState(false);`
- In the header (next to the title block), an "Add student" button opening it:

```tsx
<button
	type="button"
	onClick={() => setAddOpen(true)}
	className="inline-flex items-center gap-2 rounded-[0.5rem] bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
>
	<UserPlus size={15} aria-hidden />
	{t("booking.school.addStudent")}
</button>
```

(match the exact brand button classes used elsewhere in the school dashboard —
grep for an existing primary button and copy its classes).
- Render `<AddStudentDialog schoolId={schoolId} open={addOpen} onOpenChange={setAddOpen} onAdded={handleSaved} />` when `schoolId` is set.
- In the student list row, after the name, show the unclaimed badge and a
  copy-link action when `!s.is_claimed`:

```tsx
{!s.is_claimed && (
	<span className="inline-flex items-center rounded-full bg-bg-sunken px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint">
		{t("booking.school.unclaimedBadge")}
	</span>
)}
```

and next to the edit button:

```tsx
{!s.is_claimed && s.claim_token && (
	<button
		type="button"
		aria-label={t("booking.school.copyClaimLink")}
		onClick={() => {
			navigator.clipboard.writeText(
				`${window.location.origin}/claim/${s.claim_token}`,
			);
		}}
		className="ml-1 flex shrink-0 items-center justify-center rounded-[0.5rem] p-1.5 text-ink-faint transition-colors duration-150 hover:bg-bg hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
	>
		<Link2 size={15} aria-hidden />
	</button>
)}
```

Add a brief "copied" feedback consistent with how InviteLinkCard signals copy
success (reuse its pattern).

- [ ] **Step 6: Typecheck, run tests, commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/driving-school src/routes/DrivingSchoolStudents.tsx
git commit -m "feat(school): manually add students; unclaimed badge + claim-link copy"
```

---

### Task 9: StudentEditSheet — email editable while unclaimed; remove action

**Files:**
- Modify: `src/components/driving-school/StudentEditSheet.tsx`

- [ ] **Step 1: Enable the email field for unclaimed students**

The sheet receives `student: EnrolledStudent`, which now carries `is_claimed`.
Currently email is displayed read-only (it was "login identity"). Change: when
`!student.is_claimed`, render email as an editable required input and include it
in the save call:

```tsx
await updateStudentAsSchool(schoolId, student.student_id, {
	full_name: name,
	phone,
	licence_code: licence,
	...(student.is_claimed ? {} : { email }),
});
```

Keep the read-only presentation (with the existing explanatory hint) when
claimed. Surface the `student_email_exists` error with
`t("booking.school.addStudentEmailExists")`.

- [ ] **Step 2: Add a remove action**

At the sheet's footer, a destructive "remove" button calling
`removeStudent(student.student_id)` behind a `window.confirm` with
`t("booking.school.removeStudent")`, then close + `onSaved()`.

- [ ] **Step 3: Typecheck, run tests, commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/driving-school/StudentEditSheet.tsx
git commit -m "feat(school): edit unclaimed student email; remove student action"
```

---

### Task 10: Claim route

**Files:**
- Create: `src/routes/ClaimStudent.tsx`
- Modify: the router registration (find where routes are declared: `grep -rn "path=" src/App.tsx src/routes` — follow the existing pattern, e.g. how the enroll deep-link route is registered)

- [ ] **Step 1: Implement the route component**

`/claim/:token`. Behaviour:
- Not logged in → redirect to the auth page preserving the destination, the same
  way the existing enroll deep link does it (find that pattern in the enroll
  deep-link handling from commit `e8fef0e` and reuse it verbatim).
- Logged in as student → call `claimStudentRecord(token)`; on success show
  `t("claim.success")` briefly and navigate to the student dashboard; on error
  map `claim_not_found` → `t("claim.notFound")`, `student_active_elsewhere` →
  `t("claim.activeElsewhere")`.
- Logged in as non-student → show `t("claim.notFound")` (don't leak record
  existence).

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { claimStudentRecord } from "@/lib/booking/api";

export default function ClaimStudent() {
	const { token } = useParams<{ token: string }>();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (loading || !token) return;
		if (!user) {
			// mirror the enroll deep-link redirect pattern (preserve destination)
			navigate(`/auth?redirect=${encodeURIComponent(`/claim/${token}`)}`);
			return;
		}
		claimStudentRecord(token)
			.then(() => navigate("/student/dashboard", { replace: true }))
			.catch((e: { message?: string }) => {
				if (e.message === "student_active_elsewhere")
					setError(t("claim.activeElsewhere"));
				else setError(t("claim.notFound"));
			});
	}, [loading, user, token, navigate, t]);

	return (
		<main className="grid min-h-dvh place-items-center p-6">
			<p className="text-sm text-ink-muted">{error ?? t("claim.working")}</p>
		</main>
	);
}
```

Adjust the auth-redirect line and `useAuth` shape to match the real enroll
deep-link implementation — copy, don't invent.

- [ ] **Step 2: Register the route**

Add `/claim/:token` → `ClaimStudent` alongside the other route declarations.

- [ ] **Step 3: Manual verification**

Run the app (`npm run dev`), add a manual student as a school, copy the claim
link, open it in a second browser profile logged in as a student account:
expect redirect to the student dashboard and the students page now showing the
row without the "not registered" badge.

- [ ] **Step 4: Commit**

```bash
git add src/routes/ClaimStudent.tsx src/App.tsx
git commit -m "feat(student): claim route links a manual record to the signed-in account"
```

---

### Task 11: Full verification sweep

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both clean. Fix any straggler fixtures still shaped like the old
`enrollments` model (see the inventory: `EnrollButton.test.tsx`,
`RequestsInbox.test.tsx`, `StudentDashboard.test.tsx`, school-finder tests).

- [ ] **Step 2: End-to-end smoke (dev app against dev DB)**

1. School adds a manual student → appears with "not registered" badge.
2. School books a drive for that student (LessonsCalendar assign picker) →
   booking created; check the notify function log (Supabase MCP `get_logs`,
   service `edge-function`) shows a send to the manual student's email.
3. Duplicate manual add with same email → friendly error.
4. Claim link flow (Task 10 Step 3) → row claimed, badge gone, booking history
   visible on the student's dashboard.
5. Existing self-enrollment via invite link still works end-to-end.

- [ ] **Step 3: Commit any fixes; final commit**

```bash
git add -A
git commit -m "test: fixtures and fixes for students table rework"
```
