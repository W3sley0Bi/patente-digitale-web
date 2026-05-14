import type { NormalizedSchool } from "@/lib/geojson";

export function buildIscrizioneUrl(school: NormalizedSchool, extraParams?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (school._placeId) p.set("placeId", school._placeId);
  p.set("name", school.name);
  if (school.rating != null) p.set("rating", String(school.rating));
  if (school.userRatingCount != null) p.set("ratingCount", String(school.userRatingCount));
  if (school.openingHours && school.openingHours.length > 0) {
    p.set("hours", JSON.stringify(school.openingHours));
  }
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) p.set(k, v);
  }
  return `/iscrizione?${p.toString()}`;
}
