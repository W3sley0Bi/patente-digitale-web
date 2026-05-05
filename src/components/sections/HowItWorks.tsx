import { BookOpen, FileSignature, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "../layout/SectionEyebrow";
import { Reveal } from "../motion/Reveal";

const STEPS: { id: number; icon: LucideIcon }[] = [
	{ id: 1, icon: MapPin },
	{ id: 2, icon: FileSignature },
	{ id: 3, icon: BookOpen },
];

export function HowItWorks() {
	const { t } = useTranslation();

	return (
		<section id="how-it-works" className="py-24 md:py-32 bg-bg-sunken/40">
			<div className="mx-auto max-w-(--container-default) px-4 lg:px-8">
				<Reveal>
					<SectionEyebrow>{t("landing.howItWorks.eyebrow")}</SectionEyebrow>
					<h2 className="mt-3 font-sans text-xl font-black tracking-tight text-ink md:text-2xl lg:max-w-[22ch]">
						{t("landing.howItWorks.heading")}
					</h2>
				</Reveal>

				<div className="mt-16 grid gap-8 md:mt-20 md:grid-cols-3 md:gap-6">
					{STEPS.map((step, index) => {
						const Icon = step.icon;
						return (
							<Reveal
								key={step.id}
								delay={index * 0.12}
								className={
									index === 1
										? "md:translate-y-6"
										: index === 2
											? "md:translate-y-12"
											: ""
								}
							>
								<div className="flex flex-col gap-5 rounded-xl bg-bg-raised border border-line p-6 shadow-sm h-full">
									{/* Icon + number row */}
									<div className="flex items-center justify-between">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
											<Icon className="h-6 w-6" />
										</div>
										<span className="font-serif text-4xl font-black italic text-brand/15 select-none leading-none">
											0{step.id}
										</span>
									</div>

									{/* Text */}
									<div className="flex flex-col gap-2">
										<h3 className="font-sans text-base font-bold text-ink">
											{t(`landing.howItWorks.steps.${step.id}.title`)}
										</h3>
										<p className="font-sans text-sm leading-relaxed text-ink-muted">
											{t(`landing.howItWorks.steps.${step.id}.description`)}
										</p>
									</div>
								</div>
							</Reveal>
						);
					})}
				</div>
			</div>
		</section>
	);
}
