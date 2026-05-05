import { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/nav/Nav";
import { Hero } from "@/components/sections/Hero";

// Eager load fold-adjacent sections
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyDigital } from "@/components/sections/WhyDigital";

// Lazy load deep sections
const Trust = lazy(() => import("@/components/sections/Trust").then(m => ({ default: m.Trust })));
const B2B = lazy(() => import("@/components/sections/B2B").then(m => ({ default: m.B2B })));
const FAQ = lazy(() => import("@/components/sections/FAQ").then(m => ({ default: m.FAQ })));
const Testimonials = lazy(() => import("@/components/sections/Testimonials").then(m => ({ default: m.Testimonials })));
const FinalCta = lazy(() => import("@/components/sections/FinalCta").then(m => ({ default: m.FinalCta })));

// Minimal placeholder to avoid layout shift
const SectionPlaceholder = () => <div className="min-h-[400px] w-full bg-bg" />;

export default function Landing() {
	const { i18n } = useTranslation();

	useEffect(() => {
		document.documentElement.lang = i18n.language;
	}, [i18n.language]);

	return (
		<div className="min-h-screen bg-bg text-ink selection:bg-brand/20 selection:text-brand-ink">
			<Nav />
			<main>
				<Hero />
				<div className="flex flex-col">
					<HowItWorks />
					<WhyDigital />
					<Suspense fallback={<SectionPlaceholder />}>
						<Trust />
						<B2B />
						<FAQ />
						<Testimonials />
						<FinalCta />
					</Suspense>
				</div>
			</main>
			<Footer />
		</div>
	);
}
