import { useTranslation } from "react-i18next";
import { Reveal } from "../motion/Reveal";

// Import partner logos to ensure they are bundled correctly
import politoLogo from "@/assets/partners/polito.png";
import unitoLogo from "@/assets/partners/unito.png";
import chemnitzLogo from "@/assets/partners/chemnitz.png";
import metaLogo from "@/assets/partners/meta.png";

const LogoGoogle = () => (
	<svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
	</svg>
);

const STRATEGIC_PARTNERS = [
	{ name: "Politecnico di Torino", type: "Academic", src: politoLogo },
	{ name: "UniTo", type: "Academic", src: unitoLogo },
	{ name: "TU Chemnitz", type: "Technical University", src: chemnitzLogo },
	{ name: "Meta", type: "Technology", src: metaLogo },
	{ name: "Google", type: "Infrastructure", logo: LogoGoogle },
];

const STRATEGIC_MARQUEE = [
	...STRATEGIC_PARTNERS.map((p) => ({ ...p, id: `1-${p.name}` })),
	...STRATEGIC_PARTNERS.map((p) => ({ ...p, id: `2-${p.name}` })),
];

export function Trust() {
	const { t } = useTranslation();

	return (
		<section className="bg-brand-soft/50 overflow-hidden py-24 md:py-32">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<Reveal>
					<p className="text-center font-sans text-xs font-bold uppercase tracking-widest text-brand-ink mb-12">
						{t("landing.trust.partners.strategic")}
					</p>
				</Reveal>

				<div className="relative flex overflow-x-hidden group">
					<div className="flex animate-marquee-slow whitespace-nowrap gap-16 items-center py-4 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700 motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center">
						{STRATEGIC_MARQUEE.map((partner) => (
							<div key={partner.id} className="flex items-center gap-4">
								{partner.src ? (
									<img
										src={partner.src}
										alt={partner.name}
										className="h-8 w-auto object-contain max-w-[120px]"
									/>
								) : partner.logo ? (
									<partner.logo />
								) : (
									<div className="h-6 w-6 rounded-full bg-ink/10 flex items-center justify-center font-black text-[10px] text-ink">
										{partner.name.charAt(0)}
									</div>
								)}
								<div className="flex flex-col">
									<span className="font-sans text-base font-black tracking-tighter text-ink">
										{partner.name}
									</span>
									<span className="font-sans text-[8px] uppercase tracking-[0.2em] text-ink-faint font-bold leading-none">
										{partner.type}
									</span>
								</div>
							</div>
						))}
					</div>
					<div className="absolute inset-y-0 start-0 w-48 bg-linear-to-r from-brand-soft/50 to-transparent z-10 pointer-events-none" />
					<div className="absolute inset-y-0 end-0 w-48 bg-linear-to-l from-brand-soft/50 to-transparent z-10 pointer-events-none" />
				</div>
			</div>
		</section>
	);
}
