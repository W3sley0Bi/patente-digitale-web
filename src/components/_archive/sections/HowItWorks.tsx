import type { LucideIcon } from "lucide-react";
import { BookOpen, FileSignature, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/layout/SectionEyebrow";
import { Reveal } from "@/components/motion/Reveal";

const STEPS: { id: number; icon: LucideIcon; numeral: string }[] = [
	{ id: 1, icon: MapPin, numeral: "01." },
	{ id: 2, icon: FileSignature, numeral: "02." },
	{ id: 3, icon: BookOpen, numeral: "03." },
];

export function HowItWorks() {
	const { t } = useTranslation();

	return (
		<section id="how-it-works" className="scroll-mt-20 py-24 md:py-32 bg-bg">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
					{/* Left sticky header column */}
					<div className="lg:col-span-5 lg:sticky lg:top-32">
						<Reveal>
							<SectionEyebrow>{t("landing.howItWorks.eyebrow")}</SectionEyebrow>
							<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl max-w-[22ch] leading-[1.1]">
								{t("landing.howItWorks.heading")}
							</h2>
							<p className="mt-5 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
								{t("landing.howItWorks.supporting")}
							</p>
						</Reveal>
					</div>

					{/* Right ordered list column */}
					<div className="lg:col-span-7">
						<ol className="flex flex-col divide-y divide-line border-y border-line">
							{STEPS.map((step, index) => {
								const Icon = step.icon;
								return (
									<Reveal key={step.id} delay={index * 0.1}>
										<li className="py-6 flex items-start gap-5">
											{/* Numeral pill */}
											<span className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
												<span className="font-serif italic text-brand-ink text-xl font-black leading-none">
													{step.numeral}
												</span>
											</span>

											{/* Step content */}
											<div className="flex-1 min-w-0">
												<div className="flex items-start gap-3">
													<div className="flex-1">
														<h3 className="font-sans text-base font-bold text-ink md:text-lg">
															{t(`landing.howItWorks.steps.${step.id}.title`)}
														</h3>
														<p className="mt-1 font-sans text-sm leading-relaxed text-ink-muted md:text-base max-w-[52ch]">
															{t(
																`landing.howItWorks.steps.${step.id}.description`,
															)}
														</p>
													</div>
													<Icon
														className="shrink-0 mt-0.5 h-5 w-5 text-brand"
														aria-hidden="true"
													/>
												</div>
											</div>
										</li>
									</Reveal>
								);
							})}
						</ol>
					</div>
				</div>
			</div>
		</section>
	);
}
