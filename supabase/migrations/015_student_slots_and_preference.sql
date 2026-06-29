-- ════════════════════════════════════════════════════════════════════════════
-- 015_student_slots_and_preference.sql
-- 1. A student never sees a slot they already hold (pending or confirmed) — but
--    the slot stays open to others while ≥1 instructor is free.
-- 2. Optional instructor filter on list_available_slots (student picks a
--    preferred instructor → sees only that instructor's free slots).
-- 3. bookings.preferred_instructor_id stores the student's choice; request_booking
--    honours it first when auto-confirming, and surfaces it to the school otherwise.
-- 4. Defensive student_busy guard on the school-side create/update so a student
--    can't be double-booked at the same time.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.bookings
  add column if not exists preferred_instructor_id uuid references public.instructors(id) on delete set null;

comment on column public.bookings.preferred_instructor_id is
  'Instructor the student asked for at request time (soft preference). Null = no preference.';

-- ──── list_available_slots: + instructor filter, − student''s own slots ────
drop function if exists public.list_available_slots(uuid, date);

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
      where sb.student_id = v_student
        and sb.status in ('pending', 'confirmed')
        and tstzrange(sb.starts_at, sb.ends_at)
            && tstzrange(c.slot, c.slot + make_interval(mins => v_duration))
    )
  order by c.slot;
end;
$$;
revoke execute on function public.list_available_slots(uuid, date, uuid) from public;
revoke execute on function public.list_available_slots(uuid, date, uuid) from anon;
grant  execute on function public.list_available_slots(uuid, date, uuid) to authenticated;

-- ──── request_booking: + preferred instructor ────
drop function if exists public.request_booking(uuid, timestamptz);

create or replace function public.request_booking(
  p_school_id uuid, p_starts_at timestamptz, p_preferred_instructor_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
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

  select licence_code into v_licence from public.enrollments
    where school_id = p_school_id and student_id = v_uid and status = 'active';
  if not found then raise exception 'not_enrolled'; end if;

  if not exists (
    select 1 from public.list_available_slots(
      p_school_id, (p_starts_at at time zone 'Europe/Rome')::date) s
    where s = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  -- keep the preference only if it's a real active instructor of this school
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

    -- prefer the requested instructor, else the first other free one
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
          p_school_id, v_uid, v_instructor, p_starts_at, v_duration,
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
  values (p_school_id, v_uid, p_starts_at, v_duration, 'pending', v_licence, v_pref)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.request_booking(uuid, timestamptz, uuid) from public;
revoke execute on function public.request_booking(uuid, timestamptz, uuid) from anon;
grant  execute on function public.request_booking(uuid, timestamptz, uuid) to authenticated;

-- ──── create_booking_as_school: + student_busy guard ────
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

-- ──── update_booking_as_school: + student_busy guard (excluding self) ────
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
