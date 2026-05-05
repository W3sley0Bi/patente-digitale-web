import { Car } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "../layout/SectionEyebrow";
import { Reveal } from "../motion/Reveal";

const STATS = [1, 2, 3, 4];
const PARTNERS = [
	"Autoscuola Sprint",
	"Guida Sicura",
	"Veloce Patenti",
	"La Moderna",
	"Drive Master",
	"4 Ruote Firenze",
	"Patente Express Roma",
	"Autoscuola Adriatica",
];

const MARQUEE_ITEMS = [
	...PARTNERS.map((p) => ({ name: p, id: `1-${p}` })),
	...PARTNERS.map((p) => ({ name: p, id: `2-${p}` })),
];

export function Trust() {
	const { t } = useTranslation();

	return (
		<section className="py-24 bg-brand-soft/50 overflow-hidden">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<Reveal className="mb-16">
					<SectionEyebrow>{t("landing.trust.eyebrow")}</SectionEyebrow>
				</Reveal>

				<div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
					{STATS.map((id, index) => (
						<Reveal key={id} delay={index * 0.1}>
							<div className="group flex flex-col gap-2 p-6 rounded-2xl bg-bg-raised border border-line hover:border-brand/40 transition-colors shadow-sm">
								<span className="font-sans text-2xl font-black tracking-tight text-brand md:text-3xl transition-transform group-hover:scale-105 inline-block">
									{t(`landing.trust.stats.${id}.number`)}
								</span>
								<div className="flex flex-col">
									<span className="font-sans text-sm font-bold text-ink">
										{t(`landing.trust.stats.${id}.caption`)}
									</span>
									<span className="font-sans text-xs text-ink-faint">
										{t(`landing.trust.stats.${id}.subCaption`)}
									</span>
								</div>
							</div>
						</Reveal>
					))}
				</div>

				<div className="mt-24 pt-12 border-t border-line">
					<Reveal>
						<div className="flex flex-col items-center gap-2 mb-8">
							<h4 className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
								{t("landing.trust.partners.title")}
							</h4>
							<p className="font-sans text-[10px] text-ink-faint uppercase tracking-wider">
								Operatore autorizzato · P.IVA 12345678901
							</p>
						</div>
					</Reveal>

					<div className="relative flex overflow-x-hidden">
						<div className="flex animate-marquee whitespace-nowrap gap-12 py-4">
							{MARQUEE_ITEMS.map((item) => (
								<div
									key={item.id}
									className="flex items-center gap-3 font-sans text-sm font-bold text-ink-muted"
								>
									<Car className="h-5 w-5 text-brand/40" />
									{item.name}
								</div>
							))}
						</div>
						{/* Gradient Mask */}
						<div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-brand-soft/50 to-transparent pointer-events-none" />
						<div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-brand-soft/50 to-transparent pointer-events-none" />
					</div>
				</div>
			</div>
		</section>
	);
}
