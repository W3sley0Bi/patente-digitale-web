# Preselect Student's Preferred Instructor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** School's requests inbox preselects the instructor dropdown with the student's `preferred_instructor_id` instead of always starting empty.

**Architecture:** Single-file change to `src/components/booking/RequestsInbox.tsx`. Its `load()` function seeds the existing `picked` state map from each booking's `preferred_instructor_id`, only for keys not already set and only when the id is in the current active-instructor list. No API/DB/RPC changes — `confirmBooking` already reads from `picked`.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library.

Spec: `docs/superpowers/specs/2026-07-02-preselect-preferred-instructor-design.md`

---

### Task 1: Seed `picked` from `preferred_instructor_id` in `RequestsInbox`

**Files:**
- Modify: `src/components/booking/RequestsInbox.tsx:30-37` (the `load` function)
- Test: `src/components/booking/__tests__/RequestsInbox.test.tsx` (new)

- [ ] **Step 1: Write the failing tests**

Create `src/components/booking/__tests__/RequestsInbox.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/booking/api", () => ({
  listSchoolBookings: vi.fn(),
  listInstructors: vi.fn(),
  confirmBooking: vi.fn(),
  declineBooking: vi.fn(),
}));

import { RequestsInbox } from "@/components/booking/RequestsInbox";
import {
  listSchoolBookings,
  listInstructors,
} from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";

const instructors: Instructor[] = [
  {
    id: "instr-1",
    school_id: "school-1",
    name: "Mario Rossi",
    active: true,
    color: null,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "instr-2",
    school_id: "school-1",
    name: "Luigi Verdi",
    active: true,
    color: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: "booking-1",
    school_id: "school-1",
    student_id: "student-1",
    instructor_id: null,
    preferred_instructor_id: null,
    starts_at: "2026-07-10T09:00:00Z",
    duration_min: 60,
    ends_at: "2026-07-10T10:00:00Z",
    status: "pending",
    cancelled_by: null,
    cancel_reason: null,
    licence_code: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    decided_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(listInstructors).mockResolvedValue(instructors);
});

describe("RequestsInbox preferred instructor preselection", () => {
  it("preselects the dropdown with the student's preferred instructor", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveValue("instr-2")
    );
  });

  it("leaves the dropdown empty when there is no preference", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: null }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() => screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("falls back to empty when the preferred instructor is no longer active", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-inactive" }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() => screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("does not clobber a manual pick on a later reload", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
      makeBooking({ id: "booking-2", preferred_instructor_id: null }),
    ]);

    render(<RequestsInbox schoolId="school-1" refreshKey={0} />);
    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(2));

    const [select1] = screen.getAllByRole("combobox");
    fireEvent.change(select1, { target: { value: "instr-1" } });
    expect(select1).toHaveValue("instr-1");

    // simulate a reload (e.g. after confirming/declining another booking)
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
    ]);

    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(1));
    expect(screen.getByRole("combobox")).toHaveValue("instr-1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/booking/__tests__/RequestsInbox.test.tsx`
Expected: FAIL — first three assertions fail because the dropdown value is always `""` (current behavior seeds nothing from `preferred_instructor_id`).

- [ ] **Step 3: Implement the seeding logic**

In `src/components/booking/RequestsInbox.tsx`, replace the `load` function (lines 30-37):

```tsx
	const load = async () => {
		const [b, i] = await Promise.all([
			listSchoolBookings(schoolId),
			listInstructors(schoolId),
		]);
		setBookings(b);
		const active = i.filter((x) => x.active);
		setInstructors(active);
		const activeIds = new Set(active.map((x) => x.id));
		setPicked((prev) => {
			const next = { ...prev };
			for (const booking of b) {
				if (
					next[booking.id] === undefined &&
					booking.preferred_instructor_id &&
					activeIds.has(booking.preferred_instructor_id)
				) {
					next[booking.id] = booking.preferred_instructor_id;
				}
			}
			return next;
		});
	};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/booking/__tests__/RequestsInbox.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS (no regressions elsewhere)

- [ ] **Step 6: Commit**

```bash
git add src/components/booking/RequestsInbox.tsx src/components/booking/__tests__/RequestsInbox.test.tsx
git commit -m "$(cat <<'EOF'
feat: preselect student's preferred instructor in school requests inbox

Students already choose a preferred instructor when booking
(bookings.preferred_instructor_id), but the school inbox ignored it and
always started the assign dropdown empty. Seed it on load, falling back
to empty when the preference is missing or no longer an active instructor.
EOF
)"
```

---

## Plan Self-Review Notes

- **Spec coverage:** preselect-on-load ✓ (Task 1 Step 3), no badge ✓ (no badge added), fallback-to-empty for stale/inactive preference ✓ (test 3 + `activeIds.has` check), no clobbering manual picks on reload ✓ (test 4 + `next[booking.id] === undefined` guard), confirm flow untouched ✓ (no changes to `confirm`/`confirmBooking`).
- No placeholders; all test and implementation code is complete and runnable.
- Single task is appropriate — this is a one-file, one-function change with no independent sub-parts to split across tasks.
