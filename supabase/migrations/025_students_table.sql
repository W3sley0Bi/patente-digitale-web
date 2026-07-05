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
  decided_at    timestamptz
);
-- NOTE: email-required-while-unclaimed is enforced at the RPC layer
-- (add_student_manual raises 'email_required'), NOT as a check constraint:
-- a constraint would make deleting a claimed auth user fail (the FK nulls
-- auth_user_id while email is already null).

comment on column public.students.email is
  'Contact email while unclaimed. NULL once auth_user_id is set: claimed rows resolve email from auth.users.';

-- claimed: one row per (school, auth user). Partial: NULLs (manual rows) unlimited.
create unique index students_school_authuser_uq
  on public.students (school_id, auth_user_id) where auth_user_id is not null;

-- one ACTIVE enrollment per auth user across all schools (kept from enrollments)
create unique index students_one_active_per_user
  on public.students (auth_user_id) where status = 'active' and auth_user_id is not null;

-- no duplicate manual adds of the same email within one school ('left' rows
-- excluded so a soft-removed student's email can be re-added)
create unique index students_school_email_unclaimed_uq
  on public.students (school_id, lower(email)) where auth_user_id is null and status <> 'left';

create index students_school_status_idx on public.students (school_id, status);
create index students_authuser_idx      on public.students (auth_user_id);
create unique index students_claim_token_idx on public.students (claim_token);

-- when an auth user is deleted the FK nulls auth_user_id; snapshot their email
-- first so the school keeps a contact address. Best-effort: skip rows where
-- the snapshot would collide with an existing unclaimed row on the partial
-- unique index once the FK set-null runs — skipped rows end with email NULL,
-- and NULLs never collide, so the auth.users delete always succeeds.
create or replace function public.students_snapshot_email_on_user_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.students st
    set email = lower(old.email)
    where st.auth_user_id = old.id
      and not exists (
        select 1 from public.students s2
        where s2.school_id = st.school_id
          and s2.auth_user_id is null
          and s2.status <> 'left'
          and lower(s2.email) = lower(old.email)
      );
  return old;
end;
$$;

create trigger students_snapshot_email_before_user_delete
  before delete on auth.users
  for each row execute function public.students_snapshot_email_on_user_delete();

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

-- instructor_availability: the 009 policy referenced enrollments (blocks the
-- drop below) — same access shape, enrollments → students
drop policy "ia_enrolled_read" on public.instructor_availability;
create policy "ia_enrolled_read" on public.instructor_availability
  for select using (
    exists (select 1 from public.students s
            join public.instructors i on i.id = instructor_availability.instructor_id
            where s.school_id = i.school_id
              and s.auth_user_id = auth.uid()
              and s.status = 'active')
  );

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
  if (select role from public.profiles where id = v_uid) is distinct from 'student' then
    raise exception 'role_must_be_student';
  end if;
  if v_licence is null then raise exception 'licence_required'; end if;

  -- only trust CONFIRMED emails for claim-by-email; v_email stays null for
  -- unconfirmed accounts, so the claim update matches nothing
  select lower(u.email::text) into v_email from auth.users u
    where u.id = v_uid and u.email_confirmed_at is not null;

  -- claim a matching unclaimed row at this school, if any (only when the
  -- caller has no row at this school yet, so the same-school unique index
  -- can never fire here — any unique_violation is students_one_active_per_user)
  update public.students
    set auth_user_id = v_uid,
        email        = null,
        claim_token  = gen_random_uuid(),
        licence_code = coalesce(v_licence, licence_code),
        phone        = coalesce(v_phone, phone)
    where school_id = p_school_id
      and auth_user_id is null
      and lower(email) = v_email
      and status = 'active'
      and not exists (select 1 from public.students s2
                      where s2.school_id = p_school_id and s2.auth_user_id = v_uid)
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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
  if (select role from public.profiles where id = v_uid) is distinct from 'student' then
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
  declare v_constraint text;
  begin
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'students_school_authuser_uq' then
      -- the caller already has a row at this school
      raise exception 'already_enrolled_at_school';
    end if;
    -- students_one_active_per_user: active at another school
    raise exception 'student_active_elsewhere';
  end;
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select school_id, auth_user_id is not null into v_school, v_claimed
    from public.students where id = p_student_id;
  if v_school is null then raise exception 'student_not_found'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  if not v_claimed
     and not exists (select 1 from public.bookings where student_id = p_student_id) then
    begin
      delete from public.students where id = p_student_id;
    exception when foreign_key_violation then
      -- a booking slipped in concurrently — fall back to soft removal
      update public.students set status = 'left', decided_at = now()
        where id = p_student_id;
    end;
  else
    update public.students set status = 'left', decided_at = now()
      where id = p_student_id;
  end if;
end;
$$;
revoke execute on function public.remove_student(uuid) from public, anon;
grant execute on function public.remove_student(uuid) to authenticated;

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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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
revoke execute on function public.list_enrolled_students(uuid) from public, anon;
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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
revoke execute on function public.list_enrollment_requests(uuid) from public, anon;
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select auth_user_id is not null into v_claimed
    from public.students
    where id = p_student_id and school_id = p_school_id and status = 'active';
  if v_claimed is null then raise exception 'not_enrolled'; end if;
  if p_email is not null and v_claimed then raise exception 'email_not_editable'; end if;
  -- unclaimed rows must stay reachable: refuse blanking the email
  if p_email is not null and not v_claimed and nullif(btrim(p_email), '') is null then
    raise exception 'email_required';
  end if;

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
revoke execute on function public.school_update_student(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.school_update_student(uuid, uuid, text, text, text, text) to authenticated;

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
