-- ════════════════════════════════════════════════════════════════════════════
-- 016_confirm_pending_backlog.sql
-- When a school turns auto-confirm ON, its existing pending requests should be
-- confirmed in one shot (auto-confirm only governs NEW requests otherwise).
-- confirm_pending_requests assigns the first free active instructor to each
-- pending booking and confirms it; requests with no free instructor are left
-- pending. Returns how many were confirmed.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.confirm_pending_requests(p_school_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_b record;
  v_instructor uuid;
  v_dow int;
  v_t_start time;
  v_t_end time;
  v_count int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_uid <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = v_uid) <> 'admin' then
    raise exception 'forbidden';
  end if;

  for v_b in
    select id, starts_at, ends_at
    from public.bookings
    where school_id = p_school_id and status = 'pending'
    order by starts_at
  loop
    v_dow     := extract(isodow from (v_b.starts_at at time zone 'Europe/Rome'))::int;
    v_t_start := (v_b.starts_at at time zone 'Europe/Rome')::time;
    v_t_end   := (v_b.ends_at   at time zone 'Europe/Rome')::time;

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
          and tstzrange(b.starts_at, b.ends_at) && tstzrange(v_b.starts_at, v_b.ends_at)
      )
    order by ins.created_at
    limit 1;

    if v_instructor is not null then
      begin
        update public.bookings
          set instructor_id = v_instructor,
              status        = 'confirmed',
              decided_at    = now(),
              updated_at    = now()
          where id = v_b.id and status = 'pending';
        v_count := v_count + 1;
      exception when exclusion_violation then
        -- instructor got booked concurrently; leave this one pending
        null;
      end;
    end if;
  end loop;

  return v_count;
end;
$$;
revoke execute on function public.confirm_pending_requests(uuid) from public;
revoke execute on function public.confirm_pending_requests(uuid) from anon;
grant  execute on function public.confirm_pending_requests(uuid) to authenticated;
