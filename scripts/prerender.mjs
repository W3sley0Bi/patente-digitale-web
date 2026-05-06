import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");
const ssrPath = path.resolve(__dirname, "../dist-ssr");

const template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
const { render } = await import(path.join(ssrPath, "entry-server.js"));

const appHtml = render();
const html = template.replace(
	'<div id="root"></div>',
	`<div id="root">${appHtml}</div>`,
);

fs.writeFileSync(path.join(distPath, "index.html"), html);
fs.rmSync(ssrPath, { recursive: true, force: true });

console.log("✓ Prerendered index.html");
