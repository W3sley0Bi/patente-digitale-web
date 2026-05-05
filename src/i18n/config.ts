import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import it from "./locales/it.json";

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			it: { translation: it },
			en: { translation: en },
		},
		fallbackLng: "it",
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ["querystring", "localStorage", "navigator"],
			lookupQuerystring: "lang",
			lookupLocalStorage: "pd:locale",
			caches: ["localStorage"],
		},
	});

export default i18n;
