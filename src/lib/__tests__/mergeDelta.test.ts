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
