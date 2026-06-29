-- ════════════════════════════════════════════════════════════════════════════
-- 013_auto_confirm.sql
-- Optional auto-confirm for student lesson requests. When a school enables it,
-- request_booking immediately confirms the lesson and assigns the first free
-- active instructor for that slot — no manual approval step. When off (default),
-- the request stays 'pending' for the school to confirm via confirm_booking.
-- Also pins the availability-day lookup to Europe/Rome (was UTC) so the slot
-- check matches list_available_slots near midnight.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.driving_schools
  add column if not exists auto_confirm boolean not null default false;

comment on column public.driving_schools.auto_confirm is
  'When true, student booking requests are auto-confirmed and assigned to a free instructor instead of waiting as pending.';

create or replace function public.request_booking(
  p_school_id uuid, p_starts_at timestamptz)
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

  if v_auto is true then
    v_end     := p_starts_at + make_interval(mins => v_duration);
    v_dow     := extract(isodow from (p_starts_at at time zone 'Europe/Rome'))::int;
    v_t_start := (p_starts_at at time zone 'Europe/Rome')::time;
    v_t_end   := (v_end       at time zone 'Europe/Rome')::time;

    -- first free active instructor for this slot
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
    order by ins.created_at
    limit 1;

    if v_instructor is not null then
      begin
        insert into public.bookings (
          school_id, student_id, instructor_id, starts_at, duration_min,
          status, licence_code, decided_at)
        values (
          p_school_id, v_uid, v_instructor, p_starts_at, v_duration,
          'confirmed', v_licence, now())
        returning id into v_id;
        return v_id;
      exception when exclusion_violation then
        -- instructor got booked in a race → fall through to a pending request
        v_instructor := null;
      end;
    end if;
  end if;

  -- default: pending request (auto-confirm off, or no instructor free to assign)
  insert into public.bookings (
    school_id, student_id, starts_at, duration_min, status, licence_code)
  values (p_school_id, v_uid, p_starts_at, v_duration, 'pending', v_licence)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.request_booking(uuid, timestamptz) from public;
revoke execute on function public.request_booking(uuid, timestamptz) from anon;
grant  execute on function public.request_booking(uuid, timestamptz) to authenticated;
