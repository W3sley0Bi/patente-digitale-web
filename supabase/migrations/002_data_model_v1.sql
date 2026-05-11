-- ════════════════════════════════════════════════════════════════════════════
-- 002_data_model_v1.sql — Data model v2.0
-- See docs/data-model.md (§8 migration plan).
-- One-shot transform of 001 → v2.0 schema. No transaction blocks (Supabase wraps).
-- ════════════════════════════════════════════════════════════════════════════


-- ──── 1. RENAME claimed_schools → driving_schools (must be first) ────

alter table public.claimed_schools rename to driving_schools;


-- ──── 2. profiles.role — add 'admin' ────

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'autoscuola', 'admin'));


-- ──── 3. EXTEND driving_schools (§3.3) ────

alter table public.driving_schools
  -- created_at was missing from 001; needed by status index and v2.0 invariants
  add column if not exists created_at    timestamptz not null default now(),
  -- claim lifecycle (merges in the old pending_claims table)
  add column if not exists status        text not null default 'pending'
    check (status in ('pending','accepted','rejected')),
  add column if not exists claim_notes   text,
  add column if not exists decided_at    timestamptz,
  add column if not exists decided_by    uuid references auth.users(id),
  -- contacts (PDF wishlist 4–6, 23)
  add column if not exists mobile                text,
  add column if not exists fiscal_code           text,
  add column if not exists email                 text,
  add column if not exists whatsapp_business     text,
  add column if not exists proprietary_app       jsonb,
  -- tag arrays (filterable)
  add column if not exists languages_spoken      text[]   default '{}'
    check (languages_spoken <@ array['it','en','fr','es','ar','ro','de','sq','zh','ru']::text[]),
  add column if not exists documents_required    text[]   default '{}',
  -- instructor summary (table dropped; keep aggregate signals)
  add column if not exists instructor_count            int,
  add column if not exists has_female_instructor       boolean,
  add column if not exists instructor_specializations  text[] default '{}',
  -- structured display (non-filterable)
  add column if not exists accessibility         jsonb,
  add column if not exists medical_visit         jsonb,
  add column if not exists exam_fees             jsonb,
  add column if not exists pass_rates            jsonb,
  add column if not exists social                jsonb,
  -- text + admin fields
  add column if not exists description           text,
  add column if not exists piva                  text,
  add column if not exists chamber_of_commerce_no text,
  add column if not exists ministerial_authorization text,
  add column if not exists founded_year          int,
  add column if not exists avg_exam_wait_days    int,
  -- trust / state
  add column if not exists verified              boolean  not null default false,
  add column if not exists verified_at           timestamptz,
  add column if not exists founding_partner      boolean  not null default false,
  add column if not exists claimed_at            timestamptz default now();


-- ──── 4. place_id uniqueness — global → partial on accepted ────

alter table public.driving_schools
  drop constraint if exists claimed_schools_place_id_key;

create unique index if not exists driving_schools_place_id_accepted
  on public.driving_schools (place_id) where status = 'accepted';

create index if not exists driving_schools_city_idx      on public.driving_schools (city);
create index if not exists driving_schools_region_idx    on public.driving_schools (region);
create index if not exists driving_schools_status_idx    on public.driving_schools (status, created_at desc);
create index if not exists driving_schools_languages_gin on public.driving_schools using gin (languages_spoken);
create index if not exists driving_schools_specs_gin     on public.driving_schools using gin (instructor_specializations);


-- ──── 5. MIGRATE pending_claims → driving_schools, then drop ────
-- pending_claims rows have user_id nullable; driving_schools.user_id is NOT NULL.
-- We can only migrate rows that have a user_id. The existing 2 rows are expected
-- to have one (they're real claim attempts). Rows without a user_id are skipped.

insert into public.driving_schools
  (user_id, place_id, name, piva, status, claim_notes, created_at, updated_at, claimed_at)
select
  pc.user_id,
  coalesce(pc.place_id, 'pending-' || pc.id::text) as place_id,
  pc.school_name,
  pc.piva,
  case pc.status
    when 'pending'  then 'pending'
    when 'approved' then 'accepted'
    when 'rejected' then 'rejected'
    else 'pending'
  end as status,
  pc.notes,
  pc.created_at,
  pc.created_at,
  pc.created_at
from public.pending_claims pc
where pc.user_id is not null;

drop table if exists public.pending_claims cascade;


-- ──── 6. RLS rewrite on driving_schools ────

drop policy if exists "claimed_schools_owner_write"  on public.driving_schools;
drop policy if exists "claimed_schools_public_read"  on public.driving_schools;

-- public sees only accepted rows
create policy "driving_schools_public_read" on public.driving_schools
  for select using (status = 'accepted');

-- owner can read + write their own rows at any status
create policy "driving_schools_owner_all" on public.driving_schools
  for all using (auth.uid() = user_id);

-- admin sees + writes everything
create policy "driving_schools_admin_all" on public.driving_schools
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ──── 7. driving_licences (§3.4) ────

create table if not exists public.driving_licences (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  licence_code  text not null,
  price         float8,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (school_id, licence_code)
);

alter table public.driving_licences enable row level security;

create policy "licences_owner_write" on public.driving_licences
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );

create policy "licences_public_read" on public.driving_licences
  for select using (true);

create index if not exists driving_licences_school_idx on public.driving_licences (school_id);
create index if not exists driving_licences_code_idx   on public.driving_licences (licence_code);
create index if not exists driving_licences_price_idx  on public.driving_licences (licence_code, price);


-- ──── 8. school_vehicles (§3.5) ────

create table if not exists public.school_vehicles (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  licence_id    uuid references public.driving_licences(id) on delete set null,
  category      text not null check (category in ('car','motorcycle','scooter','truck','bus')),
  transmission  text check (transmission in ('manual','automatic','na')),
  fuel          text check (fuel in ('petrol','diesel','electric','hybrid','lpg','methane')),
  engine_cc     int,
  count         int not null default 1 check (count > 0),
  year          int,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.school_vehicles enable row level security;

create policy "vehicles_owner_write" on public.school_vehicles
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );

create policy "vehicles_public_read" on public.school_vehicles
  for select using (true);

create index if not exists school_vehicles_school_idx   on public.school_vehicles (school_id);
create index if not exists school_vehicles_licence_idx  on public.school_vehicles (licence_id);
create index if not exists school_vehicles_category_idx on public.school_vehicles (category, transmission);
create index if not exists school_vehicles_fuel_idx     on public.school_vehicles (fuel);


-- ──── 9. school_photos (§3.8) ────

create table if not exists public.school_photos (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.driving_schools(id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.school_photos enable row level security;

create policy "school_photos_owner_write" on public.school_photos
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );

create policy "school_photos_public_read" on public.school_photos
  for select using (true);

create index if not exists school_photos_school_idx on public.school_photos (school_id, sort_order);


-- ──── 10. Role-enforcement trigger on driving_schools.user_id (§5.2) ────

create or replace function public.check_driving_school_owner_role()
returns trigger language plpgsql as $$
declare r text;
begin
  select role into r from public.profiles where id = new.user_id;
  if r is null then raise exception 'profile_not_found'; end if;
  if r not in ('autoscuola','admin') then
    raise exception 'role_must_be_autoscuola_or_admin (got %)', r;
  end if;
  return new;
end;
$$;

drop trigger if exists driving_schools_role_check on public.driving_schools;
create trigger driving_schools_role_check
  before insert or update of user_id on public.driving_schools
  for each row execute procedure public.check_driving_school_owner_role();


-- ──── 11. school_completion view (§4) ────

create or replace view public.school_completion as
select
  s.id as school_id,
  (
    -- Tier 1 (40 pts)
    (case when s.name          is not null then  4 else 0 end) +
    (case when s.address       is not null then  4 else 0 end) +
    (case when s.phone         is not null then  4 else 0 end) +
    (case when s.opening_hours is not null then  6 else 0 end) +
    (case when exists(select 1 from public.driving_licences l where l.school_id = s.id) then 8 else 0 end) +
    (case when s.piva          is not null then 14 else 0 end) +
    -- Tier 2 (40 pts)
    (case when exists(
       select 1 from public.driving_licences l
       where l.school_id = s.id and l.price is not null
     ) then 10 else 0 end) +
    (case when exists(select 1 from public.school_vehicles v where v.school_id = s.id) then  6 else 0 end) +
    (case when array_length(s.languages_spoken, 1) > 0 then  8 else 0 end) +
    (case when s.description is not null then  6 else 0 end) +
    (case when exists(select 1 from public.school_photos p where p.school_id = s.id) then 10 else 0 end) +
    -- Tier 3 (20 pts)
    (case when s.accessibility is not null then  5 else 0 end) +
    (case when s.medical_visit is not null then  5 else 0 end) +
    (case when s.exam_fees     is not null then  5 else 0 end) +
    (case when s.pass_rates    is not null then  5 else 0 end)
  )::int as completion_pct
from public.driving_schools s;

-- Respect the querying user's RLS, not the creator's (advisor: 0010_security_definer_view).
alter view public.school_completion set (security_invoker = true);


-- ──── 12. RPCs (§5.1, §5.3, §5.4) ────

drop function if exists public.claim_school_via_domain(text);

create or replace function public.claim_driving_school_via_domain(p_place_id text)
returns uuid language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_school_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.driving_schools
    (user_id, place_id, status, decided_at, decided_by, claimed_at)
  values
    (v_uid, p_place_id, 'accepted', now(), v_uid, now())
  returning id into v_school_id;

  return v_school_id;
end;
$$;

create or replace function public.approve_claim(p_school_id uuid)
returns void language plpgsql security definer as $$
declare v_user_id uuid;
begin
  if (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  update public.driving_schools
    set status      = 'accepted',
        decided_at  = now(),
        decided_by  = auth.uid(),
        updated_at  = now()
    where id = p_school_id and status = 'pending'
    returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'school_not_found_or_not_pending';
  end if;

  update public.profiles set approved = true where id = v_user_id;
end;
$$;

create or replace function public.reject_claim(p_school_id uuid, p_reason text default null)
returns void language plpgsql security definer as $$
begin
  if (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  update public.driving_schools
    set status      = 'rejected',
        decided_at  = now(),
        decided_by  = auth.uid(),
        claim_notes = coalesce(claim_notes || E'\n', '') || coalesce(p_reason, ''),
        updated_at  = now()
    where id = p_school_id and status = 'pending';
end;
$$;
