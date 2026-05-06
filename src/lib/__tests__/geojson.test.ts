import { describe, expect, it } from "vitest";
import { normalizeSchool } from "@/lib/geojson";
import type { SchoolFeature } from "@/lib/geojson";

const makeFeature = (overrides: Partial<SchoolFeature["properties"]> = {}): SchoolFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [12.5, 41.9] },
  properties: {
    name: "Autoscuola Test",
    city: "Roma",
    zip: "00100",
    region: "Lazio",
    address: "Via Roma 1",
    phone: "+39 06 1234567",
    website: "https://example.com",
    ...overrides,
  },
});

describe("normalizeSchool", () => {
  it("returns all fields when present", () => {
    const school = normalizeSchool(makeFeature());
    expect(school.name).toBe("Autoscuola Test");
    expect(school.city).toBe("Roma");
    expect(school.zip).toBe("00100");
    expect(school.latlng).toEqual([41.9, 12.5]);
  });

  it("falls back to 'Autoscuola' when name is empty", () => {
    const school = normalizeSchool(makeFeature({ name: "" }));
    expect(school.name).toBe("Autoscuola");
  });

  it("swaps coordinates: GeoJSON is [lng, lat], latlng is [lat, lng]", () => {
    const feature = makeFeature();
    feature.geometry.coordinates = [9.19, 45.46]; // Milano [lng, lat]
    const school = normalizeSchool(feature);
    expect(school.latlng).toEqual([45.46, 9.19]);
  });
});
