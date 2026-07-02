# App/Marketing URL Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the whole logged-in app under `/app`, drop the `/dashboard` URL segment, rename Italian/placeholder route segments to plain English, and add a site↔app switcher to the shared `UserMenu`.

**Architecture:** Flat route-string rename in `App.tsx` (no new nested `<Route>`/`<Outlet>` wrapper — every app route literal gets an `/app` prefix, same pattern already used for the existing two-level paths). Every internal `Link`/`navigate()`/`Navigate` call site that references an old path is updated to the new literal. `UserMenu` gains a `useLocation()`-based check to decide whether to show "Go to app" or "Go to website".

**Tech Stack:** React 19, react-router v7 (`<BrowserRouter>` + `<Routes>`/`<Route>`, `useLocation`), react-i18next, Vitest + Testing Library.

**Full old → new path table** (for reference while implementing):

| Old | New |
|---|---|
| `/studenti` | `/students` |
| `/autoscuole` | `/driving-schools` |
| `/login` | `/app/login` |
| `/reset-password` | `/app/reset-password` |
| `/set-password` | `/app/set-password` |
| `/signup` | `/app/signup` |
| `/signup/driving-school` | `/app/signup/driving-school` |
| `/quiz` | `/app/quiz` |
| `/student/dashboard` | `/app/student` |
| `/student/dashboard/guide` | `/app/student/drive-bookings` |
| `/student/dashboard/profile` | `/app/student/profile` |
| `/student/dashboard/settings` | `/app/student/settings` |
| `/driving-school/dashboard` | `/app/driving-school` |
| `/driving-school/dashboard/guide` | `/app/driving-school/drive-bookings` |
| `/driving-school/dashboard/students` | `/app/driving-school/students` |
| `/driving-school/dashboard/edit` | `/app/driving-school/profile` |
| `/driving-school/dashboard/settings` | `/app/driving-school/settings` |

Unchanged: `/`, `/search`, `/cerca` (redirect), `/iscrizione` (redirect), `/partner`.

Explicitly out of scope, do not touch: `src/routes/Signup.tsx` (dead, not routed), `src/routes/Iscrizione.tsx` (dead, not routed), `src/lib/buildIscrizioneUrl.ts` (dead, unused), `hooks/useCerca.ts`'s fetch of `/data/autoscuole.geojson` (a static data file path, unrelated to routing).

---

### Task 1: Restructure `App.tsx` route tree

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the `<Routes>` block**

Replace the entire `<Routes>...</Routes>` block (lines 49-162) with:

```tsx
						<Routes>
							<Route path="/" element={<Landing />} />
							<Route path="/students" element={<Studenti />} />
							<Route path="/driving-schools" element={<Autoscuole />} />
							<Route
								path="/cerca"
								element={<Navigate to="/search" replace />}
							/>
							<Route path="/search" element={<Cerca />} />
							<Route
								path="/iscrizione"
								element={<Navigate to="/search" replace />}
							/>
							<Route path="/partner" element={<Partner />} />
							<Route path="/app/login" element={<Login />} />
							<Route path="/app/reset-password" element={<ResetPassword />} />
							<Route
								path="/app/quiz"
								element={
									<ProtectedRoute requiredRole="student">
										<QuizOnline />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/signup"
								element={<Navigate to="/app/login?tab=signup" replace />}
							/>
							<Route
								path="/app/signup/driving-school"
								element={<SignupDrivingSchool />}
							/>
							<Route
								path="/app/student"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentDashboard />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/drive-bookings"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentGuide />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/profile"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentProfile />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/settings"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentSettings />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school"
								element={
									<ProtectedRoute requiredRole="autoscuola">
										<DrivingSchoolDashboard />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/drive-bookings"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolGuide />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/students"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolStudents />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/profile"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolEdit />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/settings"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolSettings />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/set-password"
								element={
									<ProtectedRoute>
										<SetPassword />
									</ProtectedRoute>
								}
							/>
							<Route path="*" element={<NotFound />} />
						</Routes>
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: restructure routes under /app, drop /dashboard segment"
```

---

### Task 2: Update `ProtectedRoute` redirect targets and its test

**Files:**
- Modify: `src/components/auth/ProtectedRoute.tsx`
- Modify: `src/components/auth/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 1: Update the test's expected paths first**

In `src/components/auth/__tests__/ProtectedRoute.test.tsx`, change the `Wrap` helper's route declarations:

```tsx
function Wrap({ element }: { element: React.ReactNode }) {
	return (
		<MemoryRouter initialEntries={["/protected"]}>
			<Routes>
				<Route path="/protected" element={element} />
				<Route path="/app/login" element={<div>Login page</div>} />
				<Route
					path="/app/driving-school"
					element={<div>DS dashboard</div>}
				/>
			</Routes>
		</MemoryRouter>
	);
}
```

The rest of the test file (assertions on `screen.getByText("Login page")` / `"DS dashboard"`) needs no change — it asserts on rendered text, not on the path.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ProtectedRoute.test.tsx`
Expected: FAIL — the still-old `ProtectedRoute.tsx` navigates to `/login` and `/driving-school/dashboard`, which no longer match any `<Route>` in `Wrap`, so `NotFound`-equivalent (nothing) renders instead of "Login page" / "DS dashboard".

- [ ] **Step 3: Update `ProtectedRoute.tsx`**

```tsx
	if (!user) {
		return (
			<Navigate
				to={`/app/login?next=${encodeURIComponent(location.pathname)}`}
				replace
			/>
		);
	}

	if (requiredRole && role !== requiredRole) {
		// Send the user to their actual dashboard rather than bouncing them to /app/login
		// with no context. Null role => profile not yet provisioned; send to /app/login.
		if (role === "autoscuola")
			return <Navigate to="/app/driving-school" replace />;
		if (role === "student") return <Navigate to="/app/student" replace />;
		return <Navigate to="/app/login" replace />;
	}

	if (requireApproved && !approved) {
		return <Navigate to="/app/driving-school" replace />;
	}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProtectedRoute.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx src/components/auth/__tests__/ProtectedRoute.test.tsx
git commit -m "fix: point ProtectedRoute redirects at new /app paths"
```

---

### Task 3: Add "Go to app" / "Go to website" i18n keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/it.json`
- Modify: `src/i18n/locales/ar.json`

The `landing.nav.dashboard` key becomes unused after Task 4 (its only two call sites are being replaced) — replace it in place with two new keys rather than leaving dead strings.

- [ ] **Step 1: `en.json`** — replace the `"dashboard": "Dashboard",` line inside `landing.nav` (currently line 287) with:

```json
			"goToApp": "Go to app",
			"goToWebsite": "Go to website",
```

- [ ] **Step 2: `it.json`** — replace the `"dashboard": "Dashboard",` line inside `landing.nav` (currently line 290) with:

```json
			"goToApp": "Vai all'app",
			"goToWebsite": "Vai al sito",
```

- [ ] **Step 3: `ar.json`** — replace the `"dashboard": "لوحة التحكم",` line inside `landing.nav` (currently line 283) with:

```json
			"goToApp": "الذهاب إلى التطبيق",
			"goToWebsite": "الذهاب إلى الموقع",
```

Note: each locale file has multiple `"dashboard":` keys in unrelated sections (`student.dashboard`, `school.dashboard`, etc. — visible via `grep -n '"dashboard":'`). Only touch the one nested under `landing.nav` in each file; use enough surrounding context (the preceding `"findSchool"` line and following `"quizOnline"` line) to target the right occurrence.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/it.json src/i18n/locales/ar.json
git commit -m "i18n: add goToApp/goToWebsite nav keys, drop unused dashboard key"
```

---

### Task 4: Site↔app switcher in `UserMenu`

**Files:**
- Modify: `src/components/nav/UserMenu.tsx`
- Create: `src/components/nav/__tests__/UserMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { UserMenu } from "@/components/nav/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function mockLoggedInStudent() {
	vi.mocked(useAuth).mockReturnValue({
		user: { id: "u1", email: "s@example.com" } as never,
		session: {} as never,
		loading: false,
		signOut: async () => {},
	});
	vi.mocked(useProfile).mockReturnValue({
		profile: null,
		role: "student",
		approved: true,
		loading: false,
		error: null,
		refresh: async () => {},
	});
}

describe("UserMenu site/app switcher", () => {
	it("shows 'Go to app' linking to the student home when on a marketing page", () => {
		mockLoggedInStudent();
		render(
			<MemoryRouter initialEntries={["/students"]}>
				<UserMenu onClose={() => {}} />
			</MemoryRouter>,
		);
		const link = screen.getByText("Go to app").closest("a");
		expect(link).toHaveAttribute("href", "/app/student");
	});

	it("shows 'Go to website' linking to '/' when inside the app", () => {
		mockLoggedInStudent();
		render(
			<MemoryRouter initialEntries={["/app/student/profile"]}>
				<UserMenu onClose={() => {}} />
			</MemoryRouter>,
		);
		const link = screen.getByText("Go to website").closest("a");
		expect(link).toHaveAttribute("href", "/");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UserMenu.test.tsx`
Expected: FAIL — `getByText("Go to app")` throws (current copy is "Dashboard").

- [ ] **Step 3: Implement the switcher in `UserMenu.tsx`**

Add `useLocation` to the react-router import:

```tsx
import { Link, useLocation, useNavigate } from "react-router";
```

Replace the `dashboardHref` computation:

```tsx
	const location = useLocation();
	const dashboardHref =
		role === "autoscuola" ? "/app/driving-school" : "/app/student";
	const isInApp = location.pathname.startsWith("/app");
	const switchHref = isInApp ? "/" : dashboardHref;
	const switchLabel = isInApp
		? t("landing.nav.goToWebsite")
		: t("landing.nav.goToApp");
```

Replace both occurrences of the "Dashboard" `<Link>` (the mobile-drawer inline variant and the dropdown variant) — they currently look like:

```tsx
					<Link
						to={dashboardHref}
						onClick={onClose}
						className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors rounded-lg"
					>
						<LayoutDashboard size={15} className="text-ink-muted" />
						{t("landing.nav.dashboard")}
					</Link>
```

and

```tsx
						<Link
							to={dashboardHref}
							onClick={() => setOpen(false)}
							className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
						>
							<LayoutDashboard size={15} className="text-ink-muted" />
							{t("landing.nav.dashboard")}
						</Link>
```

Change `to={dashboardHref}` → `to={switchHref}` and `{t("landing.nav.dashboard")}` → `{switchLabel}` in both blocks (keep the `LayoutDashboard` icon and all other markup as-is).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- UserMenu.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/UserMenu.tsx src/components/nav/__tests__/UserMenu.test.tsx
git commit -m "feat: add site/app switcher to UserMenu"
```

---

### Task 5: Update marketing `Nav` and the two app-shell layouts

**Files:**
- Modify: `src/components/nav/Nav.tsx`
- Modify: `src/components/student/StudentLayout.tsx`
- Modify: `src/components/driving-school/DrivingSchoolLayout.tsx`

- [ ] **Step 1: `Nav.tsx`** — update `NAV_LINKS`:

```tsx
const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
	{ href: "/", label: "landing.nav.home", icon: Home },
	{ href: "/students", label: "landing.nav.howItWorks", icon: GraduationCap },
	{ href: "/driving-schools", label: "landing.nav.partners", icon: Car },
	{ href: "/search", label: "landing.nav.findSchool", icon: Search },
];
```

- [ ] **Step 2: `StudentLayout.tsx`** — update `NAV_ITEMS` and the logo link:

```tsx
const NAV_ITEMS = [
	{
		href: "/app/student",
		icon: LayoutDashboard,
		label: "student.nav.dashboard",
		end: true,
	},
	{
		href: "/app/student/drive-bookings",
		icon: Car,
		label: "student.nav.guide",
		end: false,
	},
	{
		href: "/app/student/profile",
		icon: UserRound,
		label: "student.nav.profile",
		end: false,
	},
	{
		href: "/app/student/settings",
		icon: Settings,
		label: "student.nav.settings",
		end: false,
	},
	{
		href: "/search",
		icon: Search,
		label: "student.nav.findSchool",
		end: false,
	},
];
```

And the header logo link:

```tsx
					<Link to="/app/student" className="flex items-center gap-2.5">
```

- [ ] **Step 3: `DrivingSchoolLayout.tsx`** — update `NAV_ITEMS` and the logo link:

```tsx
const NAV_ITEMS = [
	{
		href: "/app/driving-school",
		icon: LayoutDashboard,
		label: "school.dashboard.nav.overview",
		end: true,
	},
	{
		href: "/app/driving-school/drive-bookings",
		icon: CalendarDays,
		label: "school.dashboard.nav.guide",
		end: false,
	},
	{
		href: "/app/driving-school/students",
		icon: Users,
		label: "school.dashboard.nav.students",
		end: false,
	},
	{
		href: "/app/driving-school/profile",
		icon: Pencil,
		label: "school.dashboard.nav.editListing",
		end: false,
	},
	{
		href: "/app/driving-school/settings",
		icon: Settings,
		label: "school.dashboard.nav.settings",
		end: false,
	},
];
```

And the header logo link:

```tsx
					<Link
						to="/app/driving-school"
						className="flex items-center gap-2.5"
					>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/nav/Nav.tsx src/components/student/StudentLayout.tsx src/components/driving-school/DrivingSchoolLayout.tsx
git commit -m "refactor: update nav links to new /app and marketing paths"
```

---

### Task 6: Update remaining scattered link/redirect references

**Files:**
- Modify: `src/routes/StudentDashboard.tsx:123`
- Modify: `src/routes/DrivingSchoolDashboard.tsx:195,206`
- Modify: `src/routes/Login.tsx:59,61,199,224`
- Modify: `src/routes/ResetPassword.tsx:44`
- Modify: `src/routes/SetPassword.tsx:48,53,143,180`
- Modify: `src/routes/SignupDrivingSchool.tsx:173`
- Modify: `src/routes/Autoscuole.tsx:159,574`
- Modify: `src/components/layout/Footer.tsx:119`
- Modify: `src/components/auth/ForgotPasswordForm.tsx:22`
- Modify: `src/components/iscrizione/EnrollPaywall.tsx:56-57`
- Modify: `src/components/cerca/CercaPage.tsx:162`
- Modify: `src/components/cerca/SchoolDetailPanel.tsx:246`
- Modify: `src/components/sections/B2B.tsx:66,76`
- Modify: `src/components/driving-school/ClaimForm.tsx:286,304`
- Modify: `src/components/driving-school/DashboardPending.tsx:13,17,26,30`

Each edit is a literal string substitution of an old path for its new equivalent from the table at the top of this plan. Go file by file:

- [ ] **Step 1: `StudentDashboard.tsx`**

Change `to="/student/dashboard/guide"` → `to="/app/student/drive-bookings"`.

- [ ] **Step 2: `DrivingSchoolDashboard.tsx`**

Change `to="/driving-school/dashboard/edit"` → `to="/app/driving-school/profile"`.
Change `to="/driving-school/dashboard/guide"` → `to="/app/driving-school/drive-bookings"`.

- [ ] **Step 3: `Login.tsx`**

Change both:
```tsx
		if (role === "autoscuola")
			navigate("/driving-school/dashboard", { replace: true });
		else if (role === "student")
			navigate("/student/dashboard", { replace: true });
```
to:
```tsx
		if (role === "autoscuola")
			navigate("/app/driving-school", { replace: true });
		else if (role === "student")
			navigate("/app/student", { replace: true });
```

Change `onClick={() => navigate("/signup/driving-school")}` → `onClick={() => navigate("/app/signup/driving-school")}`.

Change `onSuccess={() => navigate("/student/dashboard")}` → `onSuccess={() => navigate("/app/student")}`.

- [ ] **Step 4: `ResetPassword.tsx`**

Change `onClick={() => navigate("/login")}` → `onClick={() => navigate("/app/login")}`.

- [ ] **Step 5: `SetPassword.tsx`**

Change:
```tsx
	const dashboardHref =
		role === "autoscuola" ? "/driving-school/dashboard" : "/student/dashboard";
```
to:
```tsx
	const dashboardHref =
		role === "autoscuola" ? "/app/driving-school" : "/app/student";
```

Change `navigate("/login", { replace: true });` → `navigate("/app/login", { replace: true });`.

Change both `to="/login"` occurrences (the amber-warning links) → `to="/app/login"`.

- [ ] **Step 6: `SignupDrivingSchool.tsx`**

Change `const handleDone = () => navigate("/driving-school/dashboard");` → `const handleDone = () => navigate("/app/driving-school");`.

- [ ] **Step 7: `Autoscuole.tsx`**

Change both `<Link to="/signup/driving-school">` → `<Link to="/app/signup/driving-school">`.

- [ ] **Step 8: `Footer.tsx`**

Change `to="/login"` → `to="/app/login"`.

- [ ] **Step 9: `ForgotPasswordForm.tsx`**

Change:
```tsx
			redirectTo: `${window.location.origin}/reset-password`,
```
to:
```tsx
			redirectTo: `${window.location.origin}/app/reset-password`,
```

- [ ] **Step 10: `EnrollPaywall.tsx`**

Change:
```tsx
	const signupHref = `/login?tab=signup&next=${nextParam}`;
	const loginHref = `/login?next=${nextParam}`;
```
to:
```tsx
	const signupHref = `/app/login?tab=signup&next=${nextParam}`;
	const loginHref = `/app/login?next=${nextParam}`;
```

- [ ] **Step 11: `CercaPage.tsx`**

Change `to="/signup/driving-school"` → `to="/app/signup/driving-school"`.

- [ ] **Step 12: `SchoolDetailPanel.tsx`**

Change `` to={`/signup/driving-school?placeId=${encodeURIComponent(school._placeId)}`} `` → `` to={`/app/signup/driving-school?placeId=${encodeURIComponent(school._placeId)}`} ``.

- [ ] **Step 13: `B2B.tsx`**

Change `<Link to="/signup/driving-school" className="w-full sm:w-auto">` → `<Link to="/app/signup/driving-school" className="w-full sm:w-auto">`.

Change `to="/autoscuole"` → `to="/driving-schools"`.

- [ ] **Step 14: `ClaimForm.tsx`**

Change `<a href="/login" className="underline">` → `<a href="/app/login" className="underline">`.

Change `to="/driving-school/dashboard"` → `to="/app/driving-school"`.

- [ ] **Step 15: `DashboardPending.tsx`**

Change all four occurrences of `/signup/driving-school` (in `resumeClaimHref`'s three return statements, one of which has a `?step=manual-claim` query string) to `/app/signup/driving-school`, preserving each query string, e.g.:

```tsx
function resumeClaimHref(): string {
	if (typeof window === "undefined") return "/app/signup/driving-school";
	if (localStorage.getItem("claim_manual_school")) {
		return "/app/signup/driving-school?step=manual-claim";
	}
	const domainClaim = localStorage.getItem("domain_claim");
	if (domainClaim) {
		// Promote Flow-1 leftovers into Flow-2 so the user lands on the manual form
		// with the school already selected, instead of starting over.
		try {
			const school = JSON.parse(domainClaim);
			localStorage.setItem("claim_manual_school", JSON.stringify(school));
		} catch {
			// ignore — fall through to plain search
		}
		localStorage.removeItem("domain_claim");
		return "/app/signup/driving-school?step=manual-claim";
	}
	return "/app/signup/driving-school";
}
```

- [ ] **Step 16: Commit**

```bash
git add src/routes/StudentDashboard.tsx src/routes/DrivingSchoolDashboard.tsx src/routes/Login.tsx src/routes/ResetPassword.tsx src/routes/SetPassword.tsx src/routes/SignupDrivingSchool.tsx src/routes/Autoscuole.tsx src/components/layout/Footer.tsx src/components/auth/ForgotPasswordForm.tsx src/components/iscrizione/EnrollPaywall.tsx src/components/cerca/CercaPage.tsx src/components/cerca/SchoolDetailPanel.tsx src/components/sections/B2B.tsx src/components/driving-school/ClaimForm.tsx src/components/driving-school/DashboardPending.tsx
git commit -m "refactor: point remaining internal links at new /app and marketing paths"
```

---

### Task 7: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Grep for any remaining old-path literals**

Run:
```bash
grep -rnE "[\"'\`](/studenti|/autoscuole|/student/dashboard|/driving-school/dashboard|/login[\"'?]|/signup[\"'/?]|/reset-password[\"'\`]|/set-password[\"'\`]|/quiz[\"'\`])" src --include="*.ts" --include="*.tsx"
```
Expected: no matches other than inside `src/routes/Signup.tsx`, `src/routes/Iscrizione.tsx`, and `src/lib/buildIscrizioneUrl.ts` (all confirmed dead/unrouted, intentionally untouched — see the plan header).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` (or `tsc --noEmit` if no dedicated script exists — check `package.json` first)
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `npm test`
Expected: all tests pass, including the updated `ProtectedRoute.test.tsx` and the new `UserMenu.test.tsx`.

- [ ] **Step 4: Manual smoke test via dev server**

Run: `npm run dev`, then in a browser:
- Visit `/students` and `/driving-schools` — confirm the renamed marketing pages load.
- Log in as a student → confirm landing on `/app/student`, sidebar links go to `/app/student/drive-bookings`, `/app/student/profile`, `/app/student/settings`.
- Open the profile-icon menu on a marketing page while logged in → confirm it shows "Go to app" and navigates to `/app/student` (or `/app/driving-school` for a school account).
- Open the profile-icon menu while inside `/app/...` → confirm it shows "Go to website" and navigates to `/`.
- Log in as a driving school → confirm landing on `/app/driving-school`, sidebar links go to `/app/driving-school/drive-bookings`, `/app/driving-school/students`, `/app/driving-school/profile`, `/app/driving-school/settings`.
- Visit a stale old URL (e.g. `/student/dashboard`) → confirm it 404s (clean cut, no redirect, per spec).

- [ ] **Step 5: Report results**

Summarize pass/fail for each of the above checks. If anything fails, fix it in a follow-up commit before considering the plan done — do not mark this task complete with known-broken smoke checks.
