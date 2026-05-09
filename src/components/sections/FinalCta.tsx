import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "../motion/Reveal";
import mascotBackpack from "@/assets/mascot-backpack.png";

export function FinalCta() {
	const { t } = useTranslation();

	return (
		<section className="py-24 md:py-32 bg-brand text-white overflow-hidden relative">
			<div className="mx-auto max-w-(--container-default) px-4 lg:px-8 relative z-10">
				<Reveal className="flex flex-col items-center text-center gap-8">
					<h2 className="font-sans text-2xl font-black tracking-tight md:text-3xl max-w-[12ch]">
						{t("landing.finalCta.heading")}
					</h2>
					<p className="font-sans text-md md:text-lg opacity-80 max-w-[48ch]">
						{t("landing.finalCta.subhead")}
					</p>
					<Link to="/cerca">
						<Button
							size="lg"
							className="h-16 px-10 gap-3 rounded-pill bg-white text-brand hover:bg-white/90 font-bold text-lg shadow-lg"
						>
							<MapPin className="h-6 w-6" />
							{t("landing.finalCta.cta")}
						</Button>
					</Link>
				</Reveal>
			</div>

			{/* Decorative Mascot */}
			<div className="absolute -bottom-4 end-8 opacity-15 md:opacity-90 pointer-events-none">
				<img
					src={mascotBackpack}
					alt=""
					aria-hidden="true"
					className="h-56 w-56 md:h-72 md:w-72 drop-shadow-xl rotate-[8deg] rtl:-rotate-[8deg] rtl:-scale-x-100"
					loading="lazy"
				/>
			</div>
		</section>
	);
}
