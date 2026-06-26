-- ════════════════════════════════════════════════════════════════════════════
-- 008_booking_rpc_grants.sql
-- 007 revoked EXECUTE from `anon`, but functions are created with a default
-- GRANT EXECUTE TO PUBLIC, which `anon` inherits — so the revoke had no effect.
-- Revoke from PUBLIC (and anon) and grant EXECUTE only to `authenticated`.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  sig text;
  sigs text[] := array[
    'public.request_enrollment(uuid, text)',
    'public.approve_enrollment(uuid)',
    'public.reject_enrollment(uuid)',
    'public.request_booking(uuid, timestamptz)',
    'public.confirm_booking(uuid, uuid, timestamptz)',
    'public.decline_booking(uuid, text)',
    'public.cancel_booking(uuid, text)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke execute on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated', sig);
  end loop;
end $$;
