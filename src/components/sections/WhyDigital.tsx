import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "../layout/SectionEyebrow";
import { Reveal } from "../motion/Reveal";

const ROWS = [
	{
		id: 1,
		image:
			"https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80",
		contain: false,
	},
	{
		id: 2,
		image:
			"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
		contain: false,
	},
	{
		id: 3,
		image: "/why-quiz-app.png",
		contain: false,
	},
	{
		id: 4,
		image:
			"https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
		contain: false,
	},
];

export function WhyDigital() {
	const { t } = useTranslation();

	return (
		<section className="py-32 md:py-48 bg-bg overflow-hidden">
			<div className="mx-auto max-w-(--container-default) px-4 lg:px-8">
				<Reveal className="text-center lg:text-start">
					<SectionEyebrow>{t("landing.whyDigital.eyebrow")}</SectionEyebrow>
					<h2 className="font-sans text-xl font-bold text-ink md:text-2xl lg:max-w-[32ch] mx-auto lg:ms-0">
						{t("landing.whyDigital.heading")}
					</h2>
				</Reveal>

				<div className="mt-20 flex flex-col gap-24 md:gap-32">
					{ROWS.map((row, index) => (
						<div
							key={row.id}
							className={cn(
								"grid items-center gap-12 lg:grid-cols-2",
								false,
							)}
						>
							<Reveal
								className={cn(
									"relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-bg-raised shadow-md md:rounded-2xl",
									index % 2 === 1 && "lg:order-2",
								)}
							>
								<img
									src={row.image}
									alt={t(`landing.whyDigital.rows.${row.id}.imageAlt`)}
									className={cn(
										"h-full w-full transition-transform duration-700 hover:scale-105",
										row.contain ? "object-contain p-6" : "object-cover",
									)}
									loading="lazy"
								/>
							</Reveal>

							<Reveal
								delay={0.1}
								className={cn(
									"flex flex-col gap-4",
									index % 2 === 1 && "lg:order-1",
								)}
							>
								<h3 className="font-sans text-lg font-bold text-ink md:text-xl">
									{t(`landing.whyDigital.rows.${row.id}.title`)}
								</h3>
								<p className="font-sans text-sm leading-relaxed text-ink-muted md:text-base max-w-[48ch]">
									{t(`landing.whyDigital.rows.${row.id}.body`)}
								</p>
							</Reveal>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
