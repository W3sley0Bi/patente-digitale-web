import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.resolve(__dirname, "../public/data/autoscuole.geojson");
const PROGRESS_PATH = path.resolve(__dirname, "email-scrape-progress.json");
const OUTPUT_PATH = path.resolve(__dirname, "output/autoscuole-emails.json");

// Configuration
const CONCURRENCY = 2; 
const DELAY_MS = 2000;
const TIMEOUT_MS = 30000;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SUB_PATHS = ["contatti", "contatto", "contattaci", "contacts", "chi-siamo", "about", "dove-siamo", "sede"];

// Domains to ignore (tracking, social, tech providers)
const BLACKLIST_DOMAINS = [
  "sentry.io", "google.com", "facebook.com", "instagram.com", 
  "twitter.com", "wixpress.com", "example.com", "schema.org",
  "medium.com", "wp.com", "bootstrap.com", "jquery.com",
  "github.com", "apple.com", "microsoft.com", "cloudflare.com",
  "webp", "png", "jpg", "jpeg", "gif", "svg", "js", "css"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  const uniqueEmails = [...new Set(matches.map(e => e.toLowerCase()))];
  
  return uniqueEmails.filter(email => {
    const domain = email.split("@")[1];
    if (!domain) return false;
    if (BLACKLIST_DOMAINS.some(d => domain.includes(d))) return false;
    if (/\.(png|jpg|jpeg|gif|svg|webp|pdf|zip|js|css)$/.test(email)) return false;
    return true; 
  });
}

async function fetchPage(url) {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(jinaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "X-No-Cache": "true"
      },
      signal: controller.signal
    });
    clearTimeout(id);

    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (!response.ok) return null;
    
    return await response.text();
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") return null;
    throw err;
  }
}

async function scrapeEmail(school) {
  let url = school.properties.website;
  if (!url) return null;
  if (!url.startsWith("http")) url = `https://${url}`;
  if (!url.endsWith("/")) url += "/";

  const allFoundEmails = new Set();
  console.log(`  [START] ${school.properties.name} (${url})`);

  // 1. Scrape Homepage
  try {
    const homeText = await fetchPage(url);
    if (homeText) {
      extractEmails(homeText).forEach(e => allFoundEmails.add(e));
    }
  } catch (err) {
    if (err.message === "RATE_LIMIT") throw err;
    console.error(`    [HOME_ERR] ${err.message}`);
  }

  // 2. Deep Scrape: check ALL standard subpaths
  for (const path of SUB_PATHS) {
    try {
      await sleep(1000); 
      const subUrl = `${url}${path}`;
      const subText = await fetchPage(subUrl);
      if (subText) {
        const subEmails = extractEmails(subText);
        subEmails.forEach(e => allFoundEmails.add(e));
        if (subEmails.length > 0) console.log(`    [SUB] ${path}: found ${subEmails.length}`);
      }
    } catch (err) {
      if (err.message === "RATE_LIMIT") throw err;
    }
  }

  return {
    id: school.properties._placeId || school.properties.name,
    name: school.properties.name,
    website: url,
    emails: Array.from(allFoundEmails)
  };
}

async function main() {
  console.log("Starting Email Scraper (with Retry Empty)...");

  if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  }

  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  const schoolsWithWebsites = geojson.features.filter(f => f.properties.website);
  
  console.log(`Found ${schoolsWithWebsites.length} schools with websites.`);

  let progress = { done: [], results: {} };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
  }

  const toProcess = schoolsWithWebsites.filter(s => {
    const id = s.properties._placeId || s.properties.name;
    const isNew = !progress.done.includes(id);
    const isEmpty = progress.results[id] && progress.results[id].emails.length === 0;
    return isNew || isEmpty;
  });

  console.log(`Remaining to process (including empty retries): ${toProcess.length}`);

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${Math.floor(i/CONCURRENCY) + 1}/${Math.ceil(toProcess.length/CONCURRENCY)}...`);

    const results = await Promise.allSettled(batch.map(s => scrapeEmail(s)));

    for (let j = 0; j < results.length; j++) {
      const res = results[j];
      const school = batch[j];
      const id = school.properties._placeId || school.properties.name;

      if (res.status === "fulfilled" && res.value) {
        progress.results[id] = res.value;
        if (!progress.done.includes(id)) {
          progress.done.push(id);
        }
        if (res.value.emails.length > 0) {
          console.log(`  [OK] ${school.properties.name}: found ${res.value.emails.join(", ")}`);
        } else {
          console.log(`  [OK] ${school.properties.name}: still no email found`);
        }
      } else {
        const reason = res.reason?.message || "Unknown error";
        console.error(`  [FAIL] ${school.properties.name}: ${reason}`);
        if (reason === "RATE_LIMIT") {
          console.log("Rate limit reached. Sleeping for 30s...");
          await sleep(30000);
        }
      }
    }

    // Save progress after each batch
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    // Also save current results to output
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Object.values(progress.results), null, 2));

    await sleep(DELAY_MS);
  }

  console.log("Email scraping finished.");
  console.log(`Total emails found: ${Object.values(progress.results).reduce((acc, curr) => acc + curr.emails.length, 0)}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
