import { motion } from "framer-motion";
import { ArrowRight, Search, Locate, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useState } from "react";
import { revealVariants, staggerContainer } from "@/lib/motion";
import { reverseGeocode } from "@/lib/geocode";
import { getRegionForCoords } from "@/lib/italyGeo";

export function Hero() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [locating, setLocating] = useState(false);
	const [locError, setLocError] = useState(false);
	const [locOutsideItaly, setLocOutsideItaly] = useState(false);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = searchQuery.trim();
		if (!trimmed) return;
		const isZip = /^\d+$/.test(trimmed);
		navigate(isZip
			? `/cerca?zip=${encodeURIComponent(trimmed)}`
			: `/cerca?city=${encodeURIComponent(trimmed)}`
		);
	};

	function handleLocate() {
		if (!navigator.geolocation) return;
		setLocating(true);
		setLocError(false);
		setLocOutsideItaly(false);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const { latitude: lat, longitude: lng } = pos.coords;
				try {
					const { city, zip, countryCode } = await reverseGeocode(lat, lng);
					if (countryCode !== "it") {
						setLocOutsideItaly(true);
						return;
					}
					const region = getRegionForCoords(lat, lng);
					const params = new URLSearchParams();
					if (city) params.set("city", city);
					if (zip) params.set("zip", zip);
					if (region) params.set("region", region);
					navigate(`/cerca?${params.toString()}`);
				} catch {
					setLocError(true);
				} finally {
					setLocating(false);
				}
			},
			() => {
				setLocating(false);
				setLocError(true);
			},
			{ timeout: 8000 },
		);
	}

	return (
		<section className="relative overflow-hidden pt-24 pb-48 md:pt-40 md:pb-32">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
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

					{/* Search Bar */}
					<motion.div variants={revealVariants} className="mt-12 w-full max-w-[400px] relative">
						<form onSubmit={handleSearch} className="relative">
							<div className="group relative flex items-center bg-white rounded-full border border-line-strong/10 shadow-sm focus-within:border-line-strong/30 transition-all duration-300">
								<button
									type="button"
									onClick={handleLocate}
									disabled={locating}
									title={locError ? t("cerca.filters.locationError") : t("cerca.filters.locationBtn")}
									className="absolute left-3.5 flex items-center justify-center text-ink-faint hover:text-brand disabled:opacity-50 transition-colors"
								>
									{locating
										? <Loader2 className="h-4 w-4 animate-spin text-brand" />
										: <Locate className={`h-4 w-4 ${locError ? "text-accent" : ""}`} />
									}
								</button>
								<input
									type="text"
									placeholder={t("landing.hero.searchPlaceholder")}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full bg-transparent border-none outline-none pl-10 pr-12 font-sans text-sm md:text-base text-ink placeholder:text-ink-faint h-12 md:h-13"
								/>
								<button
									type="submit"
									className="absolute right-1.5 flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full text-ink-faint hover:text-ink active:scale-95 transition-all duration-300"
									aria-label={t("landing.hero.cta.primary")}
								>
									<Search className="h-5 w-5 md:h-5.5 md:w-5.5" />
								</button>
							</div>
						</form>
						{locOutsideItaly && (
							<p className="mt-2 text-center font-sans text-xs text-accent">
								{t("cerca.filters.outsideItaly")}
							</p>
						)}
					</motion.div>

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

				{/* Floating Mascot - Does not affect layout flow */}
				<motion.div
					initial={{ opacity: 0, y: 20, scale: 0.8 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
					className="pointer-events-none absolute bottom-0 right-0 flex items-end justify-end p-4 md:p-8"
				>
					<div className="relative flex flex-col items-center">
						{/* Mascot Speech Bubble */}
						<motion.div
							initial={{ opacity: 0, scale: 0.5, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							transition={{ delay: 1.8, duration: 0.5, type: "spring" }}
							className="pointer-events-auto mb-2 w-32 md:mb-4 md:w-56"
						>
							<div className="relative">
								<div className="bg-white px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-xl border border-line-strong/10 text-center">
									<p 
										className="font-sans text-[9px] md:text-sm font-bold text-ink leading-tight"
										dangerouslySetInnerHTML={{ __html: t("landing.hero.mascotNote") }}
									/>
								</div>
								{/* Speech bubble tail - Centered */}
								<div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2 w-2 md:h-3 md:w-3 rotate-45 border-r border-b border-line-strong/10 bg-white" />
							</div>
						</motion.div>

						<img
							src="/mascot-backpack.png"
							alt=""
							className="h-auto w-[100px] md:w-[180px] lg:w-[240px] object-contain drop-shadow-2xl"
							draggable={false}
						/>
					</div>
				</motion.div>
			</div>
		</section>
	);
}

