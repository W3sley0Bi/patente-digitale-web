import { describe, expect, it, vi } from "vitest";
import type { Enrollment } from "../types";

const mkEnrollment = (over: Partial<Enrollment>): Enrollment => ({
	id: "e",
	school_id: "s",
	student_id: "u",
	status: "pending",
	licence_code: null,
	created_at: "",
	decided_at: null,
	...over,
});

let queryResult: { data: Enrollment[] | null; error: unknown };

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: () => ({
				in: () => Promise.resolve(queryResult),
			}),
		}),
	},
}));

import { getMyEnrollment } from "../api";

describe("getMyEnrollment", () => {
	it("prefers an active enrollment over a stale pending one, regardless of row order", async () => {
		const pending = mkEnrollment({ id: "p1", school_id: "school-c", status: "pending" });
		const active = mkEnrollment({ id: "a1", school_id: "school-b", status: "active" });

		// Row order is arbitrary (no ORDER BY on the query) — pending listed first.
		queryResult = { data: [pending, active], error: null };
		expect(await getMyEnrollment()).toEqual(active);

		// Also correct when active happens to come first.
		queryResult = { data: [active, pending], error: null };
		expect(await getMyEnrollment()).toEqual(active);
	});

	it("falls back to a pending enrollment when no active one exists", async () => {
		const pending = mkEnrollment({ id: "p1", status: "pending" });
		queryResult = { data: [pending], error: null };
		expect(await getMyEnrollment()).toEqual(pending);
	});

	it("returns null when there are no matching rows", async () => {
		queryResult = { data: [], error: null };
		expect(await getMyEnrollment()).toBeNull();
	});
});
