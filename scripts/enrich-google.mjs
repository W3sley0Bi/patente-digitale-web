/**
 * enrich-google.mjs
 *
 * Fetches Place Details (New) for every school in autoscuole-raw.json.
 * Writes enriched GeoJSON to public/data/autoscuole.geojson.
 * Saves progress every 100 schools — resumable if interrupted.
 *
 * New fields vs v1: rating, userRatingCount, regularOpeningHours,
 *                   businessStatus, googleMapsUri
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=<key> node scripts/enrich-google.mjs
 *
 * Estimated cost: ~$91 (Place Details × 4847 @ $17/1000, Advanced tier)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW      = path.resolve(__dirname, "output/autoscuole-raw.json");
const PROGRESS = path.resolve(__dirname, "output/autoscuole-progress.json");
const OUTPUT   = path.resolve(__dirname, "../public/data/autoscuole.geojson");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY env var");
  process.exit(1);
}

const FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "formattedAddress",
  "addressComponents",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "businessStatus",
  "googleMapsUri",
].join(",");

// Fake partner — always prepended to the final GeoJSON
const PARTNER_SCHOOL = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [7.6769, 45.0703] },
  properties: {
    name: "Autoscuola Torino Centro",
    city: "Torino",
    zip: "10121",
    region: "Piemonte",
    address: "Via Roma, 123, 10121 Torino TO, Italy",
    phone: "+39 011 123 4567",
    website: "https://www.autoscuolatorino.it",
    partner: true,
    rating: 4.8,
    userRatingCount: 124,
    businessStatus: "OPERATIONAL",
    googleMapsUri: "",
    openingHours: [
      "Lunedì: 9:00–19:00",
      "Martedì: 9:00–19:00",
      "Mercoledì: 9:00–19:00",
      "Giovedì: 9:00–19:00",
      "Venerdì: 9:00–19:00",
      "Sabato: 9:00–13:00",
      "Domenica: Chiuso",
    ],
  },
};

function getComponent(components, type) {
  return components?.find((c) => c.types?.includes(type))?.longText ?? "";
}

async function fetchDetails(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toFeature(raw, details) {
  const comps = details.addressComponents ?? [];
  const city =
    getComponent(comps, "locality") ||
    getComponent(comps, "sublocality") ||
    getComponent(comps, "administrative_area_level_3");
  const zip    = getComponent(comps, "postal_code");
  const region = getComponent(comps, "administrative_area_level_1");
  const lat    = details.location?.latitude  ?? raw.lat;
  const lng    = details.location?.longitude ?? raw.lng;
  const address = details.formattedAddress ?? "";

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      _placeId: raw.id, // used for resume deduplication
      name: details.displayName?.text ?? raw.name,
      city,
      zip,
      region,
      address,
      phone:           details.nationalPhoneNumber ?? "",
      website:         details.websiteUri         ?? "",
      rating:          details.rating             ?? null,
      userRatingCount: details.userRatingCount    ?? null,
      businessStatus:  details.businessStatus     ?? "",
      googleMapsUri:   details.googleMapsUri      ?? "",
      openingHours:    details.regularOpeningHours?.weekdayDescriptions ?? [],
    },
  };
}

function isInItaly(feature) {
  return feature.properties.address.includes("Italy");
}

function saveGeoJSON(features) {
  const italian = features.filter(isInItaly);
  const withPartner = [PARTNER_SCHOOL, ...italian];
  fs.writeFileSync(OUTPUT, JSON.stringify({ type: "FeatureCollection", features: withPartner }));
  return italian.length;
}

async function run() {
  const raw = JSON.parse(fs.readFileSync(RAW));
  console.log(`Loaded ${raw.length} schools from raw file`);

  // Delete stale progress if schema changed (presence of openingHours field marks new schema)
  if (fs.existsSync(PROGRESS)) {
    const saved = JSON.parse(fs.readFileSync(PROGRESS));
    const hasNewSchema = saved[0]?.properties?.openingHours !== undefined;
    if (!hasNewSchema) {
      console.log("Stale progress file (old schema) — deleting, starting fresh");
      fs.unlinkSync(PROGRESS);
    }
  }

  // Load progress if resuming
  let done = new Map();
  if (fs.existsSync(PROGRESS)) {
    const saved = JSON.parse(fs.readFileSync(PROGRESS));
    done = new Map(saved.map((f) => [f.properties?._placeId ?? "", f]));
    console.log(`Resuming — ${done.size} already done`);
  }

  const features = [];
  let errors = 0;
  let apiCalls = 0;

  for (let i = 0; i < raw.length; i++) {
    const school = raw[i];

    if (done.has(school.id)) {
      features.push(done.get(school.id));
      continue;
    }

    let details;
    try {
      details = await fetchDetails(school.id);
      apiCalls++;
    } catch (err) {
      errors++;
      console.error(`\n  [${i}] ${school.name}: ${err.message}`);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [school.lng, school.lat] },
        properties: {
          _placeId: school.id,
          name: school.name,
          city: "", zip: "", region: "", address: "",
          phone: "", website: "",
          rating: null, userRatingCount: null,
          businessStatus: "", googleMapsUri: "", openingHours: [],
        },
      });
      continue;
    }

    features.push(toFeature(school, details));

    // Save progress every 100 schools
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(PROGRESS, JSON.stringify(features));
      const italian = saveGeoJSON(features);
      process.stdout.write(
        `\r[${i + 1}/${raw.length}] done | Italian: ${italian} | API calls: ${apiCalls} | errors: ${errors}`
      );
    }

    await sleep(50); // ~20 req/s
  }

  const italianCount = saveGeoJSON(features);
  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);

  console.log("\n");
  console.log("=== DONE ===");
  console.log(`Total fetched    : ${features.length}`);
  console.log(`Italian schools  : ${italianCount}`);
  console.log(`API calls made   : ${apiCalls}`);
  console.log(`Errors           : ${errors}`);
  console.log(`Written to       : ${OUTPUT}`);

  const italian = features.filter(isInItaly);
  const w = (field) => italian.filter((f) => f.properties[field]).length;
  console.log("\nData coverage (Italian schools):");
  for (const f of ["city", "zip", "phone", "website", "rating", "openingHours"]) {
    console.log(`  ${f}: ${w(f)} / ${italian.length} (${Math.round((w(f) / italian.length) * 100)}%)`);
  }

  const cost = (apiCalls * 0.017).toFixed(2);
  console.log(`\nEstimated cost: $${cost}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
