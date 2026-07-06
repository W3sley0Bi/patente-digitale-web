-- ─────────────────────────────────────────────────────────────────────────────
-- 029_drop_unused_driving_licences.sql
--
-- driving_licences was only ever read (Iscrizione.tsx), never written to by
-- any app code, RPC, or admin UI, and the live table is empty. Removed the
-- read query and its price fallback in Iscrizione.tsx; safe to drop the table.
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists public.driving_licences cascade;
