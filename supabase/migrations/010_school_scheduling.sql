-- ════════════════════════════════════════════════════════════════════════════
-- 010_school_scheduling.sql
-- 1. Interpret booking_hours / instructor_availability in Europe/Rome (was UTC),
--    so availability matches the Rome-pinned calendar the school sees.
-- 2. list_enrolled_students — populate the school's "assign student" picker.
-- 3. create_booking_as_school — school clicks a slot and books a confirmed lesson
--    for a chosen student + instructor. The student sees it via bookings RLS.
-- ════════════════════════════════════════════════════════════════════════════

-- ──── list_available_slots, now Europe/Rome wall-clock ────
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
    v_slot    := (p_day + v_start_t) at time zone 'Europe/Rome';

    while v_slot + make_interval(mins => v_duration) <= (p_day + v_end_t) at time zone 'Europe/Rome' loop
      v_end      := v_slot + make_interval(mins => v_duration);
      v_slot_t   := (v_slot at time zone 'Europe/Rome')::time;
      v_end_time := (v_end  at time zone 'Europe/Rome')::time;

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
revoke execute on function public.list_available_slots(uuid, date) from public;
revoke execute on function public.list_available_slots(uuid, date) from anon;
grant  execute on function public.list_available_slots(uuid, date) to authenticated;


-- ──── enrolled students (for the school's assign picker) ────
create or replace function public.list_enrolled_students(p_school_id uuid)
returns table(student_id uuid, full_name text, licence_code text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select e.student_id, p.full_name, e.licence_code
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    where e.school_id = p_school_id and e.status = 'active'
    order by p.full_name nulls last;
end;
$$;
revoke execute on function public.list_enrolled_students(uuid) from public;
revoke execute on function public.list_enrolled_students(uuid) from anon;
grant  execute on function public.list_enrolled_students(uuid) to authenticated;


-- ──── school creates a confirmed lesson for a student + instructor ────
create or replace function public.create_booking_as_school(
  p_school_id uuid, p_student_id uuid, p_instructor_id uuid, p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_duration int; v_enabled boolean; v_hours jsonb; v_licence text;
  v_dow int; v_t_start time; v_t_end time; v_end timestamptz; v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select lesson_duration_min, booking_enabled, booking_hours
    into v_duration, v_enabled, v_hours
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

  if v_hours is null or not exists (
    select 1 from jsonb_array_elements(coalesce(v_hours -> (v_dow::text), '[]'::jsonb)) r
    where (r ->> 0)::time <= v_t_start and (r ->> 1)::time >= v_t_end
  ) then
    raise exception 'outside_hours';
  end if;

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
