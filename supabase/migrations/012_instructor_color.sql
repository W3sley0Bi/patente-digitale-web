-- ════════════════════════════════════════════════════════════════════════════
-- 012_instructor_color.sql
-- Per-instructor calendar colour. Nullable: when null the UI falls back to a
-- palette colour derived from the instructor's position, so existing rows keep
-- their current look until a colour is explicitly assigned.
-- Stored as a CSS colour string (the app uses OKLCH values from the brand palette).
-- Writes are covered by the existing owner/admin update policy on instructors.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.instructors add column if not exists color text;

comment on column public.instructors.color is
  'Calendar colour for this instructor (CSS colour string, e.g. OKLCH). Null = UI palette fallback.';
