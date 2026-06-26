-- ════════════════════════════════════════════════════════════════════════════
-- 009_availability.sql — configurable booking availability
-- See docs/superpowers/specs/2026-06-26-guide-reservation-fixes-design.md
-- School weekly hours (driving_schools.booking_hours) + per-instructor weekly hours
-- (instructor_availability) + list_available_slots RPC + request_booking hardening.
-- ════════════════════════════════════════════════════════════════════════════

-- ──── school weekly booking hours ────
-- shape: {"1":[["09:00","13:00"],["15:00","18:00"]], ...}
-- keys = ISO weekday 1=Mon … 7=Sun; value = list of [start,end] "HH:MM" ranges (UTC wall clock).
alter table public.driving_schools
  add column if not exists booking_hours jsonb;


-- ──── per-instructor weekly availability ────
create table if not exists public.instructor_availability (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  weekday       int  not null check (weekday between 1 and 7),
  start_time    time not null,
  end_time      time not null,
  check (start_time < end_time)
);
create index if not exists instructor_availability_idx
  on public.instructor_availability (instructor_id, weekday);

alter table public.instructor_availability enable row level security;

drop policy if exists "ia_owner_all" on public.instructor_availability;
create policy "ia_owner_all" on public.instructor_availability for all using (
  auth.uid() = (
    select ds.user_id from public.instructors i
    join public.driving_schools ds on ds.id = i.school_id
    where i.id = instructor_id
  )
);

drop policy if exists "ia_admin_all" on public.instructor_availability;
create policy "ia_admin_all" on public.instructor_availability for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

drop policy if exists "ia_enrolled_read" on public.instructor_availability;
create policy "ia_enrolled_read" on public.instructor_availability for select using (
  exists (
    select 1 from public.instructors i
    join public.enrollments e on e.school_id = i.school_id
    where i.id = instructor_id and e.student_id = auth.uid() and e.status = 'active'
  )
);


-- ──── available-slot computation ────
-- SECURITY DEFINER: students cannot read other students' confirmed bookings under RLS,
-- so the slot math must run server-side. Returns the available lesson START timestamps
-- for one school on one calendar day. A slot is offered when it falls inside school hours
-- AND ≥1 active instructor is on-shift for the whole slot AND that instructor has no
-- confirmed booking overlapping the slot AND the slot start is in the future.
create or replace function public.list_available_slots(p_school_id uuid, p_day date)
returns setof timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_duration int;
  v_enabled  boolean;
  v_hours    jsonb;
  v_dow      int := extract(isodow from p_day)::int;
  v_range    jsonb;
  v_start_t  time;
  v_end_t    time;
  v_slot     timestamptz;
  v_end      timestamptz;
  v_slot_t   time;
  v_end_time time;
begin
  select lesson_duration_min, booking_enabled, booking_hours
    into v_duration, v_enabled, v_hours
    from public.driving_schools where id = p_school_id;

  if v_enabled is not true or v_duration is null or v_duration <= 0 or v_hours is null then
    return;
  end if;

  for v_range in
    select * from jsonb_array_elements(coalesce(v_hours -> (v_dow::text), '[]'::jsonb))
  loop
    v_start_t := (v_range ->> 0)::time;
    v_end_t   := (v_range ->> 1)::time;
    v_slot    := (p_day + v_start_t) at time zone 'UTC';

    while v_slot + make_interval(mins => v_duration) <= (p_day + v_end_t) at time zone 'UTC' loop
      v_end      := v_slot + make_interval(mins => v_duration);
      v_slot_t   := (v_slot at time zone 'UTC')::time;
      v_end_time := (v_end  at time zone 'UTC')::time;

      if v_slot > now() and exists (
        select 1 from public.instructors ins
        where ins.school_id = p_school_id and ins.active
          and exists (
            select 1 from public.instructor_availability ia
            where ia.instructor_id = ins.id
              and ia.weekday = v_dow
              and ia.start_time <= v_slot_t
              and ia.end_time   >= v_end_time
          )
          and not exists (
            select 1 from public.bookings b
            where b.instructor_id = ins.id
              and b.status = 'confirmed'
              and tstzrange(b.starts_at, b.ends_at) && tstzrange(v_slot, v_end)
          )
      ) then
        return next v_slot;
      end if;

      v_slot := v_end;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.list_available_slots(uuid, date) from anon;
grant  execute on function public.list_available_slots(uuid, date) to authenticated;


-- ──── harden request_booking: re-validate the slot server-side ────
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

  if not exists (
    select 1 from public.list_available_slots(p_school_id, (p_starts_at at time zone 'UTC')::date) s
    where s = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.bookings (school_id, student_id, starts_at, duration_min, status, licence_code)
  values (p_school_id, v_uid, p_starts_at, v_duration, 'pending', v_licence)
  returning id into v_id;
  return v_id;
end;
$$;
