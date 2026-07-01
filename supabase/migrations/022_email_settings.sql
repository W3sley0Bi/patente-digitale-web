-- ════════════════════════════════════════════════════════════════════════════
-- 022_email_settings.sql
-- Per-school toggles for the drive-emailing feature. Both default on so existing
-- schools keep getting notifications without any action.
--   • email_student_confirmation → student gets a branded confirmation email
--     (with calendar) when a drive is confirmed (manual or auto-confirm path).
--   • email_school_request       → school gets a notification email whenever a
--     student requests a drive, regardless of auto-confirm.
-- The owner RLS update policy already permits the school to change these.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.driving_schools
  add column if not exists email_student_confirmation boolean not null default true,
  add column if not exists email_school_request       boolean not null default true;

comment on column public.driving_schools.email_student_confirmation is
  'When true, the student receives a confirmation email (with calendar) once a drive is confirmed.';

comment on column public.driving_schools.email_school_request is
  'When true, the school receives a notification email whenever a student requests a drive.';
