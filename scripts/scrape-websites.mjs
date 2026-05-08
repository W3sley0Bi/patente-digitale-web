import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.resolve(__dirname, "../public/data/autoscuole.geojson");
const PROGRESS_PATH = path.resolve(__dirname, "scrape-progress.json");

const LICENSE_CATEGORIES = [
  // Ciclomotori e moto
  "AM", "A1", "A2", "A",
  // Auto
  "B1", "B", "BE", "B96",
  // Veicoli commerciali e pesanti
  "C1", "C1E", "C", "CE",
  // Trasporto persone
  "D1", "D1E", "D", "DE",
  // Speciali / Professionali
  "KA", "KB", "CQC", "CAP", "recupero_punti"
];

const BATCH_SIZE = 1; // Sequential to avoid 429
const DELAY_MS = 3000;
const TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseMarkdown(md) {
  if (!md) return { licenses: [], prices: null };

  const licenses = new Set();
  const prices = {};

  // License Extraction
  for (const cat of LICENSE_CATEGORIES) {
    const searchCat = cat === "recupero_punti" ? "recupero punti" : cat;
    // Match cat with word boundaries, case insensitive
    const regex = new RegExp(`\\b${searchCat}\\b`, "i");
    if (regex.test(md)) {
      licenses.add(cat);
    }
  }

  // Price Extraction
  // Look for patterns: (License)? ... (Price)
  // Price pattern: €\d+, \d+€, \d+ euro
  const priceRegex = /(?:€\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:€|euro))/gi;
  
  const lines = md.split("\n");
  for (const line of lines) {
    let match;
    while ((match = priceRegex.exec(line)) !== null) {
      const priceVal = (match[1] || match[2]).replace(",", ".");
      const priceStr = `${priceVal}€`;
      
      for (const cat of LICENSE_CATEGORIES) {
        const searchCat = cat === "recupero_punti" ? "recupero punti" : cat;
        if (new RegExp(`\\b${searchCat}\\b`, "i").test(line)) {
          prices[cat] = priceStr;
        }
      }
    }
  }

  return {
    licenses: Array.from(licenses),
    prices: Object.keys(prices).length > 0 ? prices : null
  };
}

async function scrapeWithRetry(school, retries = 2) {
  const url = school.properties.website;
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(jinaUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        signal: controller.signal
      });
      
      clearTimeout(id);

      if (response.status === 429) {
        console.log(`Rate limited (429) for ${url}. Waiting 10s and retrying...`);
        await sleep(10000);
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const markdown = await response.text();
      return parseMarkdown(markdown);
    } catch (err) {
      if (i === retries) {
        console.error(`Failed to scrape ${url} after ${retries} retries: ${err.message}`);
        return null;
      }
      await sleep(2000);
    }
  }
}

async function run() {
  console.log("Loading GeoJSON...");
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  
  let progress = { done: [], failed: [] };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
  }

  const features = geojson.features;
  const toProcess = features.filter((f, index) => {
    if (index === 0) return false; // Skip Torino Centro
    if (!f.properties.website) return false;
    const id = f.properties._placeId || f.properties.name + f.properties.address;
    return !progress.done.includes(id) && !progress.failed.includes(id);
  });

  console.log(`Found ${toProcess.length} schools to process.`);

  let count = 0;
  for (const f of toProcess) {
    const id = f.properties._placeId || f.properties.name + f.properties.address;
    
    process.stdout.write(`Processing ${count + 1}/${toProcess.length}: ${f.properties.name}... `);
    const data = await scrapeWithRetry(f);
    
    if (data) {
      f.properties.licenses = data.licenses;
      f.properties.prices = data.prices;
      if (data.prices) process.stdout.write(`[Price Found!] `);
      progress.done.push(id);
      process.stdout.write(`Done.\n`);
    } else {
      progress.failed.push(id);
      process.stdout.write(`Failed.\n`);
    }
    
    count++;

    if (count % 10 === 0) {
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
      fs.writeFileSync(GEOJSON_PATH, JSON.stringify(geojson, null, 2));
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  fs.writeFileSync(GEOJSON_PATH, JSON.stringify(geojson, null, 2));
  console.log("Finished enrichment.");
}

run().catch(console.error);
