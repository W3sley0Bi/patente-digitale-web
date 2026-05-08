import { config } from "dotenv";
import { resolve } from "node:path";

export default function globalSetup() {
	config({ path: resolve(process.cwd(), ".env.local") });
}
