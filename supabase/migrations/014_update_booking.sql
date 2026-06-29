-- ════════════════════════════════════════════════════════════════════════════
-- 014_update_booking.sql
-- Edit an existing lesson from the school side: change student, instructor,
-- and/or start time. Same validation as create_booking_as_school (enrolment,
-- instructor in school + available, no clash), but updates in place and excludes
-- the booking itself from the clash check. Result is always a confirmed lesson.
-- ends_at is set explicitly so the conflict math is correct even if the row's
-- ends_at trigger only fires on insert.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.update_booking_as_school(
  p_booking_id uuid, p_student_id uuid, p_instructor_id uuid, p_starts_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_school   uuid;
  v_duration int;
  v_licence  text;
  v_dow      int;
  v_t_start  time;
  v_t_end    time;
  v_end      timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select school_id, duration_min into v_school, v_duration
    from public.bookings where id = p_booking_id;
  if v_school is null then raise exception 'booking_not_found'; end if;

  if v_uid <> (select user_id from public.driving_schools where id = v_school)
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'forbidden';
  end if;

  select licence_code into v_licence from public.enrollments
    where school_id = v_school and student_id = p_student_id and status = 'active';
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
      and b.instructor_id = p_instructor_id
      and b.status = 'confirmed'
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, v_end)
  ) then
    raise exception 'instructor_busy';
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
revoke execute on function public.update_booking_as_school(uuid, uuid, uuid, timestamptz) from public;
revoke execute on function public.update_booking_as_school(uuid, uuid, uuid, timestamptz) from anon;
grant  execute on function public.update_booking_as_school(uuid, uuid, uuid, timestamptz) to authenticated;
