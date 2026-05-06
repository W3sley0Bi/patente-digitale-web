/// <reference types="vitest" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: [],
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("framer-motion")) return "vendor-motion";
					if (id.includes("embla-carousel")) return "vendor-carousel";
					if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
					if (id.includes("leaflet") || id.includes("react-leaflet")) return "vendor-map";
					if (id.includes("fuse.js")) return "vendor-search";
					if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("react-router")) return "vendor-react";
				},
			},
		},
	},
});
