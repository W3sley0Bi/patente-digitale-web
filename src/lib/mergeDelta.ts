import type { NormalizedSchool } from "@/lib/geojson";

interface ClaimedSchoolRow {
  place_id: string;
  name?: string | null;
  city?: string | null;
  zip?: string | null;
  region?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string[] | null;
  licenses?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: unknown;
}

export function mergeDelta(base: NormalizedSchool[], delta: ClaimedSchoolRow[]): NormalizedSchool[] {
  if (delta.length === 0) return base;

  const deltaMap = new Map(delta.map((d) => [d.place_id, d]));

  const result: NormalizedSchool[] = base.map((school) => {
    const override = deltaMap.get(school._placeId ?? "");
    if (!override) return school;
    deltaMap.delete(school._placeId ?? "");

    return {
      ...school,
      name: override.name ?? school.name,
      city: override.city ?? school.city,
      zip: override.zip ?? school.zip,
      region: override.region ?? school.region,
      address: override.address ?? school.address,
      phone: override.phone ?? school.phone,
      website: override.website ?? school.website,
      licenses: override.licenses ?? school.licenses,
      latlng:
        override.lat != null && override.lng != null
          ? [override.lat, override.lng]
          : school.latlng,
    };
  });

  for (const [placeId, row] of deltaMap) {
    result.push({
      _placeId: placeId,
      name: row.name ?? "",
      city: row.city ?? "",
      zip: row.zip ?? "",
      region: row.region ?? "",
      address: row.address ?? "",
      phone: row.phone ?? "",
      website: row.website ?? "",
      partner: false,
      latlng: [row.lat ?? 0, row.lng ?? 0],
      licenses: row.licenses ?? [],
      id: `${row.lat ?? 0},${row.lng ?? 0}`,
    } as NormalizedSchool);
  }

  return result;
}
