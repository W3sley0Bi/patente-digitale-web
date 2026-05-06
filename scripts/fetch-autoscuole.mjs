import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../public/data/autoscuole.geojson");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="IT"][admin_level=2]->.italy;
node["amenity"="driving_school"](area.italy);
out body;
`;

async function run() {
  console.log("Querying Overpass API...");
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

  const features = elements
    .filter((el) => el.lat != null && el.lon != null)
    .map((el) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [el.lon, el.lat] },
      properties: {
        name: el.tags?.name ?? "",
        city: el.tags?.["addr:city"] ?? "",
        zip: el.tags?.["addr:postcode"] ?? "",
        region: el.tags?.["addr:state"] ?? "",
        address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]]
          .filter(Boolean)
          .join(" "),
        phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? "",
        website: el.tags?.website ?? el.tags?.["contact:website"] ?? "",
      },
    }));

  const geojson = { type: "FeatureCollection", features };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(geojson));
  console.log(`Wrote ${features.length} schools to ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
