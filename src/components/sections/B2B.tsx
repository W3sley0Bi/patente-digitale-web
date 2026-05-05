import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "../motion/Reveal";

export function B2B() {
	const { t } = useTranslation();

	return (
		<section
			id="partner"
			className="bg-ink py-24 md:py-32 relative overflow-hidden"
		>
			{/* Decorative Red Lines */}
			<div className="absolute top-0 start-0 w-full h-px bg-accent/30" />
			<div className="absolute bottom-0 start-0 w-full h-px bg-accent/30" />

			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<div className="grid items-center gap-16 lg:grid-cols-12">
					<div className="lg:col-span-7">
						<Reveal>
							<span className="font-sans text-xs font-bold uppercase tracking-widest text-accent mb-4 block">
								{t("landing.b2b.eyebrow")}
							</span>
							<h2 className="font-sans text-2xl font-black tracking-tight text-white md:text-3xl lg:max-w-[15ch]">
								{t("landing.b2b.heading")}
							</h2>
							<p className="mt-6 font-sans text-md leading-relaxed text-white/70 max-w-[56ch] md:text-lg">
								{t("landing.b2b.body")}
							</p>

							<div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
								<Link to="/partner">
									<Button
										size="lg"
										className="h-14 px-8 rounded-pill bg-white text-ink hover:bg-accent hover:text-white transition-all duration-300 font-bold group shadow-md"
									>
										{t("landing.b2b.cta")}
										<ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
									</Button>
								</Link>
								<a
									href="/info-dashboard"
									className="flex items-center gap-2 font-sans text-sm font-bold text-brand hover:text-brand-hover transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
								>
									{t("landing.b2b.linkSecondary")}
								</a>
							</div>
						</Reveal>
					</div>

					<div className="lg:col-span-5 hidden lg:block">
						<Reveal
							delay={0.2}
							className="flex items-center justify-center"
						>
							<img
								src="/quiz-badge.png"
								alt="Patentedigitale.it — quiz ufficiale"
								className="w-72 h-72 object-contain drop-shadow-2xl"
								loading="lazy"
							/>
						</Reveal>
					</div>
				</div>
			</div>
		</section>
	);
}
