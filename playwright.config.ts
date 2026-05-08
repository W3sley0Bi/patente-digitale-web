import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	globalSetup: "./e2e/global-setup.ts",
	testDir: "./e2e",
	fullyParallel: false,
	retries: 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://localhost:5173",
		headless: false,
		slowMo: 300,
		screenshot: "only-on-failure",
		video: "off",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5173",
		reuseExistingServer: true,
		timeout: 30_000,
	},
});
