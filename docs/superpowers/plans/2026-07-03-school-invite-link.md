# School Invite Link / QR Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a driving school share a static link/QR code that drops any student (signed in, signed out, or brand new) onto that school's enroll flow with the dialog already open, while correctly blocking the case where the student already has an active enrollment elsewhere.

**Architecture:** Reuse the existing marketing deep-link infrastructure (`/cerca?placeId=<place_id>` + `useCerca`'s one-shot auto-select, both already in `main`). `EnrollButton` reads its own `useSearchParams()` to detect a deep-link visit and auto-opens `EnrollDialog`; it also gains a `blocked` status for "active at a different school." Three pre-existing bugs in the anonymous-signup redirect chain (`ProtectedRoute`, `Login`) are fixed so a brand-new student signing up via the link lands back on the invited school. A new `InviteLinkCard` component, rendered inside the school's own `SchoolEditor`, generates the link + a downloadable QR code client-side.

**Tech Stack:** React 19, TypeScript, react-router, Vitest + Testing Library, `qrcode` (new dependency, client-side QR PNG generation).

---

## File Structure

- Modify `src/components/booking/EnrollButton.tsx` — add `blocked` status, auto-open-on-deep-link behavior.
- Create `src/components/booking/__tests__/EnrollButton.test.tsx` — no test file exists for this component today.
- Modify `src/components/auth/ProtectedRoute.tsx` — preserve query string in the post-login `next` redirect.
- Modify `src/components/auth/__tests__/ProtectedRoute.test.tsx` — add a case for query-string preservation.
- Modify `src/routes/Login.tsx` — preserve `next` across the login/signup tab switch; honor `next` on signup success.
- Create `src/routes/__tests__/Login.test.tsx` — no test file exists for this route today.
- Modify `package.json` (via `pnpm add`) — add `qrcode` + `@types/qrcode`.
- Create `src/components/driving-school/InviteLinkCard.tsx` — link + QR display, isolated from `SchoolEditor`'s large form.
- Create `src/components/driving-school/__tests__/InviteLinkCard.test.tsx`.
- Modify `src/components/driving-school/SchoolEditor.tsx` — mount `InviteLinkCard` in a new section.
- Modify `src/i18n/locales/{it,en,ar}.json` — new keys for the blocked state and the invite card.

---

### Task 1: `EnrollButton` — new `blocked` status for "active at a different school"

**Files:**
- Modify: `src/components/booking/EnrollButton.tsx`
- Test: `src/components/booking/__tests__/EnrollButton.test.tsx`
- Modify: `src/i18n/locales/it.json`, `src/i18n/locales/en.json`, `src/i18n/locales/ar.json`

Today, `getMyEnrollment()` returns the student's one pending/active enrollment row (any school). `EnrollButton` only checks `e.school_id === s.id`; if the student is ACTIVE at a *different* school, the check misses it, status stays `"none"`, the CTA renders, and submitting throws an unhandled error against the DB's `one_active_school_per_student` constraint. Pending-elsewhere is fine as-is (DB allows multiple pending rows) and needs no change.

- [ ] **Step 1: Write the failing tests**

Create `src/components/booking/__tests__/EnrollButton.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/booking/api", () => ({
	getAcceptedSchoolByPlaceId: vi.fn(),
	getMyEnrollment: vi.fn(),
	getMyContact: vi.fn(),
	requestEnrollment: vi.fn(),
}));

vi.mock("@/components/booking/EnrollDialog", () => ({
	EnrollDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="enroll-dialog-open" /> : null,
}));

import { EnrollButton } from "@/components/booking/EnrollButton";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
} from "@/lib/booking/api";

function renderAt(path: string, placeId = "place-1") {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<EnrollButton placeId={placeId} />
		</MemoryRouter>,
	);
}

describe("EnrollButton", () => {
	it("renders the CTA when there is no existing enrollment", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student");

		expect(await screen.findByText("booking.enroll.cta")).toBeInTheDocument();
	});

	it("shows the active label when enrolled at this school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "school-1",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student");

		expect(await screen.findByText("booking.enroll.active")).toBeInTheDocument();
	});

	it("shows a blocked message when active at a different school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student");

		expect(
			await screen.findByText("booking.enroll.blockedElsewhere"),
		).toBeInTheDocument();
		expect(screen.queryByText("booking.enroll.cta")).not.toBeInTheDocument();
	});

	it("still shows the CTA when pending at a different school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "pending",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: null,
		});

		renderAt("/app/student");

		expect(await screen.findByText("booking.enroll.cta")).toBeInTheDocument();
	});

	it("auto-opens the enroll dialog when arriving via a matching ?placeId= deep link", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=place-1", "place-1");

		expect(await screen.findByTestId("enroll-dialog-open")).toBeInTheDocument();
	});

	it("does not auto-open the dialog when the URL placeId doesn't match this button", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=some-other-place", "place-1");

		await screen.findByText("booking.enroll.cta");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
	});

	it("does not auto-open the dialog when blocked, even with a matching deep link", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student?placeId=place-1", "place-1");

		await screen.findByText("booking.enroll.blockedElsewhere");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
	});

	it("waits for the auto-open effect asynchronously without throwing", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue(null);
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		const { container } = renderAt("/app/student?placeId=place-1", "place-1");

		await waitFor(() => expect(container.textContent).toBe(""));
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/booking/__tests__/EnrollButton.test.tsx`
Expected: FAIL — `booking.enroll.blockedElsewhere` never rendered (status never becomes `"blocked"`), and `enroll-dialog-open` never appears (no auto-open behavior exists yet).

- [ ] **Step 3: Implement `blocked` status and auto-open behavior**

Replace the full contents of `src/components/booking/EnrollButton.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { EnrollDialog } from "@/components/booking/EnrollDialog";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
	requestEnrollment,
} from "@/lib/booking/api";

type Status = "none" | "pending" | "active" | "blocked";

/**
 * Enroll entry point shown on a school's detail panel. The search data is keyed
 * by place_id, so we resolve it to the accepted driving_schools row before enrolling.
 * Renders nothing unless the place_id maps to an accepted school with booking enabled.
 *
 * When this school's place_id matches the page's ?placeId= query param (an
 * invite link / QR deep link), the request dialog opens automatically once,
 * instead of waiting for a manual tap.
 */
export function EnrollButton({ placeId }: { placeId: string }) {
	const { t } = useTranslation();
	const [searchParams] = useSearchParams();
	const [school, setSchool] = useState<{
		id: string;
		email: string | null;
	} | null>(null);
	const [status, setStatus] = useState<Status>("none");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const autoOpenedRef = useRef(false);

	useEffect(() => {
		let cancelled = false;
		setReady(false);
		setSchool(null);
		setStatus("none");
		(async () => {
			try {
				const s = await getAcceptedSchoolByPlaceId(placeId);
				if (cancelled) return;
				if (!s) {
					setReady(true);
					return;
				}
				setSchool({ id: s.id, email: s.email });
				const e = await getMyEnrollment();
				if (cancelled) return;
				if (e && e.school_id === s.id) {
					setStatus(e.status === "active" ? "active" : "pending");
				} else if (e && e.status === "active") {
					// Active at a *different* school — the DB only allows one
					// active enrollment per student, so block instead of letting
					// the request fail with an unhandled constraint error.
					setStatus("blocked");
				}
			} catch {
				/* leave hidden on resolve failure */
			} finally {
				if (!cancelled) setReady(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [placeId]);

	useEffect(() => {
		if (autoOpenedRef.current) return;
		if (!ready || status !== "none") return;
		if (searchParams.get("placeId") !== placeId) return;
		autoOpenedRef.current = true;
		setDialogOpen(true);
	}, [ready, status, placeId, searchParams]);

	if (!ready || !school) return null;

	// Throws on failure so EnrollDialog can surface the error inline.
	const handleConfirm = async (licence: string, phone: string) => {
		await requestEnrollment(
			school.id,
			licence,
			phone,
			school.email ?? undefined,
		);
		setStatus("pending");
	};

	if (status === "active")
		return (
			<span className="text-sm font-bold text-brand-ink">
				{t("booking.enroll.active")}
			</span>
		);
	if (status === "pending")
		return (
			<span className="text-sm text-ink-muted">
				{t("booking.enroll.pending")}
			</span>
		);
	if (status === "blocked")
		return (
			<span className="text-sm text-ink-muted">
				{t("booking.enroll.blockedElsewhere")}
			</span>
		);
	return (
		<div>
			<button
				type="button"
				onClick={() => setDialogOpen(true)}
				className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-95"
			>
				{t("booking.enroll.cta")}
			</button>
			<EnrollDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={handleConfirm}
			/>
		</div>
	);
}
```

- [ ] **Step 4: Add the new translation key**

In `src/i18n/locales/it.json`, inside `booking.enroll` (after the `"active"` line):

```json
			"active": "Sei iscritto",
			"blockedElsewhere": "Sei già iscritto a un'altra autoscuola",
```

In `src/i18n/locales/en.json`, inside `booking.enroll`:

```json
			"active": "You're enrolled",
			"blockedElsewhere": "You're already enrolled at another school",
```

In `src/i18n/locales/ar.json`, inside `booking.enroll`:

```json
			"active": "أنت مسجّل",
			"blockedElsewhere": "أنت مسجّل بالفعل في مدرسة أخرى",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/booking/__tests__/EnrollButton.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 6: Run the full existing test suite to check for regressions**

Run: `pnpm test`
Expected: PASS — in particular `src/components/cerca/__tests__/SchoolDetailPanel.test.tsx` and `src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx` / `AppSchoolFinderPanel.test.tsx` still pass unchanged, since they mock `EnrollButton` entirely and never render the real `useSearchParams()` call.

- [ ] **Step 7: Commit**

```bash
git add src/components/booking/EnrollButton.tsx src/components/booking/__tests__/EnrollButton.test.tsx src/i18n/locales/it.json src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat: block enrollment when active elsewhere, auto-open dialog on invite deep link"
```

---

### Task 2: `ProtectedRoute` — preserve query string in the post-login redirect

**Files:**
- Modify: `src/components/auth/ProtectedRoute.tsx:22-29`
- Modify: `src/components/auth/__tests__/ProtectedRoute.test.tsx`

Today `Navigate to={`/app/login?next=${encodeURIComponent(location.pathname)}`}` drops the query string. A student hitting `/app/student?placeId=X` while signed out loses the `placeId` the moment they're bounced to login.

- [ ] **Step 1: Write the failing test**

Add to `src/components/auth/__tests__/ProtectedRoute.test.tsx`, inside the existing `describe("ProtectedRoute", ...)` block (uses the existing `Wrap` helper, which already renders at `/protected` — extend it to accept a search string):

First, modify the `Wrap` helper at the top of the file to route from a param instead of a hardcoded path:

```tsx
function Wrap({
	element,
	initialPath = "/protected",
}: {
	element: React.ReactNode;
	initialPath?: string;
}) {
	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/protected" element={element} />
				<Route path="/app/login" element={<LoginProbe />} />
				<Route
					path="/app/driving-school"
					element={<div>DS dashboard</div>}
				/>
			</Routes>
		</MemoryRouter>
	);
}

function LoginProbe() {
	const [params] = useSearchParams();
	return <div>Login page next={params.get("next")}</div>;
}
```

Add `useSearchParams` to the existing `import { MemoryRouter, Route, Routes } from "react-router";` line so it reads `import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";`.

This changes what the existing "redirects to /login when not authenticated" assertion sees — update it to match the new probe text:

```tsx
	it("redirects to /login when not authenticated", () => {
		render(
			<Wrap
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(screen.getByText("Login page next=/protected")).toBeInTheDocument();
		expect(screen.queryByText("Secret")).not.toBeInTheDocument();
	});
```

Then add a new test after it:

```tsx
	it("preserves the query string in the next redirect", () => {
		render(
			<Wrap
				initialPath="/protected?placeId=abc123"
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(
			screen.getByText("Login page next=/protected?placeId=abc123"),
		).toBeInTheDocument();
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/auth/__tests__/ProtectedRoute.test.tsx`
Expected: FAIL — the new test fails because `next` doesn't include `?placeId=abc123`; the modified existing test may also fail to compile/run until Step 1's `Wrap`/`LoginProbe` changes are in place (that's expected, they're part of this same step).

- [ ] **Step 3: Fix `ProtectedRoute`**

In `src/components/auth/ProtectedRoute.tsx`, change:

```tsx
	if (!user) {
		return (
			<Navigate
				to={`/app/login?next=${encodeURIComponent(location.pathname)}`}
				replace
			/>
		);
	}
```

to:

```tsx
	if (!user) {
		return (
			<Navigate
				to={`/app/login?next=${encodeURIComponent(location.pathname + location.search)}`}
				replace
			/>
		);
	}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/auth/__tests__/ProtectedRoute.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx src/components/auth/__tests__/ProtectedRoute.test.tsx
git commit -m "fix: preserve query string when redirecting unauthenticated users to login"
```

---

### Task 3: `Login` — preserve `next` across tab switch, honor it on signup success

**Files:**
- Modify: `src/routes/Login.tsx`
- Create: `src/routes/__tests__/Login.test.tsx`

Two bugs block the anonymous-signup path even after Task 2's fix:
1. `goLogin`/`goSignup` call `setSearchParams({...}, { replace: true })`, which replaces the *entire* query string — wiping `next` when the student switches from login to signup view (or back).
2. The `signup-student` view's `onSuccess` hardcodes `navigate("/app/student")`, ignoring `next` entirely.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/__tests__/Login.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/nav/Nav", () => ({
	Nav: () => <div data-testid="nav" />,
}));

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => ({ role: null, loading: false }),
}));

const mockOnSuccess: { current: (() => void) | null } = { current: null };

vi.mock("@/components/auth/AuthForm", () => ({
	AuthForm: ({
		mode,
		onSuccess,
	}: {
		mode: string;
		onSuccess?: () => void;
	}) => {
		if (mode === "signup") mockOnSuccess.current = onSuccess ?? null;
		return <div data-testid={`auth-form-${mode}`} />;
	},
}));

vi.mock("@/components/auth/ForgotPasswordForm", () => ({
	ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));

import Login from "@/routes/Login";

function renderLogin(initialPath: string) {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/app/login" element={<Login />} />
				<Route path="/app/student" element={<div>Student dashboard</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("Login next-param preservation", () => {
	it("keeps the next param in the URL when switching from login to signup", async () => {
		const user = userEvent.setup();
		renderLogin("/app/login?next=%2Fapp%2Fstudent%3FplaceId%3Dplace-1");

		await user.click(screen.getByText("auth.signupLink"));

		expect(screen.getByTestId("auth-form-signup")).toBeInTheDocument();
		expect(window.location.search).toContain("tab=signup");
	});

	it("navigates to next on signup success instead of the hardcoded dashboard", async () => {
		const user = userEvent.setup();
		renderLogin("/app/login?next=%2Fapp%2Fstudent%3FplaceId%3Dplace-1");

		await user.click(screen.getByText("auth.signupLink"));
		await user.click(screen.getByText("auth.student.title"));

		expect(mockOnSuccess.current).not.toBeNull();
		mockOnSuccess.current?.();

		expect(
			await screen.findByText("Student dashboard"),
		).toBeInTheDocument();
	});
});
```

Note: `window.location.search` reflects `MemoryRouter`'s in-memory history only in the jsdom global for this test environment — this repo's existing `react-router` version keeps `window.location` in sync with `MemoryRouter` for `search`/`pathname` reads in tests (already relied upon implicitly elsewhere via `useSearchParams`). If this assertion turns out flaky in practice, replace it with a `LocationProbe` component (same pattern as Task 2's `LoginProbe`) rendered as a third route-independent check — but attempt the direct assertion first since it requires no extra scaffolding.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/routes/__tests__/Login.test.tsx`
Expected: FAIL — `next=...` is dropped from the URL after clicking the signup link, and `onSuccess` navigates to `/app/student` unconditionally rather than to `next`.

- [ ] **Step 3: Fix `Login.tsx`**

In `src/routes/Login.tsx`, replace:

```tsx
	const goLogin = () => {
		setView("login");
		setSearchParams({}, { replace: true });
	};

	const goSignup = () => {
		setView("signup-pick");
		setSearchParams({ tab: "signup" }, { replace: true });
	};
```

with:

```tsx
	const goLogin = () => {
		setView("login");
		setSearchParams(
			(p) => {
				const n = new URLSearchParams(p);
				n.delete("tab");
				return n;
			},
			{ replace: true },
		);
	};

	const goSignup = () => {
		setView("signup-pick");
		setSearchParams(
			(p) => {
				const n = new URLSearchParams(p);
				n.set("tab", "signup");
				return n;
			},
			{ replace: true },
		);
	};
```

Then replace the `signup-student` view's `onSuccess`:

```tsx
							<AuthForm
								mode="signup"
								role="student"
								onSuccess={() => navigate("/app/student")}
							/>
```

with:

```tsx
							<AuthForm
								mode="signup"
								role="student"
								onSuccess={() =>
									navigate(searchParams.get("next") || "/app/student")
								}
							/>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/routes/__tests__/Login.test.tsx`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/Login.tsx src/routes/__tests__/Login.test.tsx
git commit -m "fix: preserve next param through the login/signup tab switch and honor it on signup success"
```

---

### Task 4: Add the `qrcode` dependency

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install**

Run:

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: Verify it resolves**

Run: `pnpm exec node -e "require('qrcode')"`
Expected: no output, exit code 0 (module resolves cleanly).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add qrcode dependency for the school invite QR code"
```

---

### Task 5: `InviteLinkCard` component

**Files:**
- Create: `src/components/driving-school/InviteLinkCard.tsx`
- Test: `src/components/driving-school/__tests__/InviteLinkCard.test.tsx`
- Modify: `src/i18n/locales/it.json`, `src/i18n/locales/en.json`, `src/i18n/locales/ar.json`

- [ ] **Step 1: Write the failing tests**

Create `src/components/driving-school/__tests__/InviteLinkCard.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("qrcode", () => ({
	default: {
		toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
	},
}));

import { InviteLinkCard } from "@/components/driving-school/InviteLinkCard";

describe("InviteLinkCard", () => {
	it("shows the invite link built from the school's place_id", () => {
		render(<InviteLinkCard placeId="place-42" />);
		const input = screen.getByDisplayValue(
			`${window.location.origin}/cerca?placeId=place-42`,
		);
		expect(input).toBeInTheDocument();
	});

	it("renders the generated QR code image once ready", async () => {
		render(<InviteLinkCard placeId="place-42" />);
		const img = await screen.findByAltText("school.editor.invite.qrAlt");
		expect(img).toHaveAttribute("src", "data:image/png;base64,fake");
	});

	it("copies the link to the clipboard and shows confirmation", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const user = userEvent.setup();

		render(<InviteLinkCard placeId="place-42" />);
		await user.click(screen.getByText("school.editor.invite.copy"));

		expect(writeText).toHaveBeenCalledWith(
			`${window.location.origin}/cerca?placeId=place-42`,
		);
		await waitFor(() =>
			expect(
				screen.getByText("school.editor.invite.copied"),
			).toBeInTheDocument(),
		);
	});

	it("offers a download link for the QR image once ready", async () => {
		render(<InviteLinkCard placeId="place-42" />);
		const link = await screen.findByText("school.editor.invite.downloadQr");
		expect(link.closest("a")).toHaveAttribute(
			"href",
			"data:image/png;base64,fake",
		);
		expect(link.closest("a")).toHaveAttribute(
			"download",
			"invito-autoscuola-place-42.png",
		);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/driving-school/__tests__/InviteLinkCard.test.tsx`
Expected: FAIL — `InviteLinkCard` doesn't exist yet.

- [ ] **Step 3: Implement `InviteLinkCard`**

Create `src/components/driving-school/InviteLinkCard.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";

interface InviteLinkCardProps {
	placeId: string;
}

/**
 * A static, reusable enroll link + QR code for a single school, built purely
 * from its own place_id — no invite tokens, no expiry, no tracking. The link
 * points at the existing marketing deep-link route (/cerca?placeId=...),
 * which already auto-selects the school and surfaces the right enroll CTA
 * for both signed-in and anonymous visitors.
 */
export function InviteLinkCard({ placeId }: InviteLinkCardProps) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	const inviteUrl = `${window.location.origin}/cerca?placeId=${encodeURIComponent(placeId)}`;

	useEffect(() => {
		let cancelled = false;
		QRCode.toDataURL(inviteUrl, { width: 240, margin: 1 })
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [inviteUrl]);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(inviteUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-4 sm:flex-row sm:items-center">
			{qrDataUrl && (
				<img
					src={qrDataUrl}
					alt={t("school.editor.invite.qrAlt")}
					width={120}
					height={120}
					className="shrink-0 rounded-lg border border-line"
				/>
			)}
			<div className="flex flex-1 flex-col gap-2">
				<p className="text-sm text-ink-muted">
					{t("school.editor.invite.description")}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<input
						readOnly
						value={inviteUrl}
						onFocus={(e) => e.currentTarget.select()}
						className="min-w-0 flex-1 rounded-lg border border-line bg-bg-raised px-3 py-2 text-xs text-ink"
					/>
					<button
						type="button"
						onClick={handleCopy}
						className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-line/30"
					>
						{copied
							? t("school.editor.invite.copied")
							: t("school.editor.invite.copy")}
					</button>
					{qrDataUrl && (
						<a
							href={qrDataUrl}
							download={`invito-autoscuola-${placeId}.png`}
							className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-line/30"
						>
							{t("school.editor.invite.downloadQr")}
						</a>
					)}
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Add translation keys**

In `src/i18n/locales/it.json`, inside the `school.editor.sections` object, add a new section label after `"identity": "Identità",`:

```json
				"identity": "Identità",
				"invite": "Invito studenti",
```

Then, still inside `school.editor` (as a sibling of `sections`, near `priceFor`/`licenses`), add:

```json
			"invite": {
				"description": "Condividi questo link o il codice QR con i tuoi studenti: chi lo apre viene portato dritto alla pagina di iscrizione a questa autoscuola.",
				"copy": "Copia link",
				"copied": "Copiato!",
				"downloadQr": "Scarica QR",
				"qrAlt": "Codice QR per l'iscrizione"
			},
```

In `src/i18n/locales/en.json`, same structure:

```json
				"identity": "Identity",
				"invite": "Student invite",
```

```json
			"invite": {
				"description": "Share this link or QR code with your students — anyone who opens it lands straight on the enrollment page for this school.",
				"copy": "Copy link",
				"copied": "Copied!",
				"downloadQr": "Download QR",
				"qrAlt": "Enrollment QR code"
			},
```

In `src/i18n/locales/ar.json`, same structure:

```json
				"identity": "الهوية",
				"invite": "دعوة الطلاب",
```

```json
			"invite": {
				"description": "شارك هذا الرابط أو رمز QR مع طلابك — من يفتحه يصل مباشرة إلى صفحة التسجيل في هذه المدرسة.",
				"copy": "نسخ الرابط",
				"copied": "تم النسخ!",
				"downloadQr": "تنزيل رمز QR",
				"qrAlt": "رمز QR للتسجيل"
			},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/driving-school/__tests__/InviteLinkCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/driving-school/InviteLinkCard.tsx src/components/driving-school/__tests__/InviteLinkCard.test.tsx src/i18n/locales/it.json src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat: add InviteLinkCard component for school enroll link + QR"
```

---

### Task 6: Wire `InviteLinkCard` into `SchoolEditor`

**Files:**
- Modify: `src/components/driving-school/SchoolEditor.tsx`

`SchoolEditorData` (defined in this file, line 6) already carries `place_id: string`, so no data-fetching change is needed — the card just needs to be mounted with `form.place_id`.

- [ ] **Step 1: Write the failing test**

There is no existing `SchoolEditor.test.tsx` in the repo, and adding one requires mocking the full Supabase-backed save flow the component already has, which is unrelated to this feature. Instead, extend `InviteLinkCard`'s own test suite (already passing from Task 5) is sufficient isolation — `SchoolEditor` only needs a smoke check that it renders the card. Skip a new test file for `SchoolEditor` itself; verify by manual/dev-server check in Step 3 instead, per this codebase's existing convention of not unit-testing this particular large form component (confirmed by its absence today).

- [ ] **Step 2: Mount the card**

In `src/components/driving-school/SchoolEditor.tsx`, add the import at the top (after the existing imports):

```tsx
import { InviteLinkCard } from "@/components/driving-school/InviteLinkCard";
```

Then, inside the `<form>` in the `return (...)` block, insert a new `<fieldset>` right after the closing `</fieldset>` of the "Identità" section (the one starting at line 260 with `{/* Identità */}`) and before the next section's `{/* ... */}` comment:

```tsx
				{/* Invito studenti */}
				<fieldset>
					<legend className={sectionHeader}>
						{t("school.editor.sections.invite")}
					</legend>
					<InviteLinkCard placeId={form.place_id} />
				</fieldset>
```

- [ ] **Step 3: Manual verification**

Run the dev server (`pnpm dev`), sign in as a school (or use whatever local fixture the repo already uses for `driving-school` role), open the school editor page, and confirm:
- A new "Invito studenti" / "Student invite" section appears right after "Identità" / "Identity".
- The link field shows `<origin>/cerca?placeId=<the school's real place_id>`.
- The QR image renders.
- "Copia link" copies the URL (check via a manual paste) and flips to "Copiato!" for ~2 seconds.
- "Scarica QR" downloads a PNG.
- Opening the link in an incognito window lands on `/cerca` with that school pre-selected, matching what `useCerca`'s existing auto-select already does.

- [ ] **Step 4: Commit**

```bash
git add src/components/driving-school/SchoolEditor.tsx
git commit -m "feat: show the invite link/QR card in the school editor"
```

---

### Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc -b`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

No commit for this task — it's a verification checkpoint. If any step fails, fix the underlying issue in the task that introduced it and re-run Steps 1–3 here.
