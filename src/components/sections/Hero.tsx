import { motion } from "framer-motion";
import { ArrowDown, Search, Locate, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useState } from "react";
import { revealVariants, staggerContainer } from "@/lib/motion";
import { reverseGeocode } from "@/lib/geocode";
import { getRegionForCoords } from "@/lib/italyGeo";
import nonSoloBSlogan from "@/assets/non-solo-b-slogan.png";

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
		<section className="relative flex min-h-[100dvh] items-center overflow-hidden pt-[12dvh] pb-[8dvh] bg-linear-to-b from-bg to-bg-sunken/20">
			<div className="mx-auto w-full max-w-(--container-wide) px-4 lg:px-8 relative">
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
									className="absolute left-2 flex items-center justify-center text-ink-faint hover:text-brand disabled:opacity-50 transition-colors"
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
									className="w-full bg-transparent border-none outline-none pl-6 pr-12 font-sans text-sm md:text-base text-ink placeholder:text-ink-faint h-12 md:h-13"
								/>
								<button
									type="submit"
									className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-3 md:px-4 rounded-r-full text-ink-faint hover:text-ink active:scale-95 transition-all duration-300"
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

					<motion.div variants={revealVariants} className="mt-8 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2 shadow-sm">
							<Check className="h-3.5 w-3.5 text-brand shrink-0" />
							<span className="font-sans text-xs font-medium text-ink-muted">
								{t("landing.hero.paypalBadge")}
							</span>
						</div>
					</motion.div>

					<motion.div
						variants={revealVariants}
						className="mt-6"
					>
						<a
							href="#how-it-works"
							className="group flex flex-col items-center gap-1 font-sans text-sm font-bold text-ink-muted hover:text-brand transition-colors duration-300"
						>
							<span>{t("landing.hero.cta.secondary")}</span>
							<ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1 motion-safe:animate-bounce" />
						</a>
					</motion.div>
				</motion.div>
			</div>

			{/* License Type Slogan Image - Absolute Viewport Corner */}
			<motion.div
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
				className="absolute bottom-0 right-0 pointer-events-none select-none w-[60vw] sm:w-[35vw] max-w-[240px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-[560px] z-10"
			>
				<img 
					src={nonSoloBSlogan} 
					alt={t("landing.hero.mascotNote")}
					className="w-full h-auto drop-shadow-sm opacity-95 sm:opacity-100"
				/>
			</motion.div>
		</section>
	);
}

