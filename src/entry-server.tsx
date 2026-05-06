import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { Suspense } from "react";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./i18n/locales/it.json";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";
import Landing from "./routes/Landing";

// SSR-safe i18n init — no browser LanguageDetector
if (!i18next.isInitialized) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	i18next.use(initReactI18next).init({
		resources: {
			it: { translation: it },
			en: { translation: en },
			ar: { translation: ar },
		},
		lng: "it",
		fallbackLng: "it",
		interpolation: { escapeValue: false },
	} as any);
}

export function render() {
	return renderToString(
		<StaticRouter location="/">
			<Suspense fallback="">
				<Landing />
			</Suspense>
		</StaticRouter>,
	);
}
