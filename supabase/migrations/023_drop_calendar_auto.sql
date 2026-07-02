-- ════════════════════════════════════════════════════════════════════════════
-- 023_drop_calendar_auto.sql — Remove unused calendar auto-add preference
-- calendar_auto was never read by the calendar-feed edge function; the feed
-- always returns all confirmed/completed bookings regardless of its value.
-- Subscribing to the .ics feed already is the opt-in.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  drop column if exists calendar_auto;
