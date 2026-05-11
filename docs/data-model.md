# Data Model — patente-digitale-web

Authoritative spec for the Supabase schema powering the autoscuola directory.

Companion files:
- [`MEMORY.md`](../MEMORY.md) — decisions and priorities (read first).
- [`docs/er-diagram.html`](./er-diagram.html) — visual ER diagram (open in browser).
- [`supabase/migrations/`](../supabase/migrations/) — actual SQL.

> Status: **draft v2.0** (2026-05-11). **Major simplification pass.** Dropped from v1: `reviews`, `school_memberships`, `membership_invitations` (the whole social-proof + enrollment chain — re-add when there's UI for them and a real signal value). **`pending_claims` merged into `driving_schools` via a `status` column** — one table per school regardless of approval state. Kept: PDF gap fields on `driving_schools`, simplified `driving_licences`, `school_vehicles` (FK to licence), `school_photos`, role trigger on owner. v1.x history below for context.
>
> Earlier history (compacted):
> - `currency` column dropped everywhere (EUR-only product).
> - `school_licenses` renamed to `driving_licences` (British spelling, matches column `licence_code`) and **drastically simplified** — only `id`, `school_id`, `licence_code`, `price`, timestamps. Removed: theory/practice split, lesson count/duration, time-to-licence, automatic_available, insurance_included, what_is_included.
> - `school_vehicles` now FK-connected to `driving_licences` (`licence_id`, 1 licence : many vehicles).
> - `school_services` table **dropped for now** (deferred; re-add when offering catalog matters).
>
> Lock + ship as `002_data_model_v1.sql` once reviewed.

---

## 1. Design principles

1. **Map renderer never touches the DB.** Public GeoJSON is the only input to `<MapView />`. Supabase is fetched only when a user clicks a *claimed* pin or visits a profile page.
2. **One row per school = `driving_schools`** (renamed from `claimed_schools` for clarity — every row is a school we host, not just claimed ones in some abstract sense). All enriched data hangs off it. The `place_id` is the join key against the GeoJSON.
3. **Three tiers, one table.** Tier 1 fields are required (NOT NULL where it makes sense). Tier 2 + 3 are nullable and surfaced via progressive disclosure cards on the dashboard. Tier ≠ table — it is purely a UX gate.
4. **Normalize where multi-row makes sense.** Photos, reviews → child tables. **Licences → child table** (`driving_licences`): one row per (school, licence_code) with a simple `price`. **Vehicles → child table** (`school_vehicles`): consistency with licences, plus an FK back to `driving_licences.licence_id` so we know which vehicle teaches which licence.
5. **JSONB is OK only for non-filterable structured display data.** Pure-tag arrays (languages spoken) → `text[]` + GIN. Items with per-item state (active/inactive, price, dates) → normalized table.
6. **Money is `float8`.** Display rounded to 2 decimals at the UI layer. **Do not** perform sums/commissions in raw SQL without a rounding policy — float math is not exact.
7. **Profile completion is a view.** Computed from a weighted formula on the row state — never stored, never trusted from the client.
7. **RLS first.** Public read for `driving_schools` and `reviews(approved)`. Owner write on their own school. Admin override for moderation.

---

## 2. Tier definitions

### Tier 1 — required to publish a claim

The minimum a school must provide to land on the map as "claimed".

| Field | Type | Notes |
|---|---|---|
| `name` | text | Trade name |
| `address` | text | Street + civic |
| `city` | text | |
| `zip` | text | CAP, 5 digits |
| `region` | text | ISO-style code (`TO`, `MI`, `RM`...) |
| `lat`, `lng` | float8 | From GeoJSON or geocoder |
| `phone` | text | E.164 preferred |
| `opening_hours` | jsonb | Weekly schedule, see §6.1 |
| `piva` | text | Required for verification (≠ public) |

Licence coverage lives in the `driving_licences` table — at least 1 row is required to publish. Licence codes: `AM`, `A1`, `A2`, `A`, `B`, `B96`, `BE`, `C1`, `C`, `CE`, `D1`, `D`, `DE`.

Already populated for many records via the GeoJSON ingest (license types in particular).

### Tier 2 — unlocks "complete enough" UX (suggested fields)

| Field / table | Type | Notes |
|---|---|---|
| `driving_licences` rows have `licence_code` + `price` (float) | child table | See §3.4 |
| `school_vehicles` rows | child table | See §3.5 |
| `languages_spoken` | text[] (enum-constrained) | `it`, `en`, `fr`, `es`, `ar`, `ro`, `de`, `sq`, `zh`, `ru` |
| `description` | text | Short bio, ~500 chars |
| `website` | text | Already exists |
| `email` | text | Public contact (separate from owner login email) |
| `whatsapp_business` | text | Optional public WA number |

### Tier 3 — power users / trust max

| Field | Type | Notes |
|---|---|---|
| `services` | text[] | `cqc`, `adr`, `recupero_punti`, `conversione_estere`, `rinnovo`, `visite_mediche`, `pratiche_auto`, `corsi_online` |
| `accessibility` | jsonb | `{wheelchair, parking, near_transit, evening_hours, weekend_hours}` |
| `documents_required` | text[] | i18n keys, not free text |
| `medical_visit` | jsonb | `{on_site, price, hours, location}` (price as float) |
| `exam_fees` | jsonb | `{theory_presentation, practice_presentation, retake_theory, retake_practice, bollettini_included}` (prices as float) |
| `pass_rates` | jsonb | `{theory_pct, practice_pct, year, source}` (self-reported, mark "self-declared" in UI) |
| `founded_year` | int | |
| `chamber_of_commerce_no` | text | |
| `ministerial_authorization` | text | |
| `social` | jsonb | `{instagram, facebook, tiktok, youtube}` |

### Trust / state flags (system-managed)

| Field | Type | Notes |
|---|---|---|
| `verified` | bool | Set true by admin after manual review |
| `verified_at` | timestamptz | |
| `founding_partner` | bool | True iff `verified = true AND completion_pct >= 80` at Founding Partner deadline |
| `claimed_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 3. Tables

### 3.1 `profiles` (existing — minor change)

Add `admin` to the role check.

```sql
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'autoscuola', 'admin'));
```

### 3.2 ~~`pending_claims`~~ — merged into `driving_schools.status`

Dropped in v2.0. A school's life cycle is now one row in `driving_schools` with `status ∈ {pending, accepted, rejected}`. Approval / rejection is a `UPDATE` on the same row, not a row move.

Data migration in `002`: copy every `pending_claims` row into `driving_schools` with `status='pending'` (preserving lat/lng/opening_hours/etc.), then `drop table pending_claims`.

### 3.3 `driving_schools` (renamed from `claimed_schools` — extended + claim lifecycle merged in)

The rename is the first statement of the migration so every subsequent reference uses the new name. New: claim-lifecycle columns (`status`, `claim_notes`, `decided_at`, `decided_by`) plus the PDF gap fields. Removed (moved to child tables): `license_types`, `prices`, `vehicles`, `time_to_license`, `services`. Pure-tag arrays kept: `languages_spoken` (enum-constrained), `documents_required`, `instructor_specializations`.

```sql
alter table public.claimed_schools rename to driving_schools;

alter table public.driving_schools
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
  add column if not exists proprietary_app       jsonb,                 -- {name, ios_url, android_url, web_url}
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

-- place_id was globally unique in 001. With the merged claim lifecycle, multiple
-- pending claims for the same place are allowed; only one accepted row may exist.
alter table public.driving_schools drop constraint if exists claimed_schools_place_id_key;
create unique index if not exists driving_schools_place_id_accepted
  on public.driving_schools (place_id) where status = 'accepted';

create index if not exists driving_schools_city_idx      on public.driving_schools (city);
create index if not exists driving_schools_region_idx    on public.driving_schools (region);
create index if not exists driving_schools_status_idx    on public.driving_schools (status, created_at desc);
create index if not exists driving_schools_languages_gin on public.driving_schools using gin (languages_spoken);
create index if not exists driving_schools_specs_gin     on public.driving_schools using gin (instructor_specializations);
```

**RLS rewrite for v2.0:**

```sql
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
```

### 3.4 `driving_licences` (NEW — simplified)

One row per (school, licence_code). Bare-bones: just code + price. Detailed pricing (theory/practice split, lesson counts, time-to-licence, automatic-only flag, etc.) is deferred to v2.

```sql
create table public.driving_licences (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  licence_code  text not null,    -- 'AM','A1','A2','A','B','B96','BE','C1','C','CE','D1','D','DE'
  price         float8,           -- EUR
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

create index driving_licences_school_idx on public.driving_licences (school_id);
create index driving_licences_code_idx   on public.driving_licences (licence_code);
create index driving_licences_price_idx  on public.driving_licences (licence_code, price);
```

> v2 extensions to revisit when product asks for them: per-licence theory/practice price split, included-lesson count + duration, time-to-licence estimates, automatic-only flag, what's-included flags, instalment plans. None of these are needed for the v1 directory.

### 3.5 `school_vehicles` (NEW)

One row per distinct vehicle entry. School can list multiple of the same category — model details optional.

```sql
create table public.school_vehicles (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  licence_id    uuid references public.driving_licences(id) on delete set null,  -- which licence this vehicle teaches
  category      text not null check (category in ('car','motorcycle','scooter','truck','bus')),
  transmission  text check (transmission in ('manual','automatic','na')),
  fuel          text check (fuel in ('petrol','diesel','electric','hybrid','lpg','methane')),
  engine_cc     int,          -- relevant for motorcycle/scooter
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

create index school_vehicles_school_idx   on public.school_vehicles (school_id);
create index school_vehicles_licence_idx  on public.school_vehicles (licence_id);
create index school_vehicles_category_idx on public.school_vehicles (category, transmission);
create index school_vehicles_fuel_idx     on public.school_vehicles (fuel);
```

The `licence_id` FK lets us answer "which schools have an automatic car for licence B?" without a separate flag — just join `driving_licences` and `school_vehicles` on `(school_id, licence_code='B')` and check `school_vehicles.transmission='automatic'`.

### 3.6 ~~`school_services`~~ — deferred

Considered for v1 (per-service active toggle + price) and **dropped for now**. Service catalog is not a priority before we have claimed schools to even list services for. Reintroduce when the offering catalog becomes a product surface.

### 3.7 ~~`school_memberships`~~ — deferred to v2

Considered for v1 (status machine for student ↔ school link) and **dropped**. No UI surface today, and "is this enrollment?" confusion outweighs the benefit. Re-add when paid enrollment ships or when reviews need attendance verification.

<details><summary>v1.7/v1.8 design preserved here for reference — not in v2.0 migration.</summary>

### Historical: `school_memberships` (v1.7/v1.8)

Establishes the "I attend this school" link between a student and a school. **Created via invitation only in v1** — the school issues an invite (see §3.8), the student redeems it, and the membership is created already `accepted`. The `pending` / `rejected` statuses stay in the check constraint for future self-request flows; v1 doesn't write them.

```sql
create table public.school_memberships (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users(id) on delete cascade,
  school_id      uuid not null references public.driving_schools(id) on delete cascade,
  invitation_id  uuid references public.membership_invitations(id) on delete set null,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','rejected','cancelled')),
  message        text,         -- optional student cover note (future self-request)
  decision_note  text,         -- optional school reply (future)
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 1 student → at most 1 ACTIVE (pending or accepted) membership.
-- Historical rejected/cancelled rows are allowed (so the student can retry).
create unique index school_memberships_one_active_per_student
  on public.school_memberships (student_id)
  where status in ('pending','accepted');

create index school_memberships_school_status_idx
  on public.school_memberships (school_id, status, requested_at desc);

alter table public.school_memberships enable row level security;

-- Student creates and reads their own rows; can cancel.
create policy "memberships_student_own" on public.school_memberships
  for all using (auth.uid() = student_id);

-- School owner reads + decides on requests for their school.
create policy "memberships_school_owner" on public.school_memberships
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
```

State transitions in v1 (invitation-only):

```
                  redeem_membership_invitation()
(no row) --------------------------------------> accepted
accepted --(student cancels)--> cancelled
accepted --(school owner cancels)--> cancelled
```

`cancelled` is terminal in this row — the student must redeem a new invitation to rejoin. `pending` / `rejected` reserved for future self-request flow.

### 3.8 `membership_invitations` (NEW)

School-issued, single-use (by default) tokens that authorize a student to join.

```sql
create table public.membership_invitations (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  code          text not null unique,          -- short shareable token, e.g. 8-char base32
  invited_email text,                          -- optional: lock redemption to this email
  invited_name  text,                          -- optional: name shown in student UI
  message       text,                          -- optional welcome note
  max_uses      int  not null default 1 check (max_uses > 0),
  used_count    int  not null default 0,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

alter table public.membership_invitations enable row level security;

create policy "invitations_school_owner" on public.membership_invitations
  for all using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );

-- A logged-in student can read an invitation only by knowing its code
-- (handled through the RPC; no public read policy needed).

create index invitations_school_idx on public.membership_invitations (school_id, revoked_at);
create index invitations_code_idx   on public.membership_invitations (code) where revoked_at is null;
```

The code is short, human-readable (base32 / 8 chars), and pasteable into a chat/email/WhatsApp. The URL surface is `/i/<code>` (route TBD).

</details>

### 3.8 `school_photos` (NEW)

```sql
create table public.school_photos (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.driving_schools(id) on delete cascade,
  storage_path text not null,            -- bucket: 'school-photos'
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

create index school_photos_school_idx on public.school_photos (school_id, sort_order);
```

**Storage strategy:**

| Layer | Decision |
|---|---|
| Where bytes live | **Supabase Storage**, bucket `school-photos`, public-read, owner-write. *Never* store image bytes in Postgres (`bytea`) — anti-pattern: bloats backups, no CDN, slow queries. |
| MIME allow-list | `image/jpeg`, `image/png`, `image/webp` |
| Max file size | 2 MB |
| Cap per school (v1) | 5 photos |
| Free-tier headroom | Supabase free = 1 GB. ~500 schools × 5 photos × ~400 KB fits comfortably. |
| Growth path (>1 GB) | Migrate bucket to **Cloudflare R2** — 10 GB free + zero egress fees. `storage_path` column already abstracts the backend so a migration only touches the URL signer. |

Row in `school_photos` stores `storage_path` (the bucket key), never the bytes themselves.

### 3.9 ~~`reviews`~~ — deferred to v2

Considered for v1 (custom Supabase-backed review system, see `MEMORY.md` decision log) and **dropped** in v2.0 simplification. Today's placeholder testimonials cover the marketing-page need. Re-add together with `school_memberships` when there's an enrolled-student surface.

> `school_instructors` is also deferred (low priority). The aggregate signals (`instructor_count`, `has_female_instructor`, `instructor_specializations`) live on `driving_schools` instead.

<details><summary>v1.7/v1.8 reviews schema preserved here for reference — not in v2.0 migration.</summary>

```sql
create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  membership_id   uuid not null references public.school_memberships(id) on delete cascade,
  school_id       uuid not null references public.driving_schools(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete cascade,
  rating          int  not null check (rating between 1 and 5),
  title           text,
  body            text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'reported')),
  owner_reply     text,
  owner_replied_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (membership_id)                -- one review per membership
);

-- Enforce: review can only exist if the membership is/was accepted
-- and the author/school match the membership.
create or replace function public.reviews_check_membership()
returns trigger language plpgsql as $$
declare m public.school_memberships;
begin
  select * into m from public.school_memberships where id = new.membership_id;
  if m is null                          then raise exception 'membership_not_found'; end if;
  if m.student_id <> new.author_id      then raise exception 'author_membership_mismatch'; end if;
  if m.school_id  <> new.school_id      then raise exception 'school_membership_mismatch'; end if;
  if m.status    <> 'accepted'          then raise exception 'membership_not_accepted'; end if;
  return new;
end;
$$;

create trigger reviews_check_membership_trigger
  before insert or update of membership_id, author_id, school_id on public.reviews
  for each row execute procedure public.reviews_check_membership();

alter table public.reviews enable row level security;

create policy "reviews_author_write" on public.reviews
  for all using (auth.uid() = author_id);

create policy "reviews_owner_reply" on public.reviews
  for update using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  ) with check (
    (select user_id from public.driving_schools where id = school_id) = auth.uid()
  );

create policy "reviews_public_read_approved" on public.reviews
  for select using (status = 'approved');

create index reviews_school_status_idx on public.reviews (school_id, status, created_at desc);
```

The trigger is the source of truth for "only enrolled students can review". The unique constraint on `membership_id` prevents review spamming the same school.

Open: should reviewers be required to be enrolled / have a verified `auth.users` row? **v1.x decision: any authenticated user can write, admin moderates.** Tighten later.

</details>

### 3.10 ~~`notifications`~~ — deferred to v2

Considered for v1 (mailbox + nudges) and **dropped**. Reasoning:

- "Claim approved" → dashboard banner on next visit (no table needed).
- "Complete your profile" → dashboard card driven by the `school_completion` view (no table needed).
- "New review received" → email + dashboard badge (state can be inferred from `reviews.created_at` vs an owner-side `last_seen_at` if needed later).
- Owner outreach nudges → transactional email via Supabase Edge Functions or Resend.

We'll reintroduce `notifications` when we have ≥3 kinds of in-app events, need persistent unread-state, and an inbox surface in the UI. Not before.

---

## 4. Profile completion view

A view, not a column — recomputed on read. Weights to balance later via product feedback.

```sql
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
```

UI uses this view directly. Founding Partner gate = `completion_pct >= 80 AND verified = true`.

---

## 5. RPCs

### 5.1 `claim_driving_school_via_domain(p_place_id text)` — Flow 1 (renamed)

Renamed from `claim_school_via_domain`. With the v2.0 status-column merge, this RPC inserts a row into `driving_schools` directly with `status='accepted'` — domain-match is itself the trust signal, no admin needed. Sets `decided_at = now()` and `decided_by = auth.uid()`.

Code references in `SignupDrivingSchool.tsx` and `DrivingSchoolDashboard.tsx` must be updated in the same PR.

### 5.2 Role-enforcement trigger on `driving_schools`

```sql
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

create trigger driving_schools_role_check
  before insert or update of user_id on public.driving_schools
  for each row execute procedure public.check_driving_school_owner_role();
```

### 5.3 `approve_claim(p_school_id uuid)` — admin

Flips the status of a `driving_schools` row from `pending` to `accepted` and marks the owner's profile approved. No row-moving — the same row stays.

```sql
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
```

### 5.4 `reject_claim(p_school_id uuid, p_reason text)` — admin

Counterpart to approve. Records the reason in `claim_notes`.

```sql
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
```

---

## 6. JSONB shapes

### 6.1 `opening_hours`

Weekly schedule; supports both `segreteria` (front-desk) and `lezioni` (lessons) windows since they often differ.

```json
{
  "segreteria": {
    "mon": [{"open": "09:00", "close": "12:30"}, {"open": "15:00", "close": "19:00"}],
    "tue": [...],
    "wed": [...],
    "thu": [...],
    "fri": [...],
    "sat": [{"open": "09:00", "close": "12:00"}],
    "sun": []
  },
  "lezioni_teoria": { "mon": [...], ... },
  "lezioni_pratica": { "mon": [...], ... },
  "tz": "Europe/Rome"
}
```

### 6.2 ~~`prices` JSONB~~ → `driving_licences` rows

Removed. Each licence is one row in `driving_licences` with `licence_code` + `price` (float). See §3.4.

### 6.3 ~~`vehicles` JSONB~~ → `school_vehicles` rows

Removed. Each vehicle entry is one row, FK'd to its `driving_licences.licence_id`. See §3.5.

### 6.4 ~~`time_to_license` JSONB~~ — deferred

Not modeled in v1. Re-add when product surfaces a "tempo medio per la patente" filter or comparison view.

### 6.5 `pass_rates`

Self-declared; UI must label as such.

```json
{
  "year": 2025,
  "theory_pct": 92,
  "practice_pct": 88,
  "source": "self_declared"
}
```

---

## 7. Enumerations / controlled vocabularies

Stored as `text` / `text[]` for simplicity. UI validates against these lists. Add to `src/lib/enums.ts`.

- **Licence categories (`driving_licences.licence_code`):** `AM`, `A1`, `A2`, `A`, `B`, `B96`, `BE`, `C1`, `C`, `CE`, `D1`, `D`, `DE`, `KA`, `KB`
- **Languages spoken (enum, DB-enforced via check constraint on `driving_schools.languages_spoken`):** `it`, `en`, `fr`, `es`, `ar`, `ro`, `de`, `sq` (Albanian), `zh`, `ru`. Adding a new code requires migration + UI update.
- **Specializations (instructors):** `anxious`, `foreign_students`, `disabled`, `beginners`, `advanced`, `motorcycle_only`
- **Vehicle fuel:** `petrol`, `diesel`, `electric`, `hybrid`, `lpg`, `methane`

---

## 8. Migration plan

One migration, ordered:

1. `alter table public.claimed_schools rename to driving_schools;`
2. `profiles.role` check constraint update — add `admin`.
3. Extend `driving_schools` with: claim-lifecycle columns (`status`, `claim_notes`, `decided_at`, `decided_by`), PDF gap fields (mobile, fiscal_code, proprietary_app, instructor summary, avg_exam_wait_days, accessibility/medical_visit/exam_fees/pass_rates/social JSONB, description, languages_spoken, documents_required, trust flags), then indexes.
4. Drop the global `place_id` unique constraint; create the partial unique index `on (place_id) where status = 'accepted'`.
5. **Copy `pending_claims` rows into `driving_schools`** (map `pending`→`pending`, `approved`→`accepted`, `rejected`→`rejected`). Then `drop table pending_claims cascade`.
6. Drop old RLS policies on the renamed table; recreate the three v2.0 policies (`public_read` on accepted only, `owner_all`, `admin_all`).
7. Create `driving_licences`, `school_vehicles` (with `licence_id` FK), `school_photos`.
8. Install role-enforcement trigger on `driving_schools` (§5.2).
9. Create or replace view `school_completion` (reads from `driving_schools`, `driving_licences`, `school_vehicles`, `school_photos`).
10. Drop RPC `claim_school_via_domain`; create `claim_driving_school_via_domain` (writes `status='accepted'`).
11. Create RPCs `approve_claim(p_school_id)` (§5.3) and `reject_claim(p_school_id, p_reason)` (§5.4).

File: `supabase/migrations/002_data_model_v1.sql`. Do NOT touch `001_initial_schema.sql`.

---

## 9. Cardinality invariants

Document the relationships, including ones not yet enforced by tables.

| Relationship | Cardinality | Where enforced | Notes |
|---|---|---|---|
| `auth.users` → `profiles` | 1 : 0..1 | PK = FK on `profiles.id` | One profile row per user; trigger creates it on signup |
| `auth.users` (autoscuola role) → `driving_schools` | 1 : 0..N | FK `driving_schools.user_id` | **An owner can own many schools.** Franchise / chain case is fully supported by the existing FK; no schema change needed. |
| `driving_schools` → `driving_licences` | 1 : 1..N | FK + unique(school_id, licence_code) | At least 1 licence required for completion |
| `driving_schools` → `school_vehicles` | 1 : 0..N | FK | |
| `driving_licences` → `school_vehicles` | 1 : 0..N | FK `school_vehicles.licence_id` (on delete set null) | A vehicle teaches one licence; a licence can have many vehicles |
| `driving_schools` → `school_photos` | 1 : 0..5 | FK + app-level cap | Hard cap enforced in UI + RPC, not in SQL |
| `place_id` uniqueness | 0..1 accepted row per `place_id` | partial unique index `where status='accepted'` | Multiple pending claims allowed for the same school; only one accepted |

The "many schools per owner" case implies the dashboard needs a school-picker once an owner reaches ≥2 rows. Today's dashboard assumes 1 school per user — flag for `DrivingSchoolDashboard.tsx` follow-up.

Deferred relationships (re-add when their tables come back): `driving_schools` → `reviews`, `auth.users` → `school_memberships` / `membership_invitations`.

## 10. Open follow-ups

- **Money rendering helper.** `formatPrice(890.0, 'EUR') → "€890,00"`. Always render with `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` to enforce 2-decimal rounding at the UI layer.
- **i18n keys for enums.** Each enum value has a translation key (`enum.license.B`, `enum.service.cqc`...). Build the JSON entries.
- **Admin role bootstrap.** First admin user created manually in Supabase. Document the SQL.
- **Photo storage policy.** Bucket public-read, owner-write. Mime restricted to `image/jpeg|png|webp`. Max 2 MB.
- **Review abuse / spam.** v1 = admin moderates. v2 = rate-limit per author + IP, simple bayesian filter.
- **Consents.** When a school owner submits, they accept ToS + Privacy. Track in `driving_schools.consents jsonb`? Add later when legal copy exists.
- **Audit trail.** No history table in v1. Add `driving_schools_history` only when ownership transfers become a thing.
