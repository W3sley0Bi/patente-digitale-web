/**
 * count-google.mjs
 *
 * Grid sweep of Italy using Places API (New) — Text Search with pagination.
 * Saves basic data (id, name, lat, lng) to scripts/output/autoscuole-raw.json.
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=<key> node scripts/count-google.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "output/autoscuole-raw.json");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY env var");
  process.exit(1);
}

// Italy bounding box
const LAT_MIN = 36.6;
const LAT_MAX = 47.1;
const LNG_MIN = 6.6;
const LNG_MAX = 18.5;

const STEP = 0.5;      // ~28km per cell
const RADIUS_M = 35_000; // 35km radius — overlaps adjacent cells to avoid gaps
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

function buildGrid() {
  const cells = [];
  for (let lat = LAT_MIN; lat < LAT_MAX; lat += STEP) {
    for (let lng = LNG_MIN; lng < LNG_MAX; lng += STEP) {
      cells.push({ lat: +(lat + STEP / 2).toFixed(4), lng: +(lng + STEP / 2).toFixed(4) });
    }
  }
  return cells;
}

async function textSearch(lat, lng, pageToken = null) {
  const body = {
    textQuery: "autoscuola",
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: RADIUS_M,
      },
    },
    maxResultCount: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,nextPageToken",
    },
    body: JSON.stringify(body),
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

async function run() {
  const grid = buildGrid();
  console.log(`Grid cells: ${grid.length} (30km step, 35km radius)`);
  console.log(`Sweeping Italy for "autoscuola"…\n`);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const seen = new Map(); // id → { id, name, lat, lng }
  let apiCalls = 0;
  let errors = 0;

  for (let i = 0; i < grid.length; i++) {
    const { lat, lng } = grid[i];
    let pageToken = null;
    let page = 0;

    do {
      if (pageToken) await sleep(500);

      let data;
      try {
        data = await textSearch(lat, lng, pageToken);
        apiCalls++;
      } catch (err) {
        errors++;
        console.error(`\n  Cell ${i} page ${page}: ${err.message}`);
        break;
      }

      const places = data.places ?? [];
      for (const p of places) {
        if (!seen.has(p.id)) {
          seen.set(p.id, {
            id: p.id,
            name: p.displayName?.text ?? "",
            lat: p.location?.latitude ?? null,
            lng: p.location?.longitude ?? null,
          });
        }
      }

      pageToken = data.nextPageToken ?? null;
      page++;

      if (page >= 5) break;
    } while (pageToken);

    if ((i + 1) % 5 === 0 || i === grid.length - 1) {
      process.stdout.write(
        `\rCell ${i + 1}/${grid.length} | unique schools: ${seen.size} | API calls: ${apiCalls}`
      );
    }
  }

  const results = Array.from(seen.values());
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

  console.log("\n");
  console.log("=== RESULTS ===");
  console.log(`Unique autoscuole found : ${results.length}`);
  console.log(`API calls made          : ${apiCalls}`);
  console.log(`Errors                  : ${errors}`);
  console.log(`Saved to                : ${OUTPUT}`);
  console.log("");
  console.log("=== COST ESTIMATE (full enrich with Place Details) ===");
  const searchCost = (apiCalls * 0.032).toFixed(2);
  const detailCost = (results.length * 0.017).toFixed(2);
  const totalCost = (parseFloat(searchCost) + parseFloat(detailCost)).toFixed(2);
  console.log(`  This sweep (Text Search)       : $${searchCost}`);
  console.log(`  Place Details × ${results.length}         : $${detailCost}`);
  console.log(`  Total estimated                : $${totalCost}`);
  console.log("");
  console.log("Run scripts/enrich-google.mjs to fetch full details.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
