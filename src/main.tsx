import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import App from "./App.tsx";

import "./i18n/config";

// Fonts
import "@fontsource-variable/outfit";
import "@fontsource-variable/playfair-display";
import "@fontsource/jetbrains-mono";

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
