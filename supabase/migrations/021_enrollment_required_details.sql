-- ════════════════════════════════════════════════════════════════════════════
-- 021_enrollment_required_details.sql
-- Enrollment requests now carry the student's licence type (required) and phone.
--   • licence_code → enrollments (per school), now mandatory in request_enrollment
--   • phone        → profiles (shared, school-visible), persisted on request
-- Also guard profiles.full_name: once set, no write path may blank it (mirrors the
-- coalesce protection school_update_student already applies).
-- ════════════════════════════════════════════════════════════════════════════

-- ── request_enrollment: require licence, persist phone to the profile ──
-- Signature changes (text → text, text) so the old grant/overload is dropped first.
drop function if exists public.request_enrollment(uuid, text);

create or replace function public.request_enrollment(
  p_school_id uuid,
  p_licence_code text,
  p_phone text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_licence text := nullif(btrim(p_licence_code), '');
  v_phone text := nullif(btrim(p_phone), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if (select role from public.profiles where id = v_uid) <> 'student' then
    raise exception 'role_must_be_student';
  end if;
  if v_licence is null then raise exception 'licence_required'; end if;

  insert into public.enrollments (school_id, student_id, status, licence_code)
  values (p_school_id, v_uid, 'pending', v_licence)
  on conflict (school_id, student_id) do update
    set status = case when public.enrollments.status in ('rejected','left')
                      then 'pending' else public.enrollments.status end,
        licence_code = excluded.licence_code
  returning id into v_id;

  if v_phone is not null then
    update public.profiles set phone = v_phone where id = v_uid;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.request_enrollment(uuid, text, text) from public, anon;
grant execute on function public.request_enrollment(uuid, text, text) to authenticated;

-- ── Guard: never blank an already-set full_name, on any client path ──
create or replace function public.profiles_keep_full_name()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Empty/whitespace incoming name reverts to the stored one (which may be null
  -- for legacy/magic-link rows that never set it). Setting a real name is allowed.
  if nullif(btrim(coalesce(new.full_name, '')), '') is null then
    new.full_name := old.full_name;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_keep_full_name on public.profiles;
create trigger profiles_keep_full_name
  before update on public.profiles
  for each row execute function public.profiles_keep_full_name();
