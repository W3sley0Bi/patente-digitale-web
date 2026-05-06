import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "../layout/SectionEyebrow";
import { Reveal } from "../motion/Reveal";

const TESTIMONIALS = [
	{
		id: 1,
		image:
			"https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
	},
	{
		id: 2,
		image:
			"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
	},
	{
		id: 3,
		image:
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
	},
];

export function Testimonials() {
	const { t, i18n } = useTranslation();
	const [emblaRef] = useEmblaCarousel(
		{
			align: "start",
			loop: true,
			direction: i18n.language === "ar" ? "rtl" : "ltr",
			breakpoints: {
				"(min-width: 1024px)": { active: false },
			},
		},
		[Autoplay({ delay: 4000, stopOnInteraction: false })],
	);

	return (
		<section className="py-24 md:py-32 bg-bg overflow-hidden">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<Reveal className="mb-16">
					<SectionEyebrow>{t("landing.testimonials.eyebrow")}</SectionEyebrow>
				</Reveal>

				<div className="embla overflow-hidden" ref={emblaRef}>
					<div className="embla__container flex lg:grid lg:grid-cols-3 lg:gap-8">
						{TESTIMONIALS.map((item, index) => (
							<Reveal
								key={item.id}
								delay={index * 0.1}
								className="embla__slide flex-[0_0_100%] min-w-0 pe-6 lg:flex-auto lg:pe-0"
							>
								<div className="flex flex-col gap-8 h-full bg-bg-raised p-8 rounded-xl border border-line">
									<blockquote className="font-serif text-md italic leading-relaxed text-ink md:text-lg">
										"{t(`landing.testimonials.items.${item.id}.quote`)}"
									</blockquote>

									<div className="flex items-center gap-4 mt-auto">
										<div className="h-12 w-12 overflow-hidden rounded-md border border-line">
											<img
												src={item.image}
												alt={t(`landing.testimonials.items.${item.id}.name`)}
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										</div>
										<div className="flex flex-col">
											<cite className="font-sans text-sm font-bold not-italic text-ink">
												{t(`landing.testimonials.items.${item.id}.name`)}
											</cite>
										</div>
									</div>
								</div>
							</Reveal>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
