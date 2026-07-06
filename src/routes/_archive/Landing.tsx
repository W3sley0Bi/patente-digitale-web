import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Comparison } from "@/components/_archive/sections/Comparison";
import { Hero } from "@/components/_archive/sections/Hero";
// Eager load fold-adjacent sections
import { HowItWorks } from "@/components/_archive/sections/HowItWorks";
import { Trust } from "@/components/_archive/sections/Trust";
import { WhyDigital } from "@/components/_archive/sections/WhyDigital";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/nav/Nav";

// Lazy load deep sections
const B2B = lazy(() =>
	import("@/components/_archive/sections/B2B").then((m) => ({
		default: m.B2B,
	})),
);
const FAQ = lazy(() =>
	import("@/components/_archive/sections/FAQ").then((m) => ({
		default: m.FAQ,
	})),
);
const Testimonials = lazy(() =>
	import("@/components/_archive/sections/Testimonials").then((m) => ({
		default: m.Testimonials,
	})),
);
const FinalCta = lazy(() =>
	import("@/components/_archive/sections/FinalCta").then((m) => ({
		default: m.FinalCta,
	})),
);

// Minimal placeholder to avoid layout shift
const SectionPlaceholder = () => <div className="min-h-[400px] w-full bg-bg" />;

export default function Landing() {
	const { i18n } = useTranslation();

	useEffect(() => {
		document.documentElement.lang = i18n.language;
		document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
	}, [i18n.language]);

	return (
		<div className="min-h-screen bg-bg text-ink selection:bg-brand/20 selection:text-brand-ink">
			<Nav />
			<main>
				<Hero />
				<div className="flex flex-col">
					<HowItWorks />
					<WhyDigital />
					<Comparison />
					<Suspense fallback={<SectionPlaceholder />}>
						<Trust />
						<FAQ />
						<B2B />
						<Testimonials />
						<FinalCta />
					</Suspense>
				</div>
			</main>
			<Footer />
		</div>
	);
}
