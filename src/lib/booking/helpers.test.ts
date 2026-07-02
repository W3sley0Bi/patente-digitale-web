import { describe, expect, it } from "vitest";
import {
	effectiveStatus,
	groupByDay,
	isCancellable,
	nextDays,
	overlaps,
} from "./helpers";
import type { Booking } from "./types";

const mk = (over: Partial<Booking>): Booking => ({
	id: "b",
	school_id: "s",
	student_id: "u",
	instructor_id: null,
	preferred_instructor_id: null,
	starts_at: "2030-01-01T10:00:00Z",
	duration_min: 60,
	ends_at: "2030-01-01T11:00:00Z",
	status: "pending",
	cancelled_by: null,
	cancel_reason: null,
	licence_code: null,
	created_at: "",
	updated_at: "",
	decided_at: null,
	...over,
});

describe("isCancellable", () => {
	it("allows pending and confirmed", () => {
		expect(isCancellable(mk({ status: "pending" }))).toBe(true);
		expect(isCancellable(mk({ status: "confirmed" }))).toBe(true);
	});
	it("blocks terminal states", () => {
		expect(isCancellable(mk({ status: "cancelled" }))).toBe(false);
		expect(isCancellable(mk({ status: "declined" }))).toBe(false);
		expect(isCancellable(mk({ status: "completed" }))).toBe(false);
	});
	it("respects driving school cancellation policies", () => {
		const bAlways = mk({
			status: "confirmed",
			driving_school: {
				cancellation_policy: "always",
				cancellation_cutoff_hours: 24,
			},
		});
		expect(isCancellable(bAlways)).toBe(true);

		const bNoCancel = mk({
			status: "confirmed",
			driving_school: {
				cancellation_policy: "no_cancel",
				cancellation_cutoff_hours: 24,
			},
		});
		expect(isCancellable(bNoCancel)).toBe(false);

		// cutoff: 24 hours. lesson starts at 2030-01-01T10:00:00Z.
		// cutoff time is 2029-12-31T10:00:00Z.
		const bCustom = mk({
			status: "confirmed",
			starts_at: "2030-01-01T10:00:00Z",
			driving_school: {
				cancellation_policy: "custom",
				cancellation_cutoff_hours: 24,
			},
		});
		// safe time: 25 hours before starts_at (2029-12-31T09:00:00Z)
		expect(isCancellable(bCustom, new Date("2029-12-31T09:00:00Z"))).toBe(true);
		// unsafe time: 23 hours before starts_at (2029-12-31T11:00:00Z)
		expect(isCancellable(bCustom, new Date("2029-12-31T11:00:00Z"))).toBe(
			false,
		);
	});
});

describe("effectiveStatus", () => {
	it("reports completed for past confirmed lessons", () => {
		const past = mk({ status: "confirmed", ends_at: "2000-01-01T11:00:00Z" });
		expect(effectiveStatus(past, new Date("2020-01-01T00:00:00Z"))).toBe(
			"completed",
		);
	});
	it("leaves future confirmed as confirmed", () => {
		const fut = mk({ status: "confirmed", ends_at: "2030-01-01T11:00:00Z" });
		expect(effectiveStatus(fut, new Date("2020-01-01T00:00:00Z"))).toBe(
			"confirmed",
		);
	});
	it("never rewrites non-confirmed statuses", () => {
		expect(
			effectiveStatus(
				mk({ status: "pending", ends_at: "2000-01-01T11:00:00Z" }),
				new Date(),
			),
		).toBe("pending");
	});
});

describe("overlaps", () => {
	it("detects overlap", () => {
		expect(
			overlaps(
				mk({}),
				mk({
					starts_at: "2030-01-01T10:30:00Z",
					ends_at: "2030-01-01T11:30:00Z",
				}),
			),
		).toBe(true);
	});
	it("treats touching edges as non-overlapping", () => {
		expect(
			overlaps(
				mk({}),
				mk({
					starts_at: "2030-01-01T11:00:00Z",
					ends_at: "2030-01-01T12:00:00Z",
				}),
			),
		).toBe(false);
	});
});

describe("groupByDay", () => {
	it("buckets bookings by ISO date", () => {
		const g = groupByDay([
			mk({ id: "a" }),
			mk({ id: "b", starts_at: "2030-01-02T09:00:00Z" }),
		]);
		expect(Object.keys(g).sort()).toEqual(["2030-01-01", "2030-01-02"]);
		expect(g["2030-01-01"].map((x) => x.id)).toEqual(["a"]);
	});
});

describe("nextDays", () => {
	it("returns n consecutive ISO dates from start", () => {
		expect(nextDays(3, new Date("2026-06-26T10:00:00Z"))).toEqual([
			"2026-06-26",
			"2026-06-27",
			"2026-06-28",
		]);
	});
	it("crosses month boundaries", () => {
		expect(nextDays(2, new Date("2026-01-31T00:00:00Z"))).toEqual([
			"2026-01-31",
			"2026-02-01",
		]);
	});
});
