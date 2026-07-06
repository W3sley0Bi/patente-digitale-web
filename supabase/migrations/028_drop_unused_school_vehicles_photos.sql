-- ─────────────────────────────────────────────────────────────────────────────
-- 028_drop_unused_school_vehicles_photos.sql
--
-- school_vehicles and school_photos were created in 002_data_model_v1.sql but
-- never wired into the app (Iscrizione.tsx renders hardcoded mock data for
-- vehicles/photos, no query ever touches these tables). Their only DB consumer,
-- the school_completion view, was already dropped in 005. Safe to drop.
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists public.school_vehicles cascade;
drop table if exists public.school_photos cascade;
