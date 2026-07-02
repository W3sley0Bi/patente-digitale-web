# App School Finder / Marketing Search Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give students an in-app school finder (map + filters + cards) shown only while they have no active enrollment, structurally independent from the marketing `/search` page and the owner claim flow.

**Architecture:** New `AppSchoolFinderPanel` container reuses the existing generic pieces (`useCerca`, `FilterBar`, `ResultsList`, `SchoolMap`, `SchoolCard`) unmodified. A new `AppSchoolDetailPanel` replaces marketing's `SchoolDetailPanel` for this context (info + `EnrollButton` only, no owner-claim CTA, no marketing links). `StudentDashboard.tsx` renders the panel in place of the current `/search` deep-link, gated on the enrollment status it already tracks (`isActive` — true only when `status === "active"`).

**Tech Stack:** React, TypeScript, react-i18next, Vitest + Testing Library, existing `useCerca` hook, Supabase-backed `booking/api.ts`.

Spec: `docs/superpowers/specs/2026-07-02-app-school-finder-separation-design.md`

---

### Task 1: `AppSchoolDetailPanel` component

**Files:**
- Create: `src/components/booking/school-finder/AppSchoolDetailPanel.tsx`
- Test: `src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx`
- Modify: `src/i18n/locales/it.json`, `src/i18n/locales/en.json`, `src/i18n/locales/ar.json` (add keys)

This panel shows a selected school's basic info plus the existing `EnrollButton`. It must never render a link to `/app/signup/driving-school` or `/search` — that's the whole point of forking it instead of reusing `SchoolDetailPanel`.

- [ ] **Step 1: Add i18n keys**

Add to `src/i18n/locales/it.json` under a new `booking.student.schoolFinder` object (create `schoolFinder` if `booking.student` doesn't have it yet — `booking.student` already exists per `src/i18n/locales/it.json`):

```json
"schoolFinder": {
  "title": "Trova un'autoscuola",
  "closeModal": "Chiudi",
  "noSelection": "Seleziona un'autoscuola per vederne i dettagli"
}
```

Add the same key structure to `src/i18n/locales/en.json`:

```json
"schoolFinder": {
  "title": "Find a driving school",
  "closeModal": "Close",
  "noSelection": "Select a driving school to see details"
}
```

And to `src/i18n/locales/ar.json` (check existing `booking.student` translations in that file for tone/RTL phrasing before adding — mirror the `it`/`en` structure with Arabic strings):

```json
"schoolFinder": {
  "title": "ابحث عن مدرسة قيادة",
  "closeModal": "إغلاق",
  "noSelection": "اختر مدرسة قيادة لعرض التفاصيل"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/booking/EnrollButton", () => ({
	EnrollButton: ({ placeId }: { placeId: string }) => (
		<div data-testid="enroll-button">{placeId}</div>
	),
}));

import { AppSchoolDetailPanel } from "@/components/booking/school-finder/AppSchoolDetailPanel";
import type { NormalizedSchool } from "@/lib/geojson";

function makeSchool(overrides: Partial<NormalizedSchool> = {}): NormalizedSchool {
	return {
		id: "school-1",
		name: "Autoscuola Roma Centro",
		address: "Via Roma 1",
		city: "Roma",
		zip: "00100",
		region: "Lazio",
		phone: "+390612345",
		website: null,
		latlng: [41.9, 12.5],
		partner: false,
		enrollment_enabled: true,
		openingHours: null,
		rating: null,
		userRatingCount: null,
		businessStatus: null,
		googleMapsUri: null,
		_placeId: "place-1",
		...overrides,
	} as NormalizedSchool;
}

describe("AppSchoolDetailPanel", () => {
	it("renders nothing when no school is selected", () => {
		const { container } = render(
			<AppSchoolDetailPanel school={null} onClose={vi.fn()} />,
		);
		expect(container.textContent).not.toContain("Autoscuola");
	});

	it("shows school name and address when selected", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		expect(screen.getByText("Autoscuola Roma Centro")).toBeInTheDocument();
		expect(screen.getByText(/Via Roma 1/)).toBeInTheDocument();
	});

	it("renders EnrollButton with the school's placeId", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		expect(screen.getByTestId("enroll-button")).toHaveTextContent("place-1");
	});

	it("never renders a link to marketing search or the owner claim flow", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", expect.stringContaining("/search"));
			expect(link).not.toHaveAttribute(
				"href",
				expect.stringContaining("/app/signup/driving-school"),
			);
		}
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx`
Expected: FAIL with "Cannot find module '@/components/booking/school-finder/AppSchoolDetailPanel'"

- [ ] **Step 4: Write the implementation**

```tsx
// src/components/booking/school-finder/AppSchoolDetailPanel.tsx
import { MapPin, Phone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EnrollButton } from "@/components/booking/EnrollButton";
import type { NormalizedSchool } from "@/lib/geojson";

interface AppSchoolDetailPanelProps {
	school: NormalizedSchool | null;
	onClose: () => void;
}

/**
 * Student-facing detail panel for the in-app school finder. Deliberately not
 * a reuse of cerca/SchoolDetailPanel: that file renders the owner-claim CTA
 * and marketing links, which must never appear in the app-scoped finder.
 */
export function AppSchoolDetailPanel({
	school,
	onClose,
}: AppSchoolDetailPanelProps) {
	const { t } = useTranslation();

	if (!school) return null;

	return (
		<div className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[70%] flex-col overflow-y-auto rounded-t-2xl border border-line bg-bg-raised shadow-2xl md:inset-y-0 md:left-0 md:right-auto md:w-72 md:max-h-none md:rounded-t-none md:rounded-r-2xl">
			<div className="relative shrink-0 px-5 pt-5 pb-4">
				<button
					type="button"
					onClick={onClose}
					aria-label={t("booking.student.schoolFinder.closeModal")}
					className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink"
				>
					<X size={16} />
				</button>
				<h2 className="pe-8 font-sans text-base font-black leading-snug text-ink">
					{school.name}
				</h2>
			</div>

			<div className="mx-5 shrink-0 border-t border-line" />

			<div className="flex flex-col gap-3 px-5 py-4">
				{(school.address || school.city) && (
					<div className="flex items-start gap-2.5">
						<MapPin size={14} className="mt-0.5 shrink-0 text-ink-faint" />
						<span className="font-sans text-sm text-ink-muted leading-snug">
							{[school.address, school.city, school.zip]
								.filter(Boolean)
								.join(", ")}
						</span>
					</div>
				)}

				{school.phone && (
					<div className="flex items-start gap-2.5">
						<Phone size={14} className="shrink-0 text-brand" />
						<a
							href={`tel:${school.phone}`}
							className="font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
						>
							{school.phone}
						</a>
					</div>
				)}
			</div>

			{school._placeId && (
				<div className="mt-auto shrink-0 border-t border-line px-5 pb-5 pt-4">
					<EnrollButton placeId={school._placeId} />
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/booking/school-finder/AppSchoolDetailPanel.tsx src/components/booking/school-finder/__tests__/AppSchoolDetailPanel.test.tsx src/i18n/locales/it.json src/i18n/locales/en.json src/i18n/locales/ar.json
git commit -m "feat: add app-scoped school detail panel for student finder"
```

---

### Task 2: `AppSchoolFinderPanel` container

**Files:**
- Create: `src/components/booking/school-finder/AppSchoolFinderPanel.tsx`
- Test: `src/components/booking/school-finder/__tests__/AppSchoolFinderPanel.test.tsx`

This is the container students see on their dashboard. It reuses `useCerca`, `FilterBar`, `ResultsList`, `SchoolMap` unmodified, and `AppSchoolDetailPanel` from Task 1. It must never import anything from `src/components/cerca/` other than the generic leaf pieces already confirmed to have no marketing coupling (`FilterBar`, `ResultsList`, `SchoolMap`, `SchoolCard` — the latter is used internally by `ResultsList`, not imported directly here).

- [ ] **Step 1: Add the panel title i18n key check**

Already added `booking.student.schoolFinder.title` in Task 1 — no new keys needed here. `FilterBar`/`ResultsList`/`SchoolMap` use the existing `cerca.filters.*`, `cerca.card.*`, `cerca.loading`, `cerca.error`, `cerca.noResults` keys, which already exist and are reused as-is (no i18n duplication needed).

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/booking/school-finder/__tests__/AppSchoolFinderPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseCerca = {
	city: "",
	region: "",
	zip: "",
	name: "",
	verifiedOnly: false,
	enrollmentOnly: false,
	results: [],
	cityOptions: [],
	selected: null,
	loading: false,
	error: null,
	setCity: vi.fn(),
	setRegion: vi.fn(),
	setZip: vi.fn(),
	setName: vi.fn(),
	setVerifiedOnly: vi.fn(),
	setEnrollmentOnly: vi.fn(),
	setSelected: vi.fn(),
	clearFilters: vi.fn(),
};

vi.mock("@/hooks/useCerca", () => ({
	useCerca: () => mockUseCerca,
}));

vi.mock("@/components/cerca/SchoolMap", () => ({
	SchoolMap: () => <div data-testid="school-map" />,
}));

import { AppSchoolFinderPanel } from "@/components/booking/school-finder/AppSchoolFinderPanel";

describe("AppSchoolFinderPanel", () => {
	it("renders the filter bar and results list", () => {
		render(<AppSchoolFinderPanel />);
		expect(
			screen.getByPlaceholderText("cerca.filters.namePlaceholder"),
		).toBeInTheDocument();
		expect(screen.getByText("cerca.noResults")).toBeInTheDocument();
	});

	it("renders the map", () => {
		render(<AppSchoolFinderPanel />);
		expect(screen.getByTestId("school-map")).toBeInTheDocument();
	});

	it("never links to marketing search or the owner claim flow", () => {
		render(<AppSchoolFinderPanel />);
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", expect.stringContaining("/search"));
			expect(link).not.toHaveAttribute(
				"href",
				expect.stringContaining("/app/signup/driving-school"),
			);
		}
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/booking/school-finder/__tests__/AppSchoolFinderPanel.test.tsx`
Expected: FAIL with "Cannot find module '@/components/booking/school-finder/AppSchoolFinderPanel'"

- [ ] **Step 4: Write the implementation**

```tsx
// src/components/booking/school-finder/AppSchoolFinderPanel.tsx
import { useTranslation } from "react-i18next";
import { FilterBar } from "@/components/cerca/FilterBar";
import { ResultsList } from "@/components/cerca/ResultsList";
import { SchoolMap } from "@/components/cerca/SchoolMap";
import { useCerca } from "@/hooks/useCerca";
import { AppSchoolDetailPanel } from "./AppSchoolDetailPanel";

/**
 * In-app school finder for students without an active enrollment. Reuses the
 * generic marketing search building blocks (useCerca, FilterBar, ResultsList,
 * SchoolMap) but is its own container with its own detail panel — it never
 * links to /search or /app/signup/driving-school.
 */
export function AppSchoolFinderPanel() {
	const { t } = useTranslation();
	const {
		city,
		region,
		zip,
		name,
		verifiedOnly,
		enrollmentOnly,
		results,
		cityOptions,
		selected,
		loading,
		error,
		setCity,
		setRegion,
		setZip,
		setName,
		setVerifiedOnly,
		setEnrollmentOnly,
		setSelected,
		clearFilters,
	} = useCerca();

	const filterKey = [city, region, zip, name].filter(Boolean).join("|");

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-4 md:p-6">
			<h2 className="font-sans text-base font-black tracking-tight text-ink">
				{t("booking.student.schoolFinder.title")}
			</h2>

			<div className="mt-3">
				<FilterBar
					city={city}
					region={region}
					zip={zip}
					name={name}
					verifiedOnly={verifiedOnly}
					enrollmentOnly={enrollmentOnly}
					cityOptions={cityOptions}
					onCityChange={setCity}
					onRegionChange={setRegion}
					onZipChange={setZip}
					onNameChange={setName}
					onVerifiedOnlyChange={setVerifiedOnly}
					onEnrollmentOnlyChange={setEnrollmentOnly}
					onClear={clearFilters}
				/>
			</div>

			<div className="mt-4 flex flex-col gap-4 md:h-[420px] md:flex-row">
				<div className="flex overflow-hidden rounded-xl border border-line md:h-full md:w-72 md:shrink-0 md:flex-col">
					<ResultsList
						schools={results}
						selected={selected}
						onSelect={setSelected}
						loading={loading}
						error={error}
						stacked
					/>
				</div>
				<div className="relative h-[260px] flex-1 overflow-hidden rounded-xl md:h-full">
					{!loading && (
						<SchoolMap
							schools={results}
							filterKey={filterKey}
							selected={selected}
							onSelect={setSelected}
						/>
					)}
					<AppSchoolDetailPanel school={selected} onClose={() => setSelected(null)} />
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/booking/school-finder/__tests__/AppSchoolFinderPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/booking/school-finder/AppSchoolFinderPanel.tsx src/components/booking/school-finder/__tests__/AppSchoolFinderPanel.test.tsx
git commit -m "feat: add app-scoped school finder container reusing cerca building blocks"
```

---

### Task 3: Wire into `StudentDashboard`, remove marketing deep-link

**Files:**
- Modify: `src/routes/StudentDashboard.tsx`
- Test: `src/routes/__tests__/StudentDashboard.test.tsx` (new)

`StudentDashboard.tsx` already computes `isActive = enrollment?.status === "active"` (line 213) and already conditionally renders `CalendarPreference` only when `isActive`. Reuse that same boolean to show `AppSchoolFinderPanel` whenever the student is **not** active (covers `null`, `pending`, `rejected`, `left` — matching the approved visibility rule). Remove the `Link to="/search"` CTA from `EnrollmentStatusCard`'s not-enrolled branch since the finder now renders inline right below it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/routes/__tests__/StudentDashboard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@/components/student/StudentLayout", () => ({
	StudentLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/student/CalendarPreference", () => ({
	CalendarPreference: () => <div data-testid="calendar-preference" />,
}));

vi.mock("@/components/student/StatusChangeBanner", () => ({
	StatusChangeBanner: () => null,
}));

vi.mock("@/components/booking/school-finder/AppSchoolFinderPanel", () => ({
	AppSchoolFinderPanel: () => <div data-testid="app-school-finder" />,
}));

vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => ({ profile: { id: "u1", full_name: "Mario" }, refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: () => ({
				eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
			}),
		}),
	},
}));

const getMyEnrollment = vi.fn();
vi.mock("@/lib/booking/api", () => ({
	getMyEnrollment: () => getMyEnrollment(),
	listMyBookings: () => Promise.resolve([]),
}));

import StudentDashboard from "@/routes/StudentDashboard";

describe("StudentDashboard school finder gating", () => {
	it("shows the finder when there is no enrollment", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(<StudentDashboard />);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("shows the finder when enrollment is pending", async () => {
		getMyEnrollment.mockResolvedValue({ status: "pending", school_id: "s1" });
		render(<StudentDashboard />);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("hides the finder when enrollment is active", async () => {
		getMyEnrollment.mockResolvedValue({ status: "active", school_id: "s1" });
		render(<StudentDashboard />);
		await screen.findByTestId("calendar-preference");
		expect(screen.queryByTestId("app-school-finder")).not.toBeInTheDocument();
	});

	it("never links to /search from the dashboard", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(<StudentDashboard />);
		await screen.findByTestId("app-school-finder");
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", "/search");
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/__tests__/StudentDashboard.test.tsx`
Expected: FAIL — `app-school-finder` test id not found (component not wired in yet), and the `/search` link still present.

- [ ] **Step 3: Modify `StudentDashboard.tsx`**

Remove the `Link`/`Search`-icon CTA from `EnrollmentStatusCard`'s not-enrolled branch, and render `AppSchoolFinderPanel` below the status card whenever the student isn't active.

Replace the imports at the top (lines 1-12):

```tsx
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AppSchoolFinderPanel } from "@/components/booking/school-finder/AppSchoolFinderPanel";
import { CalendarPreference } from "@/components/student/CalendarPreference";
import { StatusChangeBanner } from "@/components/student/StatusChangeBanner";
import { StudentLayout } from "@/components/student/StudentLayout";
import { useProfile } from "@/hooks/useProfile";
import { getMyEnrollment, listMyBookings } from "@/lib/booking/api";
import { effectiveStatus } from "@/lib/booking/helpers";
import type { Booking, Enrollment } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";
```

(This drops the `ArrowRight, CalendarClock, Search` combined import and the unused `Search` icon; `ArrowRight` is still used by `LessonsGlance` further down, so re-add it there — see next edit.)

Replace the `EnrollmentStatusCard` not-enrolled branch (original lines 36-51):

```tsx
	// Not enrolled (or rejected/left) → the finder panel renders below this card
	if (!enrollment || status === "rejected" || status === "left") {
		return (
			<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-6 text-center">
				<p className="text-sm text-ink-muted">
					{t("booking.student.notEnrolled")}
				</p>
			</div>
		);
	}
```

Update `LessonsGlance` (original lines 64-131) to keep its own `ArrowRight` import since the top-level import list above dropped it — change its import line accordingly. Add `import { ArrowRight, CalendarClock } from "lucide-react";` back as a single combined import at the top instead of the two separate edits above. Final top import block:

```tsx
import { ArrowRight, CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSchoolFinderPanel } from "@/components/booking/school-finder/AppSchoolFinderPanel";
import { CalendarPreference } from "@/components/student/CalendarPreference";
import { StatusChangeBanner } from "@/components/student/StatusChangeBanner";
import { StudentLayout } from "@/components/student/StudentLayout";
import { useProfile } from "@/hooks/useProfile";
import { getMyEnrollment, listMyBookings } from "@/lib/booking/api";
import { effectiveStatus } from "@/lib/booking/helpers";
import type { Booking, Enrollment } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";
```

Update the default export's return block (original lines 215-235):

```tsx
	return (
		<StudentLayout>
			<div className="mx-auto max-w-5xl pb-12">
				<h1 className="text-2xl font-bold">
					{name
						? t("booking.student.greeting", { name })
						: t("student.dashboard.title")}
				</h1>
				<CompleteNamePrompt />

				<EnrollmentStatusCard
					loading={loading}
					enrollment={enrollment}
					school={school}
				/>
				{!loading && !isActive && <AppSchoolFinderPanel />}
				<StatusChangeBanner />
				<LessonsGlance />
				{isActive && <CalendarPreference />}
			</div>
		</StudentLayout>
	);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/__tests__/StudentDashboard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npx vitest run`
Expected: All tests PASS, including previously-passing `src/components/booking/__tests__/RequestsInbox.test.tsx` and other booking tests unaffected by this change.

- [ ] **Step 6: Commit**

```bash
git add src/routes/StudentDashboard.tsx src/routes/__tests__/StudentDashboard.test.tsx
git commit -m "feat: show in-app school finder on student dashboard until enrollment is active"
```

---

### Task 4: Manual verification

**Files:** none (manual QA pass)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify marketing search is untouched**

Navigate to `/search`. Confirm it looks and behaves exactly as before (map, filters, cards, owner callout link, claim CTA on unverified schools).

- [ ] **Step 3: Verify student finder appears pre-enrollment**

Log in as a student account with no enrollment (or seed one with `status = null`/absent row). Navigate to the student dashboard (`/app/student` or equivalent). Confirm the new finder panel (map + filters + list) renders below the enrollment status card, and that selecting a school shows the `AppSchoolDetailPanel` with an `EnrollButton`, no claim CTA, no links to `/search` or `/app/signup/driving-school`.

- [ ] **Step 4: Verify finder disappears once active**

Approve the student's enrollment (or seed `status = "active"`) and reload the dashboard. Confirm the finder panel no longer renders and `CalendarPreference` shows instead.

- [ ] **Step 5: Verify pending state still shows the finder**

Seed `status = "pending"` and reload. Confirm the finder still renders (per the approved "hide only once active" rule) alongside the pending status message.

- [ ] **Step 6: Verify owner claim flow is untouched**

Navigate to `/app/signup/driving-school` directly and via the marketing owner-callout link. Confirm `ClaimSearch`/`SignupDrivingSchool` behavior is unchanged.
