import { describe, it, expect } from "vitest";
import { isCancellable, effectiveStatus, groupByDay, overlaps } from "./helpers";
import type { Booking } from "./types";

const mk = (over: Partial<Booking>): Booking => ({
  id: "b", school_id: "s", student_id: "u", instructor_id: null,
  starts_at: "2030-01-01T10:00:00Z", duration_min: 60, ends_at: "2030-01-01T11:00:00Z",
  status: "pending", cancelled_by: null, cancel_reason: null, licence_code: null,
  created_at: "", updated_at: "", decided_at: null, ...over,
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
});

describe("effectiveStatus", () => {
  it("reports completed for past confirmed lessons", () => {
    const past = mk({ status: "confirmed", ends_at: "2000-01-01T11:00:00Z" });
    expect(effectiveStatus(past, new Date("2020-01-01T00:00:00Z"))).toBe("completed");
  });
  it("leaves future confirmed as confirmed", () => {
    const fut = mk({ status: "confirmed", ends_at: "2030-01-01T11:00:00Z" });
    expect(effectiveStatus(fut, new Date("2020-01-01T00:00:00Z"))).toBe("confirmed");
  });
  it("never rewrites non-confirmed statuses", () => {
    expect(effectiveStatus(mk({ status: "pending", ends_at: "2000-01-01T11:00:00Z" }), new Date())).toBe("pending");
  });
});

describe("overlaps", () => {
  it("detects overlap", () => {
    expect(overlaps(mk({}), mk({ starts_at: "2030-01-01T10:30:00Z", ends_at: "2030-01-01T11:30:00Z" }))).toBe(true);
  });
  it("treats touching edges as non-overlapping", () => {
    expect(overlaps(mk({}), mk({ starts_at: "2030-01-01T11:00:00Z", ends_at: "2030-01-01T12:00:00Z" }))).toBe(false);
  });
});

describe("groupByDay", () => {
  it("buckets bookings by ISO date", () => {
    const g = groupByDay([mk({ id: "a" }), mk({ id: "b", starts_at: "2030-01-02T09:00:00Z" })]);
    expect(Object.keys(g).sort()).toEqual(["2030-01-01", "2030-01-02"]);
    expect(g["2030-01-01"].map((x) => x.id)).toEqual(["a"]);
  });
});
