import { useTranslation } from "react-i18next";
import { Check, X, Zap } from "lucide-react";
import { SectionEyebrow } from "@/components/layout/SectionEyebrow";
import { Reveal } from "@/components/motion/Reveal";

const MODERN_POINTS = ["1", "2", "3", "4"] as const;
const TRADITIONAL_POINTS = ["1", "2", "3", "4"] as const;

export function Comparison() {
	const { t } = useTranslation();

	return (
		<section className="py-24 md:py-32 bg-bg">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<Reveal>
					<SectionEyebrow>{t("landing.comparison.eyebrow")}</SectionEyebrow>
					<h2 className="mt-3 font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-ink max-w-[24ch] leading-[1.1]">
						{t("landing.comparison.heading")}
					</h2>
				</Reveal>

				<div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
					{/* Tile 1 — accented (Patentedigitale path) */}
					<Reveal>
						<div className="relative rounded-2xl bg-brand-soft/60 border border-brand/20 p-8 md:p-10 h-full">
							<Zap className="absolute top-6 right-6 h-5 w-5 text-brand" />
							<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
								{t("landing.comparison.modern.label")}
							</span>
							<div className="mt-4 font-sans text-4xl md:text-5xl font-black text-brand leading-none">
								{t("landing.comparison.modern.duration")}
							</div>
							<ul className="mt-6 flex flex-col gap-3">
								{MODERN_POINTS.map((point) => (
									<li key={point} className="flex items-start gap-2.5">
										<Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
										<span className="font-sans text-sm leading-relaxed text-ink">
											{t(`landing.comparison.modern.points.${point}`)}
										</span>
									</li>
								))}
							</ul>
						</div>
					</Reveal>

					{/* Tile 2 — neutral (Traditional path) */}
					<Reveal delay={0.1}>
						<div className="rounded-2xl border border-line bg-bg-raised p-8 md:p-10 h-full">
							<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
								{t("landing.comparison.traditional.label")}
							</span>
							<div className="mt-4 font-sans text-4xl md:text-5xl font-black text-ink-muted leading-none">
								{t("landing.comparison.traditional.duration")}
							</div>
							<ul className="mt-6 flex flex-col gap-3">
								{TRADITIONAL_POINTS.map((point) => (
									<li key={point} className="flex items-start gap-2.5">
										<X className="h-4 w-4 text-ink-faint mt-0.5 shrink-0" />
										<span className="font-sans text-sm leading-relaxed text-ink-muted">
											{t(`landing.comparison.traditional.points.${point}`)}
										</span>
									</li>
								))}
							</ul>
						</div>
					</Reveal>
				</div>
			</div>
		</section>
	);
}
