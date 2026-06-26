-- ════════════════════════════════════════════════════════════════════════════
-- 006_booking_engine.sql — Booking engine v1
-- See docs/superpowers/specs/2026-06-26-booking-engine-design.md
-- instructors, enrollments, bookings + RLS + state-transition RPCs.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist;

alter table public.driving_schools
  add column if not exists lesson_duration_min int,
  add column if not exists booking_enabled     boolean not null default false;


-- ──── instructors ────

create table if not exists public.instructors (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.driving_schools(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists instructors_school_idx on public.instructors (school_id) where active;


-- ──── enrollments (student ↔ school link) ────

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


-- ──── bookings ────

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  student_id    uuid not null references auth.users(id) on delete cascade,
  instructor_id uuid references public.instructors(id) on delete set null,
  starts_at     timestamptz not null,
  duration_min  int not null check (duration_min > 0),
  -- maintained by trigger set_booking_ends_at (timestamptz + interval is only STABLE,
  -- so it cannot drive a generated column; a trigger keeps it in sync instead)
  ends_at       timestamptz,
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

-- keep ends_at = starts_at + duration_min (BEFORE trigger; runs before NOT NULL/constraint checks)
create or replace function public.set_booking_ends_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.ends_at := new.starts_at + make_interval(mins => new.duration_min);
  return new;
end;
$$;

drop trigger if exists bookings_set_ends_at on public.bookings;
create trigger bookings_set_ends_at
  before insert or update of starts_at, duration_min on public.bookings
  for each row execute procedure public.set_booking_ends_at();

-- HARD GUARANTEE: no two confirmed lessons overlap for the same instructor
alter table public.bookings
  drop constraint if exists bookings_no_instructor_overlap;
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


-- ──── RLS ────

alter table public.instructors enable row level security;
alter table public.enrollments enable row level security;
alter table public.bookings    enable row level security;

-- instructors: school owner full; active-enrolled students may read
drop policy if exists "instructors_owner_all" on public.instructors;
create policy "instructors_owner_all" on public.instructors
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
drop policy if exists "instructors_admin_all" on public.instructors;
create policy "instructors_admin_all" on public.instructors
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');
drop policy if exists "instructors_enrolled_read" on public.instructors;
create policy "instructors_enrolled_read" on public.instructors
  for select using (
    exists (select 1 from public.enrollments e
            where e.school_id = instructors.school_id
              and e.student_id = auth.uid()
              and e.status = 'active')
  );

-- enrollments: student reads/inserts own; school owner reads own school; admin all
drop policy if exists "enrollments_student_read" on public.enrollments;
create policy "enrollments_student_read" on public.enrollments
  for select using (auth.uid() = student_id);
drop policy if exists "enrollments_student_insert" on public.enrollments;
create policy "enrollments_student_insert" on public.enrollments
  for insert with check (auth.uid() = student_id and status = 'pending');
drop policy if exists "enrollments_owner_read" on public.enrollments;
create policy "enrollments_owner_read" on public.enrollments
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
drop policy if exists "enrollments_admin_all" on public.enrollments;
create policy "enrollments_admin_all" on public.enrollments
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- bookings: student reads own; school owner reads own school; admin all.
-- inserts/updates happen through RPCs (security definer), so no broad write policy.
drop policy if exists "bookings_student_read" on public.bookings;
create policy "bookings_student_read" on public.bookings
  for select using (auth.uid() = student_id);
drop policy if exists "bookings_owner_read" on public.bookings;
create policy "bookings_owner_read" on public.bookings
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all" on public.bookings
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');


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
