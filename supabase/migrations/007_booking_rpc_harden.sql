-- ════════════════════════════════════════════════════════════════════════════
-- 007_booking_rpc_harden.sql
-- The booking/enrollment RPCs are SECURITY DEFINER and authorize callers via
-- auth.uid() comparisons. For an anon caller auth.uid() is null, and
-- `null <> owner` is null (not true), so the owner guard would not fire.
-- Revoke EXECUTE from the anon role so only signed-in users can call them.
-- (The functions still self-authorize for authenticated non-owners.)
-- ════════════════════════════════════════════════════════════════════════════

revoke execute on function
  public.request_enrollment(uuid, text),
  public.approve_enrollment(uuid),
  public.reject_enrollment(uuid),
  public.request_booking(uuid, timestamptz),
  public.confirm_booking(uuid, uuid, timestamptz),
  public.decline_booking(uuid, text),
  public.cancel_booking(uuid, text)
from anon;
