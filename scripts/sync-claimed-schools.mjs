import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: claimed, error } = await supabase.from("driving_schools").select("*").eq("status", "accepted");
  if (error) { console.error("Supabase error:", error.message); process.exit(1); }
  if (!claimed || claimed.length === 0) {
    console.log("No claimed schools — nothing to sync.");
    return;
  }

  const geojsonPath = join(__dirname, "../public/data/autoscuole.geojson");
  const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8"));

  const deltaMap = new Map(claimed.map((c) => [c.place_id, c]));
  let patched = 0;

  geojson.features = geojson.features.map((feature) => {
    const placeId = feature.properties._placeId;
    const row = deltaMap.get(placeId);
    if (!row) return feature;
    deltaMap.delete(placeId);
    patched++;

    return {
      ...feature,
      geometry:
        row.lat != null && row.lng != null
          ? { type: "Point", coordinates: [row.lng, row.lat] }
          : feature.geometry,
      properties: {
        ...feature.properties,
        ...(row.name && { name: row.name }),
        ...(row.address && { address: row.address }),
        ...(row.city && { city: row.city }),
        ...(row.zip && { zip: row.zip }),
        ...(row.region && { region: row.region }),
        ...(row.phone && { phone: row.phone }),
        ...(row.website && { website: row.website }),
        ...(row.opening_hours && { openingHours: row.opening_hours }),
        ...(row.licenses && { licenses: row.licenses }),
      },
    };
  });

  // Append schools with custom place_ids (not in original GeoJSON)
  for (const [placeId, row] of deltaMap) {
    geojson.features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row.lng ?? 0, row.lat ?? 0] },
      properties: {
        _placeId: placeId,
        name: row.name ?? "",
        city: row.city ?? "",
        zip: row.zip ?? "",
        region: row.region ?? "",
        address: row.address ?? "",
        phone: row.phone ?? "",
        website: row.website ?? "",
        openingHours: row.opening_hours ?? [],
        licenses: row.licenses ?? [],
        businessStatus: "OPERATIONAL",
        partner: false,
      },
    });
    patched++;
  }

  writeFileSync(geojsonPath, JSON.stringify(geojson));
  console.log(`Sync complete: ${patched} school(s) patched.`);
}

main();
