import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { revealVariants, staggerContainer } from "@/lib/motion";

export function Hero() {
	const { t } = useTranslation();

	return (
		<section className="relative overflow-hidden pt-28 pb-16 md:pt-44 md:pb-28">
			{/* Soft background bloom */}
			<div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-brand-soft/40 blur-[100px]" />
			<div className="absolute bottom-0 left-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-accent-soft/20 blur-[80px]" />

			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">

					{/* Text Content */}
					<motion.div
						className="lg:col-span-6"
						initial="hidden"
						animate="visible"
						variants={staggerContainer}
					>
						<motion.h1
							variants={revealVariants}
							className="font-sans text-3xl font-black leading-[1.0] tracking-tight text-ink sm:text-4xl md:text-display"
						>
							{t("landing.hero.headline.line1")}
							<br />
							<span className="relative inline-block font-serif italic text-accent px-1">
								{t("landing.hero.headline.emphasis")}
								<svg
									className="absolute -bottom-2 left-0 w-full h-3 text-accent/60"
									viewBox="0 0 100 12"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<path
										d="M2 10 C 20 2, 40 10, 60 4 C 80 2, 98 10, 98 10"
										stroke="currentColor"
										strokeWidth="3"
										fill="none"
										strokeLinecap="round"
									/>
								</svg>
							</span>{" "}
							{t("landing.hero.headline.line2")}
						</motion.h1>

						<motion.p
							variants={revealVariants}
							className="mt-6 max-w-[50ch] font-sans text-md leading-relaxed text-ink-muted md:text-lg"
						>
							{t("landing.hero.subhead")}
						</motion.p>

						<motion.div
							variants={revealVariants}
							className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
						>
							<Link to="/cerca">
								<Button
									size="lg"
									className="h-13 w-full px-7 gap-2 rounded-pill bg-brand text-white hover:bg-brand-hover shadow-cta text-base font-bold sm:w-auto"
								>
									<MapPin className="h-5 w-5" />
									{t("landing.hero.cta.primary")}
								</Button>
							</Link>
							<a href="#how-it-works">
								<Button
									variant="ghost"
									size="lg"
									className="h-13 w-full gap-2 rounded-pill text-ink-muted font-semibold hover:text-brand hover:bg-brand-soft/40 sm:w-auto"
								>
									{t("landing.hero.cta.secondary")}
									<ArrowRight className="h-4 w-4" />
								</Button>
							</a>
						</motion.div>

						<motion.div
							variants={revealVariants}
							className="mt-6 flex items-center gap-4"
						>
							<div className="flex -space-x-2">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="h-8 w-8 rounded-full border-2 border-bg bg-bg-sunken flex items-center justify-center overflow-hidden"
									>
										<img
											src={`https://images.unsplash.com/photo-${i === 1 ? "1517841905240-472988babdf9" : i === 2 ? "1438761681033-6461ffad8d80" : "1500648767791-00dcc994a43e"}?auto=format&fit=crop&w=32&q=80`}
											alt=""
											className="h-full w-full object-cover"
										/>
									</div>
								))}
							</div>
							<div className="flex flex-col">
								<p className="font-sans text-xs font-bold text-ink leading-tight">
									{t("landing.hero.trust.social")}
								</p>
								<p className="font-sans text-[10px] text-ink-faint uppercase tracking-wider">
									P.IVA: 12345678901 · Milano
								</p>
							</div>
						</motion.div>
					</motion.div>

					{/* Hero product mockup */}
					<motion.div
						className="relative hidden lg:flex lg:col-span-6 justify-end items-center"
						initial={{ opacity: 0, x: 24 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
					>
						<img
							src="/hero-map-mockup.png"
							alt={t("landing.hero.mascotAlt")}
							className="w-full max-w-[560px] object-contain drop-shadow-2xl"
							fetchPriority="high"
							loading="eager"
						/>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
