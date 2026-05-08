# Auth & Data Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase auth with student/autoscuola roles, a 4-path driving-school claim flow with domain-email auto-verification, an owner dashboard with school editing, and a static+delta merge in useCerca — keeping all reads free on Vercel CDN.

**Architecture:** Static GeoJSON (5.6MB) served from CDN for all 5000 schools; a small `claimed_schools` Supabase table overlays owner edits at read time via `mergeDelta`; auth uses Supabase Auth with a `profiles` table storing role and approval state; a nightly GitHub Actions cron keeps the static file in sync with Supabase.

**Tech Stack:** React 19, TypeScript strict, Supabase (Auth + PostgreSQL + RLS + Edge Function), @supabase/supabase-js, Vitest, @testing-library/react, GitHub Actions

---

## File Map

**Create:**
- `src/lib/supabase.ts` — Supabase client singleton
- `src/hooks/useAuth.ts` — session + signOut wrapper
- `src/hooks/useProfile.ts` — fetches profiles row, exposes role + approved
- `src/lib/mergeDelta.ts` — pure merge function: Supabase delta wins over static GeoJSON on place_id
- `src/components/auth/ProtectedRoute.tsx` — session + role + approved guard
- `src/components/auth/AuthForm.tsx` — shared email/magic-link/OAuth form
- `src/components/driving-school/ClaimSearch.tsx` — school name search against GeoJSON
- `src/components/driving-school/ClaimForm.tsx` — manual claim form (flows 3b/3c/3d)
- `src/components/driving-school/DashboardPending.tsx` — pending/rejected state UI
- `src/components/driving-school/SchoolEditor.tsx` — full CRUD form for claimed_schools fields
- `src/routes/Login.tsx`
- `src/routes/Signup.tsx` — role selector
- `src/routes/SignupDrivingSchool.tsx` — 4-path claim flow
- `src/routes/StudentDashboard.tsx` — placeholder
- `src/routes/DrivingSchoolDashboard.tsx` — claim status or edit entry
- `src/routes/DrivingSchoolEdit.tsx` — school editor page
- `supabase/migrations/001_initial_schema.sql`
- `scripts/sync-claimed-schools.mjs` — nightly sync
- `.github/workflows/nightly-sync.yml`

**Modify:**
- `src/lib/geojson.ts` — add `_placeId?: string` to `SchoolProperties`
- `src/hooks/useCerca.ts` — parallel fetch GeoJSON + claimed_schools, call mergeDelta
- `src/App.tsx` — add new routes, rename /cerca → /search

**Test files:**
- `src/hooks/__tests__/useProfile.test.ts`
- `src/lib/__tests__/mergeDelta.test.ts`
- `src/components/auth/__tests__/ProtectedRoute.test.tsx`
- `src/components/driving-school/__tests__/ClaimSearch.test.tsx`

---

## Task 1: Install @supabase/supabase-js + env setup

**Files:**
- Modify: `package.json`
- Create: `.env.local`

- [ ] **Step 1: Install the package**

```bash
cd patente-digitale-web && pnpm add @supabase/supabase-js
```

Expected: `+ @supabase/supabase-js` in output, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Create .env.local**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

> Get these from Supabase dashboard → Project Settings → API. Do NOT commit this file.

- [ ] **Step 3: Verify .env.local is gitignored**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` in output. If missing, add it.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install @supabase/supabase-js"
```

---

## Task 2: Supabase client singleton

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no errors (new file, no imports elsewhere yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client singleton"
```

---

## Task 3: Database schema (Supabase SQL editor)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/001_initial_schema.sql

-- ──────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────

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

-- ──────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.pending_claims  enable row level security;
alter table public.claimed_schools enable row level security;

-- profiles: each user manages only their own row
create policy "profiles_own_row" on public.profiles
  for all using (auth.uid() = id);

-- claimed_schools: owner manages their row; everyone can read all
create policy "claimed_schools_owner_write" on public.claimed_schools
  for all using (auth.uid() = user_id);

create policy "claimed_schools_public_read" on public.claimed_schools
  for select using (true);

-- pending_claims: anyone can insert; owner can read their own
create policy "pending_claims_insert" on public.pending_claims
  for insert with check (true);

create policy "pending_claims_own_read" on public.pending_claims
  for select using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TRIGGER: create profiles row on signup
-- role and full_name come from user_metadata set by the client
-- ──────────────────────────────────────────────────────────

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
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open Supabase project → SQL Editor → New query → paste contents of `001_initial_schema.sql` → Run.

Expected: all statements succeed. Check for any error messages.

- [ ] **Step 3: Verify in Table Editor**

Supabase → Table Editor: confirm `profiles`, `pending_claims`, `claimed_schools` all appear.

- [ ] **Step 4: Commit**

```bash
mkdir -p supabase/migrations
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: Supabase schema — profiles, pending_claims, claimed_schools, RLS, trigger"
```

---

## Task 4: Enable auth providers in Supabase dashboard

**Files:** none — Supabase dashboard config only.

- [ ] **Step 1: Enable Email provider**

Supabase → Authentication → Providers → Email:
- Enable Email ✓
- Enable "Confirm email" ✓

- [ ] **Step 2: Enable Google OAuth (for students)**

Supabase → Authentication → Providers → Google:
- Enable ✓
- Add Client ID and Client Secret from Google Cloud Console (APIs & Services → Credentials → OAuth 2.0)
- Authorized redirect URI to add in Google Console: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

- [ ] **Step 3: Enable Apple OAuth (for students)**

Supabase → Authentication → Providers → Apple:
- Enable ✓
- Add Services ID, Team ID, Key ID, Private Key from Apple Developer console
- Redirect URI: same pattern as Google above

- [ ] **Step 4: Configure URL settings**

Supabase → Authentication → URL Configuration:
- Site URL: `https://patentedigitale.it`
- Additional redirect URLs (one per line):
  - `http://localhost:5173/**`
  - `https://*.vercel.app/**`

> Apple and Google require production credentials. For local dev, use email+pw and magic link first.

---

## Task 5: Add `_placeId` to SchoolProperties type

**Files:**
- Modify: `src/lib/geojson.ts`

This is needed so `mergeDelta` and `ClaimSearch` can type-safely use `_placeId` from GeoJSON features. The field already exists in the raw data but is not in the TypeScript interface.

- [ ] **Step 1: Add the field**

In `src/lib/geojson.ts`, add `_placeId?: string` to `SchoolProperties`:

```typescript
export interface SchoolProperties {
  _placeId?: string;   // ← add this line
  name: string;
  city: string;
  zip: string;
  region: string;
  address: string;
  phone: string;
  website: string;
  partner?: boolean;
  rating?: number | null;
  userRatingCount?: number | null;
  businessStatus?: string;
  googleMapsUri?: string;
  openingHours?: string[];
  licenses?: string[];
  prices?: Record<string, string> | null;
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/geojson.ts
git commit -m "feat: add _placeId to SchoolProperties type"
```

---

## Task 6: useAuth hook

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signOut: () => supabase.auth.signOut().then(() => undefined),
  };
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook"
```

---

## Task 7: useProfile hook + test

**Files:**
- Create: `src/hooks/useProfile.ts`
- Create: `src/hooks/__tests__/useProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useProfile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

describe("useProfile", () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({
      data: { id: "u1", role: "student", approved: true, full_name: "Mario" },
      error: null,
    });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" } as never,
      session: {} as never,
      loading: false,
      signOut: async () => {},
    });
  });

  it("returns role and approved from profiles table", async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("student");
    expect(result.current.approved).toBe(true);
  });

  it("returns null role when no user is logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: async () => {},
    });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm vitest run src/hooks/__tests__/useProfile.test.ts
```

Expected: FAIL — "Cannot find module '@/hooks/useProfile'"

- [ ] **Step 3: Implement useProfile**

```typescript
// src/hooks/useProfile.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  role: "student" | "autoscuola";
  approved: boolean;
  full_name: string | null;
}

interface UseProfileReturn {
  profile: Profile | null;
  role: "student" | "autoscuola" | null;
  approved: boolean;
  loading: boolean;
  error: string | null;
}

export function useProfile(): UseProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setProfile(data as Profile);
        setLoading(false);
      });
  }, [user, authLoading]);

  return {
    profile,
    role: profile?.role ?? null,
    approved: profile?.approved ?? false,
    loading: authLoading || loading,
    error,
  };
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
pnpm vitest run src/hooks/__tests__/useProfile.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProfile.ts src/hooks/__tests__/useProfile.test.ts
git commit -m "feat: add useProfile hook with tests"
```

---

## Task 8: ProtectedRoute component + test

**Files:**
- Create: `src/components/auth/ProtectedRoute.tsx`
- Create: `src/components/auth/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/auth/__tests__/ProtectedRoute.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Wrap({ element }: { element: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/protected" element={element} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/driving-school/dashboard" element={<div>DS dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: null, approved: false, loading: false, error: null });
  });

  it("redirects to /login when not authenticated", () => {
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("renders children when role matches", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "student", approved: true, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("redirects when authenticated but wrong role", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "autoscuola", approved: true, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to /driving-school/dashboard when approved=false and requireApproved=true", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "autoscuola", approved: false, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="autoscuola" requireApproved><div>Editor</div></ProtectedRoute>} />);
    expect(screen.queryByText("Editor")).not.toBeInTheDocument();
    expect(screen.getByText("DS dashboard")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm vitest run src/components/auth/__tests__/ProtectedRoute.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/auth/ProtectedRoute'"

- [ ] **Step 3: Implement ProtectedRoute**

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: "student" | "autoscuola";
  requireApproved?: boolean;
}

export function ProtectedRoute({ children, requiredRole, requireApproved = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, approved, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return null;

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  if (requireApproved && !approved) {
    return <Navigate to="/driving-school/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm vitest run src/components/auth/__tests__/ProtectedRoute.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx src/components/auth/__tests__/ProtectedRoute.test.tsx
git commit -m "feat: add ProtectedRoute with role + approval guard"
```

---

## Task 9: AuthForm component

**Files:**
- Create: `src/components/auth/AuthForm.tsx`

- [ ] **Step 1: Create AuthForm**

```typescript
// src/components/auth/AuthForm.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup" | "magic-link";

interface AuthFormProps {
  mode: AuthMode;
  role?: "student" | "autoscuola";
  fullName?: string;
  onSuccess?: () => void;
}

export function AuthForm({ mode, role = "student", fullName, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const metadata = { role, full_name: fullName ?? "" };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "magic-link") {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { data: metadata },
      });
      if (err) setError(err.message);
      else setMagicSent(true);
    } else if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (err) setError(err.message);
      else onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else onSuccess?.();
    }

    setLoading(false);
  };

  const handleOAuth = (provider: "google" | "apple") => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { queryParams: { role } },
    });
  };

  if (magicSent) {
    return (
      <p className="text-center text-sm text-ink-muted">
        Magic link sent to <strong>{email}</strong>. Check your inbox.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
        {mode !== "magic-link" && (
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="border rounded px-3 py-2 text-sm"
            />
          </label>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? "..."
            : mode === "magic-link"
            ? "Send magic link"
            : mode === "signup"
            ? "Create account"
            : "Log in"}
        </Button>
      </form>

      {role === "student" && (
        <>
          <div className="text-center text-xs text-ink-muted">or continue with</div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => handleOAuth("google")} type="button">
              Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuth("apple")} type="button">
              Apple
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthForm.tsx
git commit -m "feat: add shared AuthForm (email, magic link, OAuth)"
```

---

## Task 10: Login, Signup, StudentDashboard routes + App.tsx update

**Files:**
- Create: `src/routes/Login.tsx`
- Create: `src/routes/Signup.tsx`
- Create: `src/routes/StudentDashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Login.tsx**

```typescript
// src/routes/Login.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { role, loading } = useProfile();

  useEffect(() => {
    if (!user || loading) return;
    const next = searchParams.get("next");
    if (next) { navigate(next, { replace: true }); return; }
    if (role === "autoscuola") navigate("/driving-school/dashboard", { replace: true });
    else navigate("/student/dashboard", { replace: true });
  }, [user, role, loading, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        <AuthForm mode="login" />
        <p className="text-center text-sm text-ink-muted">
          No account?{" "}
          <a href="/signup" className="underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Signup.tsx**

```typescript
// src/routes/Signup.tsx
import { useNavigate, useSearchParams } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">Create an account</h1>

        {role !== "student" && (
          <>
            <p className="text-center text-sm text-ink-muted">Who are you?</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setSearchParams({ role: "student" })}
                className="border rounded-lg p-4 text-left hover:bg-bg-raised transition-colors"
              >
                <div className="font-semibold">I'm a student</div>
                <div className="text-sm text-ink-muted mt-0.5">
                  Find an autoscuola and prepare for your exam
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate("/signup/driving-school")}
                className="border rounded-lg p-4 text-left hover:bg-bg-raised transition-colors"
              >
                <div className="font-semibold">I run a driving school</div>
                <div className="text-sm text-ink-muted mt-0.5">
                  Claim your listing and manage your profile
                </div>
              </button>
            </div>
          </>
        )}

        {role === "student" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium">Create your student account</p>
            <AuthForm
              mode="signup"
              role="student"
              onSuccess={() => navigate("/student/dashboard")}
            />
          </div>
        )}

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StudentDashboard.tsx**

```typescript
// src/routes/StudentDashboard.tsx
export default function StudentDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Student dashboard</h1>
        <p className="text-ink-muted mt-2">
          Quiz, enrolled school, and progress tracking — coming soon.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.tsx**

Replace the contents of `src/App.tsx` with:

```typescript
// src/App.tsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/Landing";
import { ScrollToHash } from "./hooks/useScrollToHash";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Cerca = lazy(() => import("./routes/Cerca"));
const Iscrizione = lazy(() => import("./routes/Iscrizione"));
const Partner = lazy(() => import("./routes/Partner"));
const Login = lazy(() => import("./routes/Login"));
const Signup = lazy(() => import("./routes/Signup"));
const SignupDrivingSchool = lazy(() => import("./routes/SignupDrivingSchool"));
const StudentDashboard = lazy(() => import("./routes/StudentDashboard"));
const DrivingSchoolDashboard = lazy(() => import("./routes/DrivingSchoolDashboard"));
const DrivingSchoolEdit = lazy(() => import("./routes/DrivingSchoolEdit"));

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-bg">
    <div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/cerca" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<Cerca />} />
          <Route path="/iscrizione" element={<Iscrizione />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup/driving-school" element={<SignupDrivingSchool />} />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driving-school/dashboard"
            element={
              <ProtectedRoute requiredRole="autoscuola">
                <DrivingSchoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driving-school/dashboard/edit"
            element={
              <ProtectedRoute requiredRole="autoscuola" requireApproved>
                <DrivingSchoolEdit />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: errors only for the three routes not yet created (SignupDrivingSchool, DrivingSchoolDashboard, DrivingSchoolEdit). Those come in Tasks 11–12.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Login.tsx src/routes/Signup.tsx src/routes/StudentDashboard.tsx src/App.tsx
git commit -m "feat: add login, signup, student dashboard routes and update App.tsx"
```

---

## Task 11: ClaimSearch component + test

**Files:**
- Create: `src/components/driving-school/ClaimSearch.tsx`
- Create: `src/components/driving-school/__tests__/ClaimSearch.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/driving-school/__tests__/ClaimSearch.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClaimSearch } from "@/components/driving-school/ClaimSearch";

const mockFeatures = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [12.5, 41.9] },
    properties: { _placeId: "place-1", name: "Autoscuola Roma Centro", city: "Roma", website: "https://www.romacentro.it" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [9.1, 45.4] },
    properties: { _placeId: "place-2", name: "Autoscuola Napoli Sud", city: "Napoli", website: null },
  },
];

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ type: "FeatureCollection", features: mockFeatures }),
  })
);

describe("ClaimSearch", () => {
  it("renders a search input", () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
  });

  it("shows results matching the query", async () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/school name/i), { target: { value: "roma" } });
    await waitFor(() => expect(screen.getByText("Autoscuola Roma Centro")).toBeInTheDocument());
  });

  it("does not show results that don't match", async () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/school name/i), { target: { value: "roma" } });
    await waitFor(() => expect(screen.queryByText("Autoscuola Napoli Sud")).not.toBeInTheDocument());
  });

  it("calls onSelect with school data on click", async () => {
    const onSelect = vi.fn();
    render(<ClaimSearch onSelect={onSelect} />);
    fireEvent.change(screen.getByPlaceholderText(/school name/i), { target: { value: "roma" } });
    await waitFor(() => screen.getByText("Autoscuola Roma Centro"));
    fireEvent.click(screen.getByText("Autoscuola Roma Centro"));
    expect(onSelect).toHaveBeenCalledWith({
      _placeId: "place-1",
      name: "Autoscuola Roma Centro",
      city: "Roma",
      website: "https://www.romacentro.it",
    });
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm vitest run src/components/driving-school/__tests__/ClaimSearch.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/driving-school/ClaimSearch'"

- [ ] **Step 3: Implement ClaimSearch**

```typescript
// src/components/driving-school/ClaimSearch.tsx
import { useEffect, useRef, useState } from "react";

export interface SchoolMatch {
  _placeId: string;
  name: string;
  city: string;
  website: string | null;
}

interface ClaimSearchProps {
  onSelect: (school: SchoolMatch) => void;
}

export function ClaimSearch({ onSelect }: ClaimSearchProps) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<SchoolMatch[]>([]);
  const [results, setResults] = useState<SchoolMatch[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/data/autoscuole.geojson")
      .then((r) => r.json())
      .then((data: { features: { properties: { _placeId?: string; name?: string; city?: string; website?: string | null } }[] }) => {
        setAll(
          data.features.map((f) => ({
            _placeId: f.properties._placeId ?? "",
            name: f.properties.name ?? "",
            city: f.properties.city ?? "",
            website: f.properties.website ?? null,
          }))
        );
      });
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const lower = query.toLowerCase();
    setResults(
      all
        .filter((s) => s.name.toLowerCase().includes(lower) || s.city.toLowerCase().includes(lower))
        .slice(0, 8)
    );
  }, [query, all]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Search school name or city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-3 py-2 text-sm"
      />
      {results.length > 0 && (
        <ul className="border rounded divide-y max-h-64 overflow-y-auto">
          {results.map((s) => (
            <li
              key={s._placeId || s.name}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="px-3 py-2 cursor-pointer hover:bg-bg-raised text-sm"
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-ink-muted text-xs">{s.city}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm vitest run src/components/driving-school/__tests__/ClaimSearch.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/driving-school/ClaimSearch.tsx src/components/driving-school/__tests__/ClaimSearch.test.tsx
git commit -m "feat: add ClaimSearch component with tests"
```

---

## Task 12: SignupDrivingSchool route + ClaimForm

**Files:**
- Create: `src/components/driving-school/ClaimForm.tsx`
- Create: `src/routes/SignupDrivingSchool.tsx`

- [ ] **Step 1: Create ClaimForm.tsx**

```typescript
// src/components/driving-school/ClaimForm.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";

interface ClaimFormProps {
  placeId?: string;
  schoolName?: string;
  onSuccess?: () => void;
}

type Step = "auth" | "details";

export function ClaimForm({ placeId, schoolName = "", onSuccess }: ClaimFormProps) {
  const [step, setStep] = useState<Step>("auth");
  const [fullName, setFullName] = useState("");
  const [piva, setPiva] = useState("");
  const [manualName, setManualName] = useState(schoolName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSuccess = () => setStep("details");

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setLoading(false); return; }

    const { error: err } = await supabase.from("pending_claims").insert({
      user_id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      piva: piva || null,
      place_id: placeId ?? null,
      school_name: manualName || schoolName,
    });

    if (err) setError(err.message);
    else onSuccess?.();
    setLoading(false);
  };

  if (step === "auth") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">First, create your account:</p>
        <AuthForm mode="signup" role="autoscuola" onSuccess={handleAuthSuccess} />
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="underline">Log in</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitClaim} className="flex flex-col gap-4">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      <label className="flex flex-col gap-1 text-sm">
        Your full name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </label>

      {!placeId && (
        <label className="flex flex-col gap-1 text-sm">
          School name
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            required
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        P.IVA (optional, helps speed up review)
        <input
          value={piva}
          onChange={(e) => setPiva(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit claim"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create SignupDrivingSchool.tsx**

```typescript
// src/routes/SignupDrivingSchool.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { ClaimSearch, type SchoolMatch } from "@/components/driving-school/ClaimSearch";
import { ClaimForm } from "@/components/driving-school/ClaimForm";
import { AuthForm } from "@/components/auth/AuthForm";

type Step = "search" | "domain-email" | "manual-claim" | "not-found" | "done";

function extractDomain(website: string): string {
  try { return new URL(website).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

export default function SignupDrivingSchool() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [selected, setSelected] = useState<SchoolMatch | null>(null);

  const domain = selected?.website ? extractDomain(selected.website) : "";

  const handleSelect = (school: SchoolMatch) => {
    setSelected(school);
    setStep(school.website ? "domain-email" : "manual-claim");
  };

  const handleDone = () => navigate("/driving-school/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Claim your driving school</h1>

        {step === "search" && (
          <>
            <p className="text-sm text-ink-muted">Search for your school to get started.</p>
            <ClaimSearch onSelect={handleSelect} />
            <button
              type="button"
              onClick={() => setStep("not-found")}
              className="text-sm underline text-ink-muted text-center mt-2"
            >
              My school isn't listed
            </button>
          </>
        )}

        {step === "domain-email" && selected && (
          <>
            <p className="text-sm text-ink-muted">
              We found <strong>{selected.name}</strong>. To get verified automatically, use a{" "}
              <strong>@{domain}</strong> email address.
            </p>
            <AuthForm mode="magic-link" role="autoscuola" onSuccess={handleDone} />
            <button
              type="button"
              onClick={() => setStep("manual-claim")}
              className="text-sm underline text-ink-muted text-center"
            >
              I don't have a @{domain} email
            </button>
          </>
        )}

        {step === "manual-claim" && selected && (
          <>
            <p className="text-sm text-ink-muted">
              <strong>{selected.name}</strong> — your claim will be reviewed manually, usually within 48 hours.
            </p>
            <ClaimForm
              placeId={selected._placeId}
              schoolName={selected.name}
              onSuccess={() => setStep("done")}
            />
          </>
        )}

        {step === "not-found" && (
          <>
            <p className="text-sm text-ink-muted">
              Your school isn't in our system yet. Submit a claim and we'll add it.
            </p>
            <ClaimForm onSuccess={() => setStep("done")} />
          </>
        )}

        {step === "done" && (
          <div className="text-center flex flex-col gap-4">
            <p className="font-semibold text-lg">Claim submitted!</p>
            <p className="text-sm text-ink-muted">You'll hear from us within 48 hours.</p>
            <button type="button" onClick={handleDone} className="underline text-sm">
              Go to your dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: errors only for DrivingSchoolDashboard + DrivingSchoolEdit (not yet created).

- [ ] **Step 4: Commit**

```bash
git add src/routes/SignupDrivingSchool.tsx src/components/driving-school/ClaimForm.tsx
git commit -m "feat: driving school claim flow — 4 paths (domain-email, manual, not-found)"
```

---

## Task 13: DrivingSchoolDashboard + DashboardPending + SchoolEditor + DrivingSchoolEdit

**Files:**
- Create: `src/components/driving-school/DashboardPending.tsx`
- Create: `src/components/driving-school/SchoolEditor.tsx`
- Create: `src/routes/DrivingSchoolDashboard.tsx`
- Create: `src/routes/DrivingSchoolEdit.tsx`

- [ ] **Step 1: Create DashboardPending.tsx**

```typescript
// src/components/driving-school/DashboardPending.tsx
interface DashboardPendingProps {
  status: "pending" | "rejected";
}

export function DashboardPending({ status }: DashboardPendingProps) {
  if (status === "rejected") {
    return (
      <div className="text-center flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Claim rejected</h2>
        <p className="text-ink-muted text-sm">
          Your ownership claim was not approved.{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">
            Contact us
          </a>{" "}
          to understand why.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Claim in review</h2>
      <p className="text-ink-muted text-sm">
        We're reviewing your ownership claim. Usually within 48 hours.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create SchoolEditor.tsx**

```typescript
// src/components/driving-school/SchoolEditor.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export interface SchoolEditorData {
  place_id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  region?: string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string[] | null;
  licenses?: string[] | null;
  lat?: number | null;
  lng?: number | null;
}

interface SchoolEditorProps {
  initial: SchoolEditorData;
  userId: string;
  onSaved?: () => void;
}

const ALL_LICENSES = ["AM", "A1", "A2", "A", "B1", "B", "BE", "C1", "C", "CE", "D1", "D", "DE", "CQC", "CAP", "recupero_punti"];
const TEXT_FIELDS = ["name", "address", "city", "zip", "region", "phone", "website"] as const;

export function SchoolEditor({ initial, userId, onSaved }: SchoolEditorProps) {
  const [form, setForm] = useState<SchoolEditorData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof SchoolEditorData>(key: K, value: SchoolEditorData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleLicense = (l: string, checked: boolean) => {
    const curr = form.licenses ?? [];
    setField("licenses", checked ? [...curr, l] : curr.filter((x) => x !== l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const { error: err } = await supabase.from("claimed_schools").upsert(
      { ...form, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "place_id" }
    );

    if (err) setError(err.message);
    else { setSaved(true); onSaved?.(); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      {saved && (
        <p className="text-green-700 text-sm">
          Saved. Changes visible on the map within minutes.
        </p>
      )}

      {TEXT_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-sm capitalize">
          {field}
          <input
            value={(form[field] as string) ?? ""}
            onChange={(e) => setField(field, e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </label>
      ))}

      <fieldset>
        <legend className="text-sm font-medium mb-2">Licenses offered</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ALL_LICENSES.map((l) => (
            <label key={l} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={(form.licenses ?? []).includes(l)}
                onChange={(e) => toggleLicense(l, e.target.checked)}
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Opening hours (one per line, e.g. "Lunedì: 9:00–19:00")
        <textarea
          rows={7}
          value={(form.opening_hours ?? []).join("\n")}
          onChange={(e) => setField("opening_hours", e.target.value.split("\n"))}
          className="border rounded px-3 py-2 text-sm font-mono"
        />
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create DrivingSchoolDashboard.tsx**

```typescript
// src/routes/DrivingSchoolDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { DashboardPending } from "@/components/driving-school/DashboardPending";
import { Button } from "@/components/ui/button";

interface ClaimRow {
  status: "pending" | "approved" | "rejected";
  school_name: string;
}

export default function DrivingSchoolDashboard() {
  const { user } = useAuth();
  const { approved } = useProfile();
  const [claim, setClaim] = useState<ClaimRow | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pending_claims")
      .select("status, school_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setClaim(data as ClaimRow);
      });
  }, [user]);

  if (!approved) {
    const pendingStatus = claim?.status === "rejected" ? "rejected" : "pending";
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <DashboardPending status={pendingStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{claim?.school_name ?? "Your driving school"}</h1>
      <p className="text-ink-muted mt-1 text-sm">Manage your listing on patentedigitale.it</p>
      <div className="mt-6">
        <Button asChild>
          <Link to="/driving-school/dashboard/edit">Edit my listing</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DrivingSchoolEdit.tsx**

```typescript
// src/routes/DrivingSchoolEdit.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { SchoolEditor } from "@/components/driving-school/SchoolEditor";
import type { SchoolEditorData } from "@/components/driving-school/SchoolEditor";

export default function DrivingSchoolEdit() {
  const { user } = useAuth();
  const [data, setData] = useState<SchoolEditorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("claimed_schools")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data: row }) => {
        setData(row as SchoolEditorData | null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/driving-school/dashboard" className="text-sm underline text-ink-muted">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit your listing</h1>
      </div>

      {user && data ? (
        <SchoolEditor initial={data} userId={user.id} />
      ) : (
        <p className="text-ink-muted text-sm">
          No school data found. Contact{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">support</a>.
        </p>
      )}
    </div>
  );
}
```

> **Note:** `SchoolEditorData` needs to be exported from `SchoolEditor.tsx`. In Step 2, add `export` before `interface SchoolEditorData`.

- [ ] **Step 5: TypeScript check — should be clean now**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/DrivingSchoolDashboard.tsx src/routes/DrivingSchoolEdit.tsx src/components/driving-school/DashboardPending.tsx src/components/driving-school/SchoolEditor.tsx
git commit -m "feat: driving school dashboard, pending state, school editor"
```

---

## Task 14: mergeDelta + useCerca update + test

**Files:**
- Create: `src/lib/mergeDelta.ts`
- Create: `src/lib/__tests__/mergeDelta.test.ts`
- Modify: `src/hooks/useCerca.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/mergeDelta.test.ts
import { describe, it, expect } from "vitest";
import { mergeDelta } from "@/lib/mergeDelta";
import type { NormalizedSchool } from "@/lib/geojson";

const makeSchool = (overrides: Partial<NormalizedSchool>): NormalizedSchool => ({
  _placeId: "place-1",
  name: "Autoscuola A",
  city: "Roma",
  zip: "00100",
  region: "Lazio",
  address: "Via Roma 1",
  phone: "06 111 222",
  website: "https://a.it",
  partner: false,
  latlng: [41.9, 12.5],
  licenses: ["B"],
  id: "41.9,12.5",
  ...overrides,
});

describe("mergeDelta", () => {
  it("returns base unchanged when delta is empty", () => {
    const base = [makeSchool({})];
    expect(mergeDelta(base, [])).toEqual(base);
  });

  it("Supabase record overrides base field on _placeId match", () => {
    const base = [makeSchool({ _placeId: "place-1", phone: "OLD" })];
    const delta = [{ place_id: "place-1", phone: "NEW", name: null }];
    const result = mergeDelta(base, delta);
    expect(result[0].phone).toBe("NEW");
  });

  it("null delta field does NOT override base (keeps base value)", () => {
    const base = [makeSchool({ _placeId: "place-1", name: "Original" })];
    const delta = [{ place_id: "place-1", name: null }];
    const result = mergeDelta(base, delta);
    expect(result[0].name).toBe("Original");
  });

  it("delta-only school (not in base) is appended", () => {
    const base = [makeSchool({ _placeId: "place-1" })];
    const delta = [{ place_id: "custom-xyz", name: "New School", city: "Torino", lat: 45.07, lng: 7.68 }];
    const result = mergeDelta(base, delta);
    expect(result).toHaveLength(2);
    expect(result.find((s) => s._placeId === "custom-xyz")).toBeDefined();
  });

  it("updates latlng when delta has lat + lng", () => {
    const base = [makeSchool({ _placeId: "place-1", latlng: [41.9, 12.5] })];
    const delta = [{ place_id: "place-1", lat: 45.0, lng: 9.0 }];
    const result = mergeDelta(base, delta);
    expect(result[0].latlng).toEqual([45.0, 9.0]);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm vitest run src/lib/__tests__/mergeDelta.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/mergeDelta'"

- [ ] **Step 3: Implement mergeDelta.ts**

```typescript
// src/lib/mergeDelta.ts
import type { NormalizedSchool } from "@/lib/geojson";

interface ClaimedSchoolRow {
  place_id: string;
  name?: string | null;
  city?: string | null;
  zip?: string | null;
  region?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string[] | null;
  licenses?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: unknown;
}

export function mergeDelta(base: NormalizedSchool[], delta: ClaimedSchoolRow[]): NormalizedSchool[] {
  if (delta.length === 0) return base;

  const deltaMap = new Map(delta.map((d) => [d.place_id, d]));

  const result: NormalizedSchool[] = base.map((school) => {
    const override = deltaMap.get(school._placeId ?? "");
    if (!override) return school;
    deltaMap.delete(school._placeId ?? "");

    return {
      ...school,
      name: override.name ?? school.name,
      city: override.city ?? school.city,
      zip: override.zip ?? school.zip,
      region: override.region ?? school.region,
      address: override.address ?? school.address,
      phone: override.phone ?? school.phone,
      website: override.website ?? school.website,
      licenses: override.licenses ?? school.licenses,
      latlng:
        override.lat != null && override.lng != null
          ? [override.lat, override.lng]
          : school.latlng,
    };
  });

  for (const [placeId, row] of deltaMap) {
    result.push({
      _placeId: placeId,
      name: row.name ?? "",
      city: row.city ?? "",
      zip: row.zip ?? "",
      region: row.region ?? "",
      address: row.address ?? "",
      phone: row.phone ?? "",
      website: row.website ?? "",
      partner: false,
      latlng: [row.lat ?? 0, row.lng ?? 0],
      licenses: row.licenses ?? [],
      id: `${row.lat ?? 0},${row.lng ?? 0}`,
    } as NormalizedSchool);
  }

  return result;
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm vitest run src/lib/__tests__/mergeDelta.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Update useCerca.ts to fetch delta and merge**

In `src/hooks/useCerca.ts`, add imports at the top:

```typescript
import { mergeDelta } from "@/lib/mergeDelta";
import { supabase } from "@/lib/supabase";
```

Then replace the existing `useEffect` that fetches `/data/autoscuole.geojson` with:

```typescript
useEffect(() => {
  Promise.all([
    fetch("/data/autoscuole.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
        return res.json() as Promise<SchoolsGeoJSON>;
      }),
    supabase
      .from("claimed_schools")
      .select("*")
      .then(({ data }) => data ?? []),
  ])
    .then(([geojson, delta]) => {
      const normalized = geojson.features.map((f) => {
        const s = normalizeSchool(f);
        return {
          ...s,
          region: s.region || getRegionForCoords(s.latlng[0], s.latlng[1]) || "",
        };
      });
      allSchoolsRef.current = mergeDelta(normalized, delta);
      setLoading(false);
      setLoadTick((t) => t + 1);
    })
    .catch((err) => {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    });
}, []);
```

- [ ] **Step 6: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mergeDelta.ts src/lib/__tests__/mergeDelta.test.ts src/hooks/useCerca.ts
git commit -m "feat: static+delta merge in useCerca, parallel GeoJSON + Supabase fetch"
```

---

## Task 15: Nightly sync script + GitHub Actions

**Files:**
- Create: `scripts/sync-claimed-schools.mjs`
- Create: `.github/workflows/nightly-sync.yml`

- [ ] **Step 1: Create sync script**

```javascript
// scripts/sync-claimed-schools.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: claimed, error } = await supabase.from("claimed_schools").select("*");
  if (error) { console.error("Supabase error:", error.message); process.exit(1); }
  if (!claimed || claimed.length === 0) {
    console.log("No claimed schools — nothing to sync.");
    return;
  }

  const geojsonPath = join(__dirname, "../public/data/autoscuole.geojson");
  const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8"));

  const deltaMap = new Map(claimed.map((c) => [c.place_id, c]));
  let patched = 0;

  geojson.features = geojson.features.map((feature) => {
    const placeId = feature.properties._placeId;
    const row = deltaMap.get(placeId);
    if (!row) return feature;
    deltaMap.delete(placeId);
    patched++;

    return {
      ...feature,
      geometry:
        row.lat != null && row.lng != null
          ? { type: "Point", coordinates: [row.lng, row.lat] }
          : feature.geometry,
      properties: {
        ...feature.properties,
        ...(row.name && { name: row.name }),
        ...(row.address && { address: row.address }),
        ...(row.city && { city: row.city }),
        ...(row.zip && { zip: row.zip }),
        ...(row.region && { region: row.region }),
        ...(row.phone && { phone: row.phone }),
        ...(row.website && { website: row.website }),
        ...(row.opening_hours && { openingHours: row.opening_hours }),
        ...(row.licenses && { licenses: row.licenses }),
      },
    };
  });

  // Append schools with custom place_ids (not in original GeoJSON)
  for (const [placeId, row] of deltaMap) {
    geojson.features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row.lng ?? 0, row.lat ?? 0] },
      properties: {
        _placeId: placeId,
        name: row.name ?? "",
        city: row.city ?? "",
        zip: row.zip ?? "",
        region: row.region ?? "",
        address: row.address ?? "",
        phone: row.phone ?? "",
        website: row.website ?? "",
        openingHours: row.opening_hours ?? [],
        licenses: row.licenses ?? [],
        businessStatus: "OPERATIONAL",
        partner: false,
      },
    });
    patched++;
  }

  writeFileSync(geojsonPath, JSON.stringify(geojson));
  console.log(`Sync complete: ${patched} school(s) patched.`);
}

main();
```

- [ ] **Step 2: Create GitHub Actions workflow**

```yaml
# .github/workflows/nightly-sync.yml
name: Nightly claimed-schools sync

on:
  schedule:
    - cron: "0 2 * * *"   # 02:00 UTC every night
  workflow_dispatch:        # allow manual run from GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Sync claimed schools into GeoJSON
        run: node scripts/sync-claimed-schools.mjs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Commit if GeoJSON changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/autoscuole.geojson
          git diff --cached --quiet || git commit -m "chore: nightly claimed-schools sync [skip ci]"
          git push
```

- [ ] **Step 3: Add secrets to GitHub repository**

GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
- `SUPABASE_URL` — your project URL (e.g. `https://abcdef.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API → `service_role` secret key

> Keep `SUPABASE_SERVICE_ROLE_KEY` secret — it bypasses RLS.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-claimed-schools.mjs .github/workflows/nightly-sync.yml
git commit -m "feat: nightly GeoJSON sync from claimed_schools"
```

---

## Task 16: Full verification

- [ ] **Step 1: Run all tests**

```bash
pnpm vitest run
```

Expected: all tests pass. Note the count — should include i18n parity test, useCerca test, geojson test, plus all new tests.

- [ ] **Step 2: TypeScript clean**

```bash
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: `dist/` produced, no errors or warnings.

- [ ] **Step 4: Smoke test local dev server**

```bash
pnpm dev
```

Open browser and verify:

| URL | Expected |
|---|---|
| `http://localhost:5173/login` | Login form renders, no console errors |
| `http://localhost:5173/signup` | Role selector renders |
| `http://localhost:5173/signup/driving-school` | Search input renders |
| `http://localhost:5173/search` | Map loads (check Network tab: GeoJSON + Supabase fetch both happen) |
| `http://localhost:5173/cerca` | Redirects to `/search` |
| `http://localhost:5173/student/dashboard` | Redirects to `/login` (not authenticated) |
| `http://localhost:5173/driving-school/dashboard` | Redirects to `/login` |
| `http://localhost:5173/driving-school/dashboard/edit` | Redirects to `/login` |

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: auth + claim flow + dashboard + static/delta architecture — complete"
```
