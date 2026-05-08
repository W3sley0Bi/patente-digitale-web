-- TABLES

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('student', 'autoscuola')),
  approved    boolean not null default false,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table public.pending_claims (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  full_name    text not null,
  piva         text,
  place_id     text,
  school_name  text not null,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  notes        text
);

create table public.claimed_schools (
  id             uuid primary key default gen_random_uuid(),
  place_id       text not null unique,
  user_id        uuid references auth.users(id) on delete cascade not null,
  updated_at     timestamptz not null default now(),
  name           text,
  address        text,
  city           text,
  zip            text,
  region         text,
  phone          text,
  website        text,
  opening_hours  jsonb,
  licenses       jsonb,
  prices         jsonb,
  lat            float,
  lng            float
);

-- RLS

alter table public.profiles        enable row level security;
alter table public.pending_claims  enable row level security;
alter table public.claimed_schools enable row level security;

create policy "profiles_own_row" on public.profiles
  for all using (auth.uid() = id);

create policy "claimed_schools_owner_write" on public.claimed_schools
  for all using (auth.uid() = user_id);

create policy "claimed_schools_public_read" on public.claimed_schools
  for select using (true);

create policy "pending_claims_insert" on public.pending_claims
  for insert with check (true);

create policy "pending_claims_own_read" on public.pending_claims
  for select using (auth.uid() = user_id);

-- TRIGGER: create profiles row on signup

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  insert into public.profiles (id, role, approved, full_name)
  values (
    new.id,
    v_role,
    case when v_role = 'student' then true else false end,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
