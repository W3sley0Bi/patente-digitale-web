import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../public/data/autoscuole.geojson");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Query nodes + ways + relations; "out body center" gives center lat/lon for ways/relations
const QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="IT"][admin_level=2]->.italy;
(
  node["amenity"="driving_school"](area.italy);
  way["amenity"="driving_school"](area.italy);
  relation["amenity"="driving_school"](area.italy);
);
out body center;
`;

function pickCity(tags) {
  return (
    tags?.["addr:city"] ??
    tags?.["addr:municipality"] ??
    tags?.["addr:town"] ??
    tags?.["addr:village"] ??
    ""
  );
}

function pickRegion(tags) {
  // Italian OSM uses addr:province (2-letter code, e.g. "RM", "MI")
  // addr:state is rarely used in Italy
  return tags?.["addr:province"] ?? tags?.["addr:state"] ?? "";
}

function pickPhone(tags) {
  return (
    tags?.phone ??
    tags?.["contact:phone"] ??
    tags?.tel ??
    tags?.["contact:tel"] ??
    ""
  );
}

function pickWebsite(tags) {
  return (
    tags?.website ??
    tags?.["contact:website"] ??
    tags?.url ??
    tags?.["contact:url"] ??
    ""
  );
}

async function run() {
  console.log("Querying Overpass API (nodes + ways + relations)...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "patentedigitale.it-bot/1.0",
    },
    body: `data=${encodeURIComponent(QUERY)}`,
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);

  const json = await res.json();
  const elements = json.elements ?? [];
  console.log(`Got ${elements.length} elements from Overpass`);

  const seen = new Set();
  const features = elements
    .map((el) => {
      // nodes have lat/lon directly; ways/relations have center
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) return null;

      const name = el.tags?.name ?? el.tags?.operator ?? "";
      if (!name) return null; // skip unnamed entries — no useful data

      // Deduplicate by rounded coordinate (avoids duplicate nodes/ways for same building)
      const coordKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
      if (seen.has(coordKey)) return null;
      seen.add(coordKey);

      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          name,
          city: pickCity(el.tags),
          zip: el.tags?.["addr:postcode"] ?? "",
          region: pickRegion(el.tags),
          address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
            .filter(Boolean)
            .join(" "),
          phone: pickPhone(el.tags),
          website: pickWebsite(el.tags),
        },
      };
    })
    .filter(Boolean);

  const geojson = { type: "FeatureCollection", features };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(geojson));
  console.log(`Wrote ${features.length} schools to ${OUTPUT}`);

  // Quick data quality report
  const w = (field) => features.filter((f) => f.properties[field]).length;
  console.log("\nData coverage:");
  for (const f of ["name", "city", "zip", "region", "phone", "website"]) {
    console.log(`  ${f}: ${w(f)} / ${features.length} (${Math.round(w(f) / features.length * 100)}%)`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
