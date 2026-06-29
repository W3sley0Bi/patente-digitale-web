-- ════════════════════════════════════════════════════════════════════════════
-- 020_calendar.sql — Student calendar subscription
-- Per-student secret .ics feed token + auto-add preference, on the profile.
-- Existing RLS "profiles_own_row" (001) already covers reads of the own token.
-- The calendar-feed edge function reads the token with the service role.
-- (Numbered 020 because 019_ was already taken by 019_enrollment_requests_named.sql.)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists calendar_feed_token uuid not null default gen_random_uuid(),
  add column if not exists calendar_auto       boolean not null default false;

-- Fast lookup by the secret feed token (used by the calendar-feed function).
create unique index if not exists profiles_calendar_feed_token_idx
  on public.profiles (calendar_feed_token);
