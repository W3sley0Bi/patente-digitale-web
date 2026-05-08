import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Mascot, Wordmark } from "../brand/Brand";
import { LangSwitch } from "../nav/LangSwitch";

const TikTokIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		role="img"
		aria-label="TikTok"
	>
		<title>TikTok</title>
		<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
	</svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		role="img"
		aria-label="Instagram"
	>
		<title>Instagram</title>
		<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
		<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
		<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
	</svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		role="img"
		aria-label="Facebook"
	>
		<title>Facebook</title>
		<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
	</svg>
);

export function Footer() {
	const { t } = useTranslation();

	return (
		<footer className="bg-bg-sunken pt-24 pb-12 border-t border-line">
			<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
				<div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
					{/* Column 1: Brand */}
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-3">
							<Mascot size="sm" />
							<Wordmark />
						</div>
						<p className="font-sans text-sm leading-relaxed text-ink-muted max-w-[32ch]">
							{t("landing.footer.brandDescription")}
						</p>
					</div>

					{/* Column 2: Navigate */}
					<div className="flex flex-col gap-6">
						<h4 className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
							Naviga
						</h4>
						<ul className="flex flex-col gap-4">
							{[
								{ id: "how-it-works", label: "howItWorks" },
								{ id: "faq", label: "faq" },
								{ id: "partner", label: "partners" },
								{ href: "/cerca", label: "findSchool" },
							].map((item) => (
								<li key={item.label}>
									<Link
										to={item.href || `/#${item.id}`}
										className="font-sans text-sm text-ink-muted hover:text-brand transition-colors"
									>
										{t(`landing.nav.${item.label}`)}
									</Link>
								</li>
							))}
							<li>
								<Link
									to="/login"
									className="font-sans text-sm text-ink-muted hover:text-brand transition-colors"
								>
									{t("landing.nav.signIn")}
								</Link>
							</li>
						</ul>
					</div>

					{/* Column 3: Legal */}
					<div className="flex flex-col gap-6">
						<h4 className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
							Legale
						</h4>
						<ul className="flex flex-col gap-4">
							{["privacy", "terms", "cookie"].map((item) => (
								<li key={item}>
									<a
										href={`/legal/${item}`}
										className="font-sans text-sm text-ink-muted hover:text-brand transition-colors"
									>
										{t(`landing.footer.legal.${item}`)}
									</a>
								</li>
							))}
							<li className="mt-2 border-t border-line pt-4">
								<p className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-1">
									Patentedigitale S.r.l.
								</p>
								<p className="font-sans text-xs text-ink-faint leading-relaxed">
									P.IVA: 12345678901 <br />
									Sede Legale: Via Esempio 12, 20121 Milano (MI)
								</p>
							</li>
						</ul>
					</div>

					{/* Column 4: Social & Lang */}
					<div className="flex flex-col gap-6">
						<h4 className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
							Seguici
						</h4>
						<div className="flex gap-6">
							{[
								{ Icon: InstagramIcon, href: "#instagram", label: "Instagram" },
								{ Icon: TikTokIcon, href: "#tiktok", label: "TikTok" },
								{ Icon: FacebookIcon, href: "#facebook", label: "Facebook" },
							].map(({ Icon, href, label }) => (
								<a
									key={label}
									href={href}
									className="text-ink-muted hover:text-brand transition-colors"
									aria-label={label}
								>
									<Icon className="h-6 w-6" />
								</a>
							))}
						</div>
						<div className="mt-2">
							<LangSwitch />
						</div>
					</div>
				</div>

				<div className="mt-24 pt-8 border-t border-line flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-sans text-xs text-ink-faint">
					<p>© 2026 Patentedigitale.it · Tutti i diritti riservati.</p>
					<p className="flex items-center gap-1">
						Made with <span className="text-accent">♥</span> in Italia
					</p>
				</div>
			</div>
		</footer>
	);
}
