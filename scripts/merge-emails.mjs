import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAILS_PATH = path.resolve(__dirname, "output/autoscuole-emails.json");
const GEOJSON_PATH = path.resolve(__dirname, "../public/data/autoscuole.geojson");

async function main() {
  if (!fs.existsSync(EMAILS_PATH)) {
    console.error(`Emails file not found: ${EMAILS_PATH}`);
    process.exit(1);
  }

  const emailData = JSON.parse(fs.readFileSync(EMAILS_PATH, "utf8"));
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));

  const emailMap = new Map(emailData.map(e => [e.id, e.emails]));
  
  let patched = 0;
  let totalEmails = 0;

  geojson.features = geojson.features.map(feature => {
    const id = feature.properties._placeId || feature.properties.name;
    const emails = emailMap.get(id);

    if (emails && emails.length > 0) {
      // Prioritize "info@", "segreteria@", "amministrazione@"
      const prioritized = emails.sort((a, b) => {
        const keywords = ["info@", "segreteria@", "amministrazione@", "contatti@"];
        const aScore = keywords.findIndex(k => a.includes(k));
        const bScore = keywords.findIndex(k => b.includes(k));
        if (aScore !== -1 && bScore === -1) return -1;
        if (aScore === -1 && bScore !== -1) return 1;
        if (aScore !== -1 && bScore !== -1) return aScore - bScore;
        return 0;
      });

      feature.properties.email = prioritized[0];
      patched++;
      totalEmails += emails.length;
    }

    return feature;
  });

  fs.writeFileSync(GEOJSON_PATH, JSON.stringify(geojson, null, 2));
  console.log(`Merged emails into ${patched} schools.`);
  console.log(`Updated ${GEOJSON_PATH}`);
}

main().catch(console.error);
