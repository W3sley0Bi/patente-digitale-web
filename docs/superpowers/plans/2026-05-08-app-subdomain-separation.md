# app.patentedigitale.it Subdomain Separation — Implementation Plan

> **STATUS: DEFERRED** — fix the claim flow bug and mobile nav first. Execute this when mobile app development starts or a second developer joins.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the authenticated product from `app.patentedigitale.it` (Facebook model: root = login if unauth, dashboard if auth) while keeping the marketing site completely auth-unaware on `patentedigitale.it`. One repo, one Vercel project, two domains.

**Architecture:** `App.tsx` detects hostname and swaps the root route — `Landing` on `patentedigitale.it`, `Login` on `app.patentedigitale.it`. The "Accedi" button opens `app.patentedigitale.it` in a new tab. The marketing site has no auth state — `UserMenu` on `patentedigitale.it` is a static link, no Supabase calls. No cookie domain config needed: users only ever authenticate on `app.`, so cross-subdomain session sharing is irrelevant.

**Tech Stack:** React 19, React Router, Supabase JS v2, Vite, Vercel (single project), Aruba DNS

---

## Route Map

| Domain | Routes |
|--------|--------|
| `patentedigitale.it` | `/` (Landing), `/search`, `/cerca` → `/search` |
| `app.patentedigitale.it` | `/` (Login or dashboard), `/login`, `/reset-password`, `/signup/driving-school`, `/student/dashboard`, `/driving-school/dashboard`, `/driving-school/dashboard/edit`, `/driving-school/dashboard/settings`, `/quiz`, `/set-password` |

> `/iscrizione` and `/partner` are placeholder-only dead routes — removed from `App.tsx` in this plan.

---

## Files

| File | Change |
|------|--------|
| `src/lib/env.ts` | **Create** — centralise `APP_URL` + `isAppDomain()` |
| `src/App.tsx` | Swap root route based on hostname; remove dead routes |
| `src/components/nav/UserMenu.tsx` | On marketing domain: static `<a>` to `app.`; no auth hooks |
| `.env.local` | Add `VITE_APP_URL` |

---

## Task 1: Add env var and `isAppDomain` helper

**Files:**
- Modify: `.env.local`
- Create: `src/lib/env.ts`

- [ ] **Step 1: Add to `.env.local`**

```bash
# append to .env.local
VITE_APP_URL=http://localhost:5173
```

> Points to localhost in dev — `isAppDomain()` short-circuits on `localhost`, so no behaviour changes locally.

- [ ] **Step 2: Create `src/lib/env.ts`**

```ts
export const APP_URL = import.meta.env.VITE_APP_URL as string;

export function isAppDomain(): boolean {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return false;
  try {
    return host === new URL(APP_URL).hostname;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts .env.local
git commit -m "feat: add APP_URL env var and isAppDomain helper"
```

---

## Task 2: Swap root route by hostname in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Why:** `app.patentedigitale.it/` must render `Login` (which already auto-redirects to dashboard if session exists). `patentedigitale.it/` must render `Landing`. Same build, hostname decides at load time.

- [ ] **Step 1: Update `src/App.tsx`**

```tsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/Landing";
import { ScrollToHash } from "./hooks/useScrollToHash";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { isAppDomain } from "@/lib/env";

const Cerca = lazy(() => import("./routes/Cerca"));
const Login = lazy(() => import("./routes/Login"));
const QuizOnline = lazy(() => import("./routes/QuizOnline"));
const ResetPassword = lazy(() => import("./routes/ResetPassword"));
const SignupDrivingSchool = lazy(() => import("./routes/SignupDrivingSchool"));
const StudentDashboard = lazy(() => import("./routes/StudentDashboard"));
const DrivingSchoolDashboard = lazy(() => import("./routes/DrivingSchoolDashboard"));
const DrivingSchoolEdit = lazy(() => import("./routes/DrivingSchoolEdit"));
const SetPassword = lazy(() => import("./routes/SetPassword"));
const DrivingSchoolSettings = lazy(() => import("./routes/DrivingSchoolSettings"));

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-bg">
    <div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
  </div>
);

const onApp = isAppDomain();

function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={onApp ? <Login /> : <Landing />} />
          <Route path="/cerca" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<Cerca />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Navigate to="/login?tab=signup" replace />} />
          <Route path="/signup/driving-school" element={<SignupDrivingSchool />} />
          <Route path="/quiz" element={
            <ProtectedRoute requiredRole="student">
              <QuizOnline />
            </ProtectedRoute>
          } />
          <Route path="/student/dashboard" element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/driving-school/dashboard" element={
            <ProtectedRoute requiredRole="autoscuola">
              <DrivingSchoolDashboard />
            </ProtectedRoute>
          } />
          <Route path="/driving-school/dashboard/edit" element={
            <ProtectedRoute requiredRole="autoscuola" requireApproved>
              <DrivingSchoolEdit />
            </ProtectedRoute>
          } />
          <Route path="/driving-school/dashboard/settings" element={
            <ProtectedRoute requiredRole="autoscuola">
              <DrivingSchoolSettings />
            </ProtectedRoute>
          } />
          <Route path="/set-password" element={
            <ProtectedRoute>
              <SetPassword />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

> `isAppDomain()` runs once at module load — hostname never changes mid-session.
> Dead routes `/iscrizione` and `/partner` removed.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: swap root route by hostname; remove dead placeholder routes"
```

---

## Task 3: Make UserMenu auth-unaware on marketing domain

**Files:**
- Modify: `src/components/nav/UserMenu.tsx`

**Why:** On `patentedigitale.it`, no user is ever authenticated (they auth on `app.` only). Calling `useAuth` and `useProfile` on the marketing site is wasted Supabase calls. Replace with a static link when not on the app domain.

- [ ] **Step 1: Update `src/components/nav/UserMenu.tsx`**

```tsx
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { LayoutDashboard, BookOpen, LogOut, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { APP_URL, isAppDomain } from "@/lib/env";

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

function AccediLink({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <a href={APP_URL} target="_blank" rel="noopener noreferrer" onClick={onClose}>
      <Button variant="ghost" size="sm" className="gap-1.5">
        <User className="h-4 w-4" />
        {t("landing.nav.signIn")}
      </Button>
    </a>
  );
}

function AuthenticatedMenu({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dashboardHref =
    role === "autoscuola" ? "/driving-school/dashboard" : "/student/dashboard";

  const handleLogout = async () => {
    setOpen(false);
    onClose?.();
    await signOut();
    navigate("/");
  };

  if (!user) return <AccediLink onClose={onClose} />;

  const seed = user.email ?? user.id;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden opacity-90 hover:opacity-100 transition-opacity focus:outline-none"
        aria-label="User menu"
      >
        <img src={dicebearUrl(seed)} alt="avatar" className="h-6 w-6" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-line bg-bg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            <Link
              to={dashboardHref}
              onClick={() => { setOpen(false); onClose?.(); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
            >
              <LayoutDashboard size={15} className="text-ink-muted" />
              {t("landing.nav.dashboard")}
            </Link>
            <Link
              to="/quiz"
              onClick={() => { setOpen(false); onClose?.(); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
            >
              <BookOpen size={15} className="text-ink-muted" />
              {t("landing.nav.quizOnline")}
            </Link>
          </div>
          <div className="border-t border-line py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={15} className="text-ink-muted" />
              {t("landing.nav.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ onClose }: { onClose?: () => void }) {
  if (!isAppDomain()) return <AccediLink onClose={onClose} />;
  return <AuthenticatedMenu onClose={onClose} />;
}
```

> On `patentedigitale.it`: renders `AccediLink` immediately — no Supabase calls, no loading state.
> On `app.patentedigitale.it`: renders `AuthenticatedMenu` with full auth logic (existing behaviour).

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/UserMenu.tsx
git commit -m "feat: UserMenu static Accedi link on marketing domain, auth menu on app domain"
```

---

## Task 4: Configure Vercel — add `app.` domain

**Manual step — no code changes.**

- [ ] **Step 1: Open Vercel project**

Go to: https://vercel.com/w3sley0bis-projects/patente-digitale-web → **Settings → Domains**

- [ ] **Step 2: Add domain**

Click **Add** → type `app.patentedigitale.it` → confirm.

- [ ] **Step 3: Note the CNAME target**

Vercel shows a CNAME value (e.g. `cname.vercel-dns.com`). Copy it — needed in Task 5.

---

## Task 5: Configure DNS in Aruba

**Manual step — no code changes.**

- [ ] **Step 1: Open Aruba DNS panel**

Log in → select `patentedigitale.it` → DNS records.

- [ ] **Step 2: Add CNAME record**

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `app` | *(CNAME target from Task 4)* |

- [ ] **Step 3: Verify propagation**

```bash
dig app.patentedigitale.it CNAME
```

Expected: resolves to the Vercel CNAME target.

- [ ] **Step 4: Confirm SSL in Vercel**

Vercel dashboard → domain → green "Valid Configuration".

---

## Task 6: Set production env var in Vercel

**Manual step — no code changes.**

- [ ] **Step 1: Add var**

Vercel → project → **Settings → Environment Variables** → Production:

| Key | Value |
|-----|-------|
| `VITE_APP_URL` | `https://app.patentedigitale.it` |

- [ ] **Step 2: Redeploy**

Push a commit or manually trigger redeploy so the env var is baked into the build.

---

## Task 7: Update Supabase redirect URLs

**Manual step — no code changes.**

- [ ] **Step 1: Open Supabase → Authentication → URL Configuration**

- [ ] **Step 2: Set Site URL**

```
https://app.patentedigitale.it
```

- [ ] **Step 3: Add allowed redirect URLs**

```
https://app.patentedigitale.it/**
```

Magic links and OAuth callbacks land on `app.` only — no need to whitelist the marketing domain.

---

## Task 8: End-to-end verification

- [ ] **Step 1: Marketing root**

Visit `https://patentedigitale.it` → Landing page. Nav shows static "Accedi" button (no spinner, no Supabase call). ✓

- [ ] **Step 2: Accedi button**

Click "Accedi" → opens `https://app.patentedigitale.it` in new tab. ✓

- [ ] **Step 3: App root — unauthenticated**

`https://app.patentedigitale.it` → Login form. ✓

- [ ] **Step 4: Login → dashboard**

Log in → redirects to correct dashboard (`/student/dashboard` or `/driving-school/dashboard`). ✓

- [ ] **Step 5: App root — authenticated**

Visit `https://app.patentedigitale.it` while logged in → `Login.tsx` `useEffect` detects session, navigates to dashboard. ✓

- [ ] **Step 6: Direct protected route — unauthenticated**

Visit `https://app.patentedigitale.it/student/dashboard` without session → `ProtectedRoute` redirects to `/login` (same domain). ✓
