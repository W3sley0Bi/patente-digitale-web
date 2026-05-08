# Auth & Data Ownership Design

**Date:** 2026-05-08  
**Scope:** Supabase auth, user roles, driving school claim flow, static+delta data architecture  
**Status:** Approved

---

## 1. Problem

All autoscuola data lives in a static GeoJSON file served from Vercel CDN. In the near future, school owners need to claim and edit their listing. At the same time, reads must stay cheap — fetching 5000 rows from a live database on every page load is not viable on free tiers at low-thousands daily traffic.

---

## 2. Architecture: Static + Delta

**Read path (every user, every page load):**

1. Fetch `/data/autoscuole.geojson` from Vercel CDN — cached, free, ~5.6MB
2. Fetch `claimed_schools` from Supabase — small table, only owner-edited schools
3. Merge in `useCerca`: build a Map keyed by `_placeId`; Supabase record wins on conflict

**Write path (approved owner):**

- Owner edits → `UPDATE claimed_schools` → visible to users within minutes (next delta fetch)
- No redeploy needed

**Nightly sync (GitHub Actions cron):**

- Read all `claimed_schools` from Supabase
- Patch `autoscuole.geojson` entries by `_placeId`
- Commit + push → Vercel redeploys → static file stays current, delta stays small

---

## 3. Database Schema

```sql
-- Differentiates students from driving school owners
-- Created automatically via DB trigger on auth.users insert
profiles (
  id          uuid primary key references auth.users(id),
  role        text not null check (role in ('student', 'autoscuola')),
  approved    boolean default false,  -- false until claim approved (autoscuola only)
  full_name   text,
  created_at  timestamptz default now()
)

-- Submitted by owners, reviewed by admin
pending_claims (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  user_id      uuid references auth.users(id),
  email        text not null,
  full_name    text not null,
  piva         text,
  place_id     text,              -- null if school not in system
  school_name  text not null,
  status       text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes        text               -- admin notes
)

-- Owner-edited school data (the delta)
claimed_schools (
  id             uuid primary key default gen_random_uuid(),
  place_id       text not null unique,
  user_id        uuid references auth.users(id) not null,
  updated_at     timestamptz default now(),
  name           text,
  address        text,
  city           text,
  zip            text,
  region         text,
  phone          text,
  website        text,
  opening_hours  jsonb,   -- array of strings
  licenses       jsonb,   -- array of license codes e.g. ["B","A","C"]
  prices         jsonb,
  lat            float,
  lng            float
)
```

**RLS policies:**

| Table | Rule |
|---|---|
| `profiles` | User reads/writes own row only |
| `claimed_schools` | Owner reads/writes own row; public can SELECT all |
| `pending_claims` | Anyone can INSERT; service-role only can UPDATE status |

---

## 4. User Model & Auth Methods

| User type | Auth methods | Notes |
|---|---|---|
| Student | Email+pw, Google OAuth, Apple, magic link | All methods available |
| Driving school | Email only (domain-verified or any) | No social login this phase |

Both types use the same Supabase Auth instance. Role is stored in `profiles.role`.

**DB trigger on `auth.users` insert:**

The signup call passes `options.data.role` in `user_metadata` (set by the client at signup time):
- `user_metadata.role = 'student'` → `profiles(role='student', approved=true)`
- `user_metadata.role = 'autoscuola'` → `profiles(role='autoscuola', approved=false)`

---

## 5. Routes

```
/login                              public — login for both user types
/signup                             public — role selector (student / driving school)
/signup/driving-school              public — driving school claim flow
/search                             public — replaces /cerca (redirect from /cerca)
/student/dashboard                  protected, role=student — placeholder "coming soon"
/driving-school/dashboard           protected, role=autoscuola — shows claim status or edit access
/driving-school/dashboard/edit      protected, role=autoscuola, approved=true — edit school data
```

**Route guard:** `ProtectedRoute` component checks session + `profiles.role`. Wrong role → redirect to `/login`. Not logged in → redirect to `/login` with `?next=` param.

---

## 6. User Flows

### Flow 1 — Student signup
```
/signup → "Sono uno studente"
→ AuthForm: email+pw / Google / Apple / magic link
→ Supabase creates auth.users
→ DB trigger → profiles(role='student', approved=true)
→ redirect → /student/dashboard
```

### Flow 2 — Login (any user)
```
/login → authenticate
→ useProfile() reads role
→ role='student'     → /student/dashboard
→ role='autoscuola'  → /driving-school/dashboard
```

### Flow 3a — Driving school signup (school in system + website, domain email)
```
/signup/driving-school
→ search school name → match found + website exists
→ "Login with @autoscuolacasati.it email"
→ Supabase magic link sent to domain email
→ owner clicks link → auth session created
→ DB trigger → profiles(role='autoscuola', approved=false)
→ pending_claims row inserted (status='pending', path='domain-verify')
→ domain email verified → Supabase Edge Function fires on magic link confirm
→ Edge Function: sets profiles.approved=true, creates claimed_schools row with place_id
→ no manual admin step needed for this path
→ redirect → /driving-school/dashboard
```

### Flow 3b — Driving school signup (school in system + website, different email)
```
/signup/driving-school
→ search → match + website found
→ "Use a different email" selected
→ any email + password signup
→ profiles(role='autoscuola', approved=false)
→ pending_claims(status='pending')
→ redirect → /driving-school/dashboard (shows "claim in review")
```

### Flow 3c — Driving school signup (school in system, no website)
```
/signup/driving-school
→ search → match found, no website
→ any email + password signup
→ profiles(role='autoscuola', approved=false)
→ pending_claims(status='pending')
→ redirect → /driving-school/dashboard (shows "claim in review")
```

### Flow 3d — Driving school signup (school not in system)
```
/signup/driving-school
→ search → no match
→ "My school isn't listed" → fill name, address, P.IVA manually
→ any email + password signup
→ profiles(role='autoscuola', approved=false)
→ pending_claims(status='pending', place_id=null)
→ redirect → /driving-school/dashboard (shows "claim in review")
→ admin approves + generates a new place_id (e.g. "custom-{uuid}") + creates claimed_schools row
→ school appears on /search via delta (not in static GeoJSON until next nightly sync)
```

### Flow 4 — Owner edits school (post-approval)
```
/driving-school/dashboard → "Edit my listing"
→ /driving-school/dashboard/edit
→ SchoolEditor pre-filled with claimed_schools data (falls back to GeoJSON data)
→ owner saves → PATCH claimed_schools
→ visible on /search within minutes
```

### Flow 5 — Admin approves a claim
```
Supabase dashboard → pending_claims table
→ set status='approved'
→ set profiles.approved=true for user_id
→ (for domain-verified: can be semi-automated via Supabase function)
→ Supabase sends approval email to owner
→ owner logs in → full edit access
```

### Flow 6 — Nightly static sync
```
GitHub Actions cron (nightly)
→ SELECT * FROM claimed_schools
→ patch autoscuole.geojson by _placeId
→ git commit + push
→ Vercel redeploys
```

---

## 7. Dashboard States (driving school)

| State | Condition | UI |
|---|---|---|
| Pending | `approved=false`, claim exists | "We're reviewing your claim, usually within 48h" |
| Rejected | `pending_claims.status='rejected'` | "Claim rejected — contact us" + link |
| Approved | `approved=true` | Full dashboard with edit access |

---

## 8. New Components

```
src/
  routes/
    Accedi.tsx              → replaced by /login (Login.tsx)
    Login.tsx               new — shared login form
    Signup.tsx              new — role selector
    SignupDrivingSchool.tsx new — claim flow (3 paths)
    StudentDashboard.tsx    new — placeholder
    DrivingSchoolDashboard.tsx  new — claim status or edit entry
  components/
    auth/
      AuthForm.tsx          shared login/signup (email+pw, Google, Apple, magic link)
      ProtectedRoute.tsx    session + role guard
    driving-school/
      ClaimSearch.tsx       school name search against GeoJSON
      ClaimForm.tsx         manual claim form (flows 3b/3c/3d)
      DashboardPending.tsx  pending/rejected state
      SchoolEditor.tsx      full CRUD form for claimed_schools fields
  hooks/
    useAuth.ts              Supabase session wrapper
    useProfile.ts           fetches profiles row, exposes role + approved
```

---

## 9. Out of Scope (this phase)

- Student dashboard features (quiz, enrolled school, study content)
- Google/Apple OAuth for driving school owners
- Automated P.IVA registry lookup
- Pricing / payments
- Admin UI (all admin work done directly in Supabase dashboard)
- Multi-school ownership (one owner = one school for now)
