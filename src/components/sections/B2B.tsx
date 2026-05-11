import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "../motion/Reveal";
import managerImage from "@/assets/autoscuola-manager-image.jpg";
import verifiedBadge from "@/assets/verified-autoscuola-green.png";

export function B2B() {
	const { t } = useTranslation();

	return (
		<section
			id="partner"
			className="bg-ink py-20 md:py-32 relative overflow-hidden"
		>
			{/* Decorative Red Lines */}
			<div className="absolute top-0 start-0 w-full h-px bg-accent/30" />
			<div className="absolute bottom-0 start-0 w-full h-px bg-accent/30" />

			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
					
					{/* Image Column - First on Mobile */}
					<div className="order-first lg:order-last lg:col-span-5">
						<Reveal
							delay={0.2}
							className="relative flex items-center justify-center lg:justify-end"
						>
							<div className="relative w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[480px] mt-12 lg:mt-0">
								<div className="aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
									<img
										src={managerImage}
										alt="Autoscuola Manager Dashboard"
										className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
										loading="lazy"
									/>
								</div>
								
								{/* Verified Badge Overlay - Adjusted for Mobile first */}
								<div className="absolute -top-12 -left-12 sm:-top-16 sm:-left-16 md:-top-24 md:-left-20 lg:-top-32 lg:-left-28 w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-float z-10">
									<img
										src={verifiedBadge}
										alt="Verified Premium Member"
										className="w-full h-full object-contain"
										loading="lazy"
									/>
								</div>
							</div>
						</Reveal>
					</div>

					{/* Text Column */}
					<div className="lg:col-span-7">
						<Reveal>
							<span className="font-sans text-xs font-bold uppercase tracking-widest text-accent mb-4 block">
								{t("landing.b2b.eyebrow")}
							</span>
							<h2 className="font-sans text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl lg:max-w-[15ch] leading-tight">
								{t("landing.b2b.heading")}
							</h2>
							<p className="mt-6 font-sans text-base leading-relaxed text-white/70 max-w-[56ch] md:text-lg">
								{t("landing.b2b.body")}
							</p>

							<div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
								<Link to="/signup/driving-school" className="w-full sm:w-auto">
									<Button
										size="lg"
										className="h-14 w-full px-8 rounded-pill bg-white text-ink hover:bg-brand hover:text-white transition-all duration-300 font-bold group shadow-md"
									>
										{t("landing.b2b.cta")}
										<ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
									</Button>
								</Link>
								<a
									href="/info-dashboard"
									className="flex items-center justify-center gap-2 font-sans text-sm font-bold text-brand hover:text-brand-hover transition-colors px-4 py-3 rounded-lg hover:bg-white/5"
								>
									{t("landing.b2b.linkSecondary")}
								</a>
							</div>
						</Reveal>
					</div>
				</div>
			</div>
		</section>
	);
}
