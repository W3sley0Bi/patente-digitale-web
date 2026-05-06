import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useState } from "react";
import { revealVariants, staggerContainer } from "@/lib/motion";

export function Hero() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate(`/cerca?q=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<section className="relative overflow-hidden pt-28 pb-16 md:pt-44 md:pb-28">
			{/* Soft background bloom */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-full max-w-[900px] rounded-full bg-brand-soft/10 blur-[120px]" />
			
			<div className="mx-auto max-w-(--container-wide) px-6 lg:px-8">
				<motion.div
					className="flex flex-col items-center text-center"
					initial="hidden"
					animate="visible"
					variants={staggerContainer}
				>
					<motion.h1
						variants={revealVariants}
						className="max-w-[15ch] font-sans text-4xl font-black leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl"
					>
						<span className="relative inline-block px-4">
							<span className="relative z-10 text-white">{t("landing.hero.headline.line1")}</span>
							<motion.div 
								initial={{ scaleX: 0, opacity: 0 }}
								animate={{ scaleX: 1, opacity: 1 }}
								transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
								className="absolute inset-0 bg-brand-ink z-0"
								style={{
									clipPath: "polygon(2% 5%, 98% 1%, 100% 95%, 4% 100%)",
									transform: "skew(-2deg)",
								}}
							/>
							<motion.div 
								initial={{ scaleX: 0, opacity: 0 }}
								animate={{ scaleX: 1, opacity: 1 }}
								transition={{ delay: 0.6, duration: 0.3, ease: "easeOut" }}
								className="absolute inset-0 bg-brand/40 -z-10"
								style={{
									clipPath: "polygon(0% 15%, 100% 10%, 95% 90%, 5% 85%)",
									transform: "translate(4px, 4px) skew(1deg)",
								}}
							/>
						</span>{" "}
						<br className="sm:hidden" />
						<span className="relative inline-block font-serif italic text-accent px-1">
							<span className="relative z-10">{t("landing.hero.headline.emphasis")}</span>
							<svg
								className="absolute -bottom-1.5 left-0 w-full h-2.5 text-accent/60"
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
						className="mt-8 max-w-[42ch] font-sans text-base leading-relaxed text-ink-muted md:text-xl md:leading-relaxed"
					>
						{t("landing.hero.subhead")}
					</motion.p>

					{/* Elegant Minimalist Search Bar */}
					<motion.form
						variants={revealVariants}
						onSubmit={handleSearch}
						className="mt-12 w-full max-w-[400px] relative"
					>
						<div className="group relative flex items-center bg-white rounded-full border border-line-strong/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] focus-within:border-brand/30 focus-within:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1),0_10px_25px_-5px_rgba(0,0,0,0.08)] transition-all duration-500">
							<input
								type="text"
								placeholder={t("landing.hero.searchPlaceholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full bg-transparent border-none outline-none pl-6 pr-12 font-sans text-sm md:text-base text-ink placeholder:text-ink-faint h-12 md:h-13"
							/>
							<button
								type="submit"
								className="absolute right-1.5 flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full text-ink-faint hover:text-brand hover:bg-brand-soft/40 active:scale-90 transition-all duration-300"
								aria-label={t("landing.hero.cta.primary")}
							>
								<Search className="h-5 w-5 md:h-5.5 md:w-5.5" />
							</button>
						</div>
					</motion.form>

					<motion.div
						variants={revealVariants}
						className="mt-12"
					>
						<a 
							href="#how-it-works"
							className="group flex items-center gap-2 font-sans text-sm font-bold text-ink-muted hover:text-brand transition-colors duration-300"
						>
							{t("landing.hero.cta.secondary")}
							<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
						</a>
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}

