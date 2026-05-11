-- ════════════════════════════════════════════════════════════════════════════
-- 004_claim_via_domain_full_payload.sql
-- Restore the 11-arg signature of claim_driving_school_via_domain so the
-- existing frontend caller (DrivingSchoolDashboard.tsx auto-claim effect)
-- works end-to-end. The v2.0 RPC introduced in 002 only accepted p_place_id;
-- the caller has always passed the full payload from the localStorage
-- `domain_claim` blob. This migration restores the full payload signature.
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.claim_driving_school_via_domain(text);

create or replace function public.claim_driving_school_via_domain(
  p_place_id      text,
  p_school_name   text,
  p_address       text default null,
  p_city          text default null,
  p_zip           text default null,
  p_region        text default null,
  p_phone         text default null,
  p_website       text default null,
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_opening_hours jsonb default null
) returns uuid language plpgsql security definer
set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_school_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.driving_schools
    (user_id, place_id, name, address, city, zip, region, phone, website, lat, lng, opening_hours,
     status, decided_at, decided_by, claimed_at)
  values
    (v_uid, p_place_id, p_school_name, p_address, p_city, p_zip, p_region, p_phone, p_website,
     p_lat, p_lng, p_opening_hours, 'accepted', now(), v_uid, now())
  returning id into v_school_id;

  update public.profiles set approved = true where id = v_uid;

  return v_school_id;
end;
$$;

revoke execute on function public.claim_driving_school_via_domain(
  text, text, text, text, text, text, text, text, double precision, double precision, jsonb
) from public, anon;

grant execute on function public.claim_driving_school_via_domain(
  text, text, text, text, text, text, text, text, double precision, double precision, jsonb
) to authenticated;
