-- ════════════════════════════════════════════════════════════════════════════
-- 024_cancellation_policy.sql
-- Adds cancellation settings to public.driving_schools:
--   • cancellation_policy: 'always' (default), 'no_cancel', 'custom'
--   • cancellation_cutoff_hours: integer offset in hours (default 24)
-- Hardens the cancel_booking function to enforce these rules.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.driving_schools
  add column if not exists cancellation_policy text not null default 'always'
  constraint chk_cancellation_policy check (cancellation_policy in ('always', 'no_cancel', 'custom')),
  add column if not exists cancellation_cutoff_hours int not null default 24;

comment on column public.driving_schools.cancellation_policy is
  'Control cancellation for students: always, no_cancel, custom (cutoff limit).';

comment on column public.driving_schools.cancellation_cutoff_hours is
  'The offset in hours before a ride starts during which students cannot cancel (for custom cancellation policy).';

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

  if auth.uid() = v_student then 
    v_by := 'student';
    -- Fetch the school's cancellation policy
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
