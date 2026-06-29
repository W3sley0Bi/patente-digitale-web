-- ════════════════════════════════════════════════════════════════════════════
-- 011_instructor_only_scheduling.sql
-- Single source of truth for bookable lesson times = per-instructor availability.
-- Drops the school-wide `booking_hours` layer from the scheduling logic:
--   • list_available_slots now GENERATES candidate slots from each active
--     instructor's availability ranges (was: looped booking_hours, filtered by
--     instructor availability). A slot is offered if ANY active instructor is
--     free for it.
--   • create_booking_as_school no longer gates on booking_hours (outside_hours);
--     the instructor-availability check is the only window gate.
-- booking_hours column is left in place (deprecated, unused) — no destructive drop.
-- All wall-clock math stays in Europe/Rome (see 010).
-- ════════════════════════════════════════════════════════════════════════════

comment on column public.driving_schools.booking_hours is
  'DEPRECATED (011): school-wide booking window no longer used. Bookable times come from instructor_availability only. Kept for historical data; safe to drop later.';

-- ──── list_available_slots — generated from instructor availability ────
create or replace function public.list_available_slots(p_school_id uuid, p_day date)
returns setof timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_duration int;
  v_enabled  boolean;
  v_dow      int := extract(isodow from p_day)::int;
begin
  select lesson_duration_min, booking_enabled
    into v_duration, v_enabled
    from public.driving_schools where id = p_school_id;

  if v_enabled is not true or v_duration is null or v_duration <= 0 then
    return;
  end if;

  return query
  with candidate as (
    select
      ia.instructor_id,
      gs as slot
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
  order by c.slot;
end;
$$;
revoke execute on function public.list_available_slots(uuid, date) from public;
revoke execute on function public.list_available_slots(uuid, date) from anon;
grant  execute on function public.list_available_slots(uuid, date) to authenticated;


-- ──── create_booking_as_school — instructor availability is the only window gate ────
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

  select licence_code into v_licence from public.enrollments
    where school_id = p_school_id and student_id = p_student_id and status = 'active';
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
revoke execute on function public.create_booking_as_school(uuid, uuid, uuid, timestamptz) from public;
revoke execute on function public.create_booking_as_school(uuid, uuid, uuid, timestamptz) from anon;
grant  execute on function public.create_booking_as_school(uuid, uuid, uuid, timestamptz) to authenticated;
