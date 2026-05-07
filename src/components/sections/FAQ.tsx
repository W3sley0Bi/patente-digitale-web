import { Trans, useTranslation } from "react-i18next";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionEyebrow } from "../layout/SectionEyebrow";
import { Reveal } from "../motion/Reveal";

const FAQ_ITEMS = [1, 2, 4];

export function FAQ() {
	const { t } = useTranslation();

	return (
		<section id="faq" className="py-24 md:py-32">
			<div className="mx-auto max-w-(--container-default) px-4 lg:px-8">
				<div className="grid gap-16 lg:grid-cols-12">
					{/* Sticky Left Side */}
					<div className="lg:col-span-5">
						<Reveal className="lg:sticky lg:top-32">
							<SectionEyebrow>{t("landing.faq.eyebrow")}</SectionEyebrow>
							<h2 className="font-sans text-xl font-bold text-ink md:text-2xl">
								{t("landing.faq.heading")}
							</h2>
							<p className="mt-4 font-sans text-sm text-ink-muted">
								<Trans
									i18nKey="landing.faq.subline"
									components={[
										<a
											key="0"
											href="mailto:supporto@patentedigitale.it"
											className="font-medium text-brand hover:underline"
										/>,
									]}
								/>
							</p>
						</Reveal>
					</div>

					{/* Accordion Right Side */}
					<div className="lg:col-span-7">
						<Reveal delay={0.1}>
							<Accordion className="w-full space-y-4">
								{FAQ_ITEMS.map((id) => (
									<AccordionItem
										key={id}
										value={`item-${id}`}
										className=""
									>
										<AccordionTrigger>
											{t(`landing.faq.items.${id}.q`)}
										</AccordionTrigger>
										<AccordionContent>
											{t(`landing.faq.items.${id}.a`)}
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</Reveal>
					</div>
				</div>
			</div>
		</section>
	);
}
