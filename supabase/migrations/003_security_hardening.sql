-- ════════════════════════════════════════════════════════════════════════════
-- 003_security_hardening.sql — Resolve Supabase advisor warnings from 002.
-- Fixes: function_search_path_mutable, anon_security_definer_function_executable,
-- and drops the stale 11-arg claim_school_via_domain that 002 missed.
-- ════════════════════════════════════════════════════════════════════════════


-- ──── 1. Drop the stale 11-arg claim_school_via_domain ────
-- 002 dropped the 1-arg signature; the live RPC was the 11-arg version.

drop function if exists public.claim_school_via_domain(
  text, text, text, text, text, text, text, text,
  double precision, double precision, jsonb
);


-- ──── 2. Pin search_path on all SECURITY DEFINER + trigger functions ────
-- Bodies already use schema-qualified names (public.x, auth.x), so empty path is safe.

alter function public.handle_new_user()                         set search_path = '';
alter function public.check_driving_school_owner_role()         set search_path = '';
alter function public.claim_driving_school_via_domain(text)     set search_path = '';
alter function public.approve_claim(uuid)                       set search_path = '';
alter function public.reject_claim(uuid, text)                  set search_path = '';


-- ──── 3. Lock down execute privileges ────
-- Trigger functions: nobody calls these via REST.
revoke execute on function public.handle_new_user()                 from public, anon, authenticated;
revoke execute on function public.check_driving_school_owner_role() from public, anon, authenticated;

-- User-callable RPCs: authenticated only. Admin gate is inside the function body.
revoke execute on function public.claim_driving_school_via_domain(text) from public, anon;
revoke execute on function public.approve_claim(uuid)                   from public, anon;
revoke execute on function public.reject_claim(uuid, text)              from public, anon;

grant  execute on function public.claim_driving_school_via_domain(text) to authenticated;
grant  execute on function public.approve_claim(uuid)                   to authenticated;
grant  execute on function public.reject_claim(uuid, text)              to authenticated;

-- Note on remaining advisor warnings (WARN level, intentional):
-- - "Signed-in users can execute SECURITY DEFINER function" on the three RPCs above
--   is the intended design. The admin gate lives inside the function body. Switching
--   to SECURITY INVOKER would require RLS policies that grant write access broadly,
--   which is worse.
-- - "Leaked Password Protection Disabled" is an Auth setting, not SQL —
--   enable via Supabase dashboard → Authentication → Providers → Email.
