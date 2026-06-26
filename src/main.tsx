// Temporal global — required by @schedule-x/* (v4 uses the TC39 Temporal API).
// Must load before any calendar code runs.
import "temporal-polyfill/global";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import App from "./App.tsx";

import "./i18n/config";

// Fonts
import "@fontsource-variable/outfit";
import "@fontsource-variable/playfair-display";

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
