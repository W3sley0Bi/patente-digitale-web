import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.resolve(__dirname, "../public/data/autoscuole.geojson");
const OUTPUT_CSV = path.resolve(__dirname, "output/outreach_report_2026-05-13.csv");

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log("Generating Outreach CSV Report...");

  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error("GeoJSON not found.");
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  const features = geojson.features;

  const header = [
    "School Name",
    "City",
    "Region",
    "Website",
    "Status",
    "Email Count",
    "Primary Email",
    "All Emails"
  ];

  const rows = [header.join(",")];

  let stats = {
    total: features.length,
    withWebsite: 0,
    noWebsite: 0,
    emailsFound: 0,
    noEmailsFound: 0
  };

  for (const f of features) {
    const p = f.properties;
    const hasWebsite = !!p.website;
    if (!hasWebsite) {
      stats.noWebsite++;
      continue; // Skip schools without websites as per user request
    }

    const hasEmail = !!p.email;

    let status = "";
    let emailCount = 0;

    stats.withWebsite++;
    if (hasEmail) {
      status = "EMAIL_FOUND";
      stats.emailsFound++;
      emailCount = 1; 
    } else {
      status = "NO_EMAIL_ON_SITE";
      stats.noEmailsFound++;
    }

    const row = [
      escapeCsv(p.name),
      escapeCsv(p.city),
      escapeCsv(p.region),
      escapeCsv(p.website || ""),
      status,
      emailCount,
      escapeCsv(p.email || ""),
      escapeCsv(p.email || "") 
    ];

    rows.push(row.join(","));
  }

  fs.writeFileSync(OUTPUT_CSV, rows.join("\n"));

  console.log("\n--- CSV REPORT SUMMARY ---");
  console.log(`Total Schools: ${stats.total}`);
  console.log(`Schools without Website: ${stats.noWebsite} (${Math.round(stats.noWebsite/stats.total*100)}%)`);
  console.log(`Schools with Website: ${stats.withWebsite} (${Math.round(stats.withWebsite/stats.total*100)}%)`);
  console.log(`  - Emails Found: ${stats.emailsFound}`);
  console.log(`  - No Emails Found: ${stats.noEmailsFound}`);
  console.log(`\nReport saved to: ${OUTPUT_CSV}`);
}

main().catch(console.error);
