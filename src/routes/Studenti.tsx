import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { MapPin, Check, ArrowDown, Camera, ScanLine, BadgeCheck, Star } from "lucide-react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/layout/Footer";
import { SectionEyebrow } from "@/components/layout/SectionEyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

const PayPalLogo = ({ className = "h-5 w-auto" }: { className?: string }) => (
	<svg viewBox="0 0 101 32" className={className} aria-label="PayPal" role="img">
		<title>PayPal</title>
		<path
			fill="#253B80"
			d="M12.237 2.8H4.437c-.55 0-1.01.4-1.1.94L.337 27.16c-.06.4.24.77.65.77h3.85c.55 0 1.01-.4 1.1-.94l.81-5.14c.09-.54.55-.94 1.1-.94h2.53c5.26 0 8.29-2.55 9.09-7.6.36-2.21.01-3.94-1.03-5.16-1.15-1.33-3.19-2.03-5.24-2.03l-.01-.27z"
		/>
		<path
			fill="#179BD7"
			d="M13.3 10.58c-.08.53-.25 1.02-.52 1.46-.86 1.42-2.52 2.14-4.73 2.14H6.71c-.55 0-1.01.4-1.1.94l-1.17 7.44c-.05.32.19.62.52.62h3.64c.48 0 .89-.35.97-.82l.04-.2.77-4.88.05-.27c.08-.47.49-.82.97-.82h.61c3.96 0 7.06-1.61 7.96-6.26.38-1.95.18-3.57-.82-4.71-.3-.34-.68-.63-1.1-.87l.26 5.23z"
		/>
	</svg>
);

function SchoolCardMock() {
	const { t } = useTranslation();
	const tiers = ["essential", "complete", "plus"] as const;
	return (
		<div className="rounded-2xl border border-line bg-bg-raised shadow-lg overflow-hidden">
			{/* Window chrome */}
			<div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-bg-sunken/40">
				<div className="flex gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
				</div>
				<div className="ml-3 flex-1 rounded-md bg-bg border border-line px-3 py-1 font-sans text-xs text-ink-faint truncate">
					{t("studenti.bundles.mock.url")}
				</div>
			</div>

			{/* Content */}
			<div className="p-6 md:p-8">
				{/* School header */}
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h3 className="font-sans text-xl font-black text-ink">
							{t("studenti.bundles.mock.schoolName")}
						</h3>
						<p className="mt-1 font-sans text-sm text-ink-muted flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5 text-ink-faint" />
							{t("studenti.bundles.mock.location")}
						</p>
					</div>
					<div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1">
						<BadgeCheck className="h-3.5 w-3.5 text-brand" />
						<span className="font-sans text-xs font-bold text-brand-ink">
							{t("studenti.bundles.mock.verified")}
						</span>
					</div>
				</div>

				{/* Bundle section */}
				<div className="mt-8">
					<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
						{t("studenti.bundles.mock.sectionTitle")}
					</span>
					<div className="mt-4 grid gap-4 md:grid-cols-3 md:items-stretch">
						{tiers.map((tier) => {
							const isPopular = tier === "complete";
							return (
								<div
									key={tier}
									className={
										isPopular
											? "relative rounded-2xl bg-brand-soft border-2 border-brand p-5 md:p-6 md:-my-2 md:py-7 shadow-md flex flex-col"
											: "relative rounded-2xl border border-line bg-bg p-5 md:p-6 flex flex-col"
									}
								>
									{isPopular && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-brand text-white px-3 py-1 shadow-sm">
											<Star className="h-3 w-3 fill-current" />
											<span className="font-sans text-[10px] font-black uppercase tracking-widest">
												{t("studenti.bundles.mock.popularBadge")}
											</span>
										</div>
									)}
									<div>
										<h4
											className={
												isPopular
													? "font-sans text-base font-black text-brand-ink"
													: "font-sans text-base font-bold text-ink"
											}
										>
											{t(`studenti.bundles.mock.tiers.${tier}.name`)}
										</h4>
										<div
											className={
												isPopular
													? "mt-2 font-sans text-3xl font-black text-brand leading-none"
													: "mt-2 font-sans text-2xl font-black text-ink leading-none"
											}
										>
											{t(`studenti.bundles.mock.tiers.${tier}.price`)}
										</div>
									</div>
									<ul className="mt-5 flex flex-col gap-2.5 flex-1">
										{(["1", "2", "3", "4"] as const).map((f) => (
											<li key={f} className="flex items-start gap-2">
												<Check
													className={
														isPopular
															? "h-4 w-4 text-brand mt-0.5 shrink-0"
															: "h-4 w-4 text-ink-faint mt-0.5 shrink-0"
													}
												/>
												<span className="font-sans text-xs leading-relaxed text-ink-muted">
													{t(`studenti.bundles.mock.tiers.${tier}.features.${f}`)}
												</span>
											</li>
										))}
									</ul>
									<button
										type="button"
										className={
											isPopular
												? "mt-6 w-full rounded-pill bg-brand text-white font-sans text-sm font-bold py-2.5 pointer-events-none"
												: "mt-6 w-full rounded-pill border border-line bg-bg-raised text-ink font-sans text-sm font-bold py-2.5 pointer-events-none"
										}
									>
										{t("studenti.bundles.mock.ctaLabel")}
									</button>
								</div>
							);
						})}
					</div>

					{/* PayPal mention */}
					<div className="mt-6 flex items-center gap-2 text-xs text-ink-muted">
						<Check className="h-3.5 w-3.5 text-brand shrink-0" />
						<span>{t("studenti.bundles.mock.paypalNote")}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Studenti() {
	const { t } = useTranslation();

	const onlineSteps = [1, 2, 3] as const;
	const inPersonSteps = [1, 2, 3, 4] as const;

	return (
		<div className="min-h-screen bg-bg text-ink">
			<Nav />
			<main>
				{/* HERO — editorial, two-line headline with brand emphasis on second line */}
				<section className="relative flex items-center min-h-[100dvh] pt-[14dvh] pb-[10dvh] bg-linear-to-b from-brand-soft/30 via-bg to-bg overflow-hidden">
					<div className="mx-auto w-full max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid items-start gap-12 lg:grid-cols-12">
							<Reveal className="lg:col-span-8">
								<SectionEyebrow>{t("studenti.hero.eyebrow")}</SectionEyebrow>
								<h1 className="mt-4 font-sans text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
									<span className="block text-ink">{t("studenti.hero.headline_part1")}</span>
									<span className="block text-brand mt-2">
										{t("studenti.hero.headline_part2")}
									</span>
								</h1>
								<p className="mt-8 max-w-[52ch] font-sans text-base leading-relaxed text-ink-muted md:text-lg">
									{t("studenti.hero.subhead")}
								</p>

								<div className="mt-10">
									<Link to="/search">
										<Button size="lg" className="h-14 px-8 rounded-pill font-bold text-base gap-2">
											<MapPin className="h-5 w-5" />
											{t("studenti.hero.cta")}
										</Button>
									</Link>
								</div>
							</Reveal>

							{/* PayPal callout — vertical card, not centered */}
							<Reveal delay={0.15} className="lg:col-span-4">
								<div className="rounded-2xl border border-line bg-bg-raised p-6 shadow-sm">
									<div className="flex items-center gap-2">
										<Check className="h-4 w-4 text-brand" />
										<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
											{t("studenti.hero.paypalBadge")}
										</span>
									</div>
									<div className="mt-4 flex items-center gap-3">
										<PayPalLogo className="h-7 w-auto" />
										<span className="font-sans text-2xl font-black text-ink">3 rate</span>
									</div>
									<p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
										{t("studenti.hero.paypalNote")}
									</p>
								</div>
							</Reveal>
						</div>
					</div>

					{/* Scroll cue — absolute bottom-center */}
					<a
						href="#come-funziona"
						className="group absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 font-sans text-xs font-bold text-ink-muted hover:text-brand transition-colors"
					>
						<span className="uppercase tracking-widest">{t("studenti.hero.ctaSecondary")}</span>
						<ArrowDown className="h-4 w-4 motion-safe:animate-bounce group-hover:text-brand" />
					</a>
				</section>

				{/* FLOW — split column: online vs in-person. NOT a card grid. */}
				<section id="come-funziona" className="scroll-mt-20 py-24 md:py-32 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<Reveal>
							<SectionEyebrow>{t("studenti.flow.eyebrow")}</SectionEyebrow>
							<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl whitespace-pre-line max-w-[28ch]">
								{t("studenti.flow.heading")}
							</h2>
						</Reveal>

						<div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20 relative">
							{/* Online column */}
							<Reveal>
								<div className="rounded-2xl bg-brand-soft/40 p-8 md:p-10 h-full">
									<div className="flex items-center justify-between">
										<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
											{t("studenti.flow.online.label")}
										</span>
										<span className="font-serif italic text-brand/30 text-3xl font-black leading-none">
											tu
										</span>
									</div>
									<ol className="mt-8 flex flex-col gap-5">
										{onlineSteps.map((id) => (
											<li key={id} className="flex items-start gap-4">
												<span className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white font-sans text-sm font-black">
													{id}
												</span>
												<span className="font-sans text-base leading-relaxed text-ink">
													{t(`studenti.flow.online.items.${id}`)}
												</span>
											</li>
										))}
									</ol>
								</div>
							</Reveal>

							{/* Connector arrow (mobile + desktop) */}
							<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised border border-line shadow-md z-10">
								<ArrowDown className="h-5 w-5 text-ink-muted -rotate-90" />
							</div>

							{/* In-person column */}
							<Reveal delay={0.15}>
								<div className="rounded-2xl border border-line bg-bg-raised p-8 md:p-10 h-full">
									<div className="flex items-center justify-between">
										<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
											{t("studenti.flow.inperson.label")}
										</span>
										<span className="font-serif italic text-ink-faint/40 text-3xl font-black leading-none">
											loro
										</span>
									</div>
									<ol className="mt-8 flex flex-col gap-5">
										{inPersonSteps.map((id) => (
											<li key={id} className="flex items-start gap-4">
												<span className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg text-ink-muted font-sans text-sm font-black">
													{id}
												</span>
												<span className="font-sans text-base leading-relaxed text-ink">
													{t(`studenti.flow.inperson.items.${id}`)}
												</span>
											</li>
										))}
									</ol>
								</div>
							</Reveal>
						</div>
					</div>
				</section>

				{/* BUNDLES — SaaS-style pricing tier preview, illustrative */}
				<section className="py-24 md:py-32 bg-bg">
					<div className="mx-auto w-full max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
							<Reveal className="lg:col-span-5 lg:sticky lg:top-32">
								<SectionEyebrow>{t("studenti.bundles.eyebrow")}</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl whitespace-pre-line max-w-[22ch] leading-[1.1]">
									{t("studenti.bundles.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("studenti.bundles.body")}
								</p>
								<p className="mt-6 font-sans text-xs leading-relaxed text-ink-faint max-w-[40ch] flex items-start gap-2">
									<span className="inline-block w-1 h-1 rounded-full bg-ink-faint mt-2 shrink-0" />
									{t("studenti.bundles.note")}
								</p>
							</Reveal>
							<Reveal delay={0.15} className="lg:col-span-7">
								<SchoolCardMock />
							</Reveal>
						</div>
					</div>
				</section>

				{/* DOCS BONUS — advertise camera/scan upload feature */}
				<section className="py-24 md:py-32 bg-bg-sunken/30">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="lg:col-span-5">
								<div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-5">
									<span className="font-sans text-xs font-black uppercase tracking-widest text-accent-ink">
										{t("studenti.docs.eyebrow")}
									</span>
								</div>
								<h2 className="font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl whitespace-pre-line max-w-[20ch] leading-[1.1]">
									{t("studenti.docs.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("studenti.docs.body")}
								</p>
								<p className="mt-6 font-sans text-xs leading-relaxed text-ink-faint max-w-[40ch] flex items-start gap-2">
									<span className="inline-block w-1 h-1 rounded-full bg-ink-faint mt-2 shrink-0" />
									{t("studenti.docs.note")}
								</p>
							</Reveal>

							<Reveal delay={0.1} className="lg:col-span-7">
								<ul className="flex flex-col divide-y divide-line border-y border-line">
									{([1, 2, 3, 4] as const).map((id) => {
										const Icon = id === 1 ? Camera : ScanLine;
										return (
											<li key={id} className="flex items-start gap-5 py-6">
												<div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
													<Icon className="h-5 w-5" />
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="font-sans text-base font-bold text-ink">
														{t(`studenti.docs.items.${id}.title`)}
													</h3>
													<p className="mt-1 font-sans text-sm text-ink-muted">
														{t(`studenti.docs.items.${id}.body`)}
													</p>
												</div>
											</li>
										);
									})}
								</ul>
							</Reveal>
						</div>
					</div>
				</section>

				{/* PAYPAL — visual rate bars */}
				<section className="py-24 md:py-32 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="lg:col-span-5">
								<SectionEyebrow>{t("studenti.paypal.eyebrow")}</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl">
									{t("studenti.paypal.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("studenti.paypal.body")}
								</p>
								<p className="mt-6 font-sans text-xs leading-relaxed text-ink-faint max-w-[40ch] flex items-start gap-2">
									<span className="inline-block w-1 h-1 rounded-full bg-ink-faint mt-2 shrink-0" />
									{t("studenti.paypal.caveat")}
								</p>
							</Reveal>

							<Reveal delay={0.1} className="lg:col-span-7">
								<div className="rounded-2xl bg-bg-raised border border-line p-8 md:p-10 shadow-md">
									<PayPalLogo className="h-7 w-auto" />
									<div className="mt-8 flex flex-col gap-5">
										{[1, 2, 3].map((n) => (
											<div key={n} className="flex items-center gap-5">
												<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-sans text-base font-black text-brand-ink">
													{n}
												</div>
												<div className="flex-1 flex flex-col gap-2">
													<div className="flex items-baseline justify-between gap-3">
														<span className="font-sans text-sm font-bold text-ink">
															{t("studenti.paypal.rateLabel")} {n}
														</span>
														{n === 1 ? (
															<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand">
																oggi
															</span>
														) : (
															<span className="font-sans text-xs text-ink-muted">
																+ {n - 1} {n - 1 === 1 ? "mese" : "mesi"}
															</span>
														)}
													</div>
													<div className="h-2 bg-line rounded-full overflow-hidden">
														<div
															className="h-full bg-brand"
															style={{ width: n === 1 ? "100%" : n === 2 ? "100%" : "100%" }}
														/>
													</div>
												</div>
											</div>
										))}
									</div>
									<div className="mt-8 flex items-center gap-2 pt-6 border-t border-line">
										<Check className="h-4 w-4 text-brand" />
										<span className="font-sans text-xs text-ink-muted">
											Zero interessi · Zero costi nascosti
										</span>
									</div>
								</div>
							</Reveal>
						</div>
					</div>
				</section>

				{/* FINAL CTA */}
				<section className="py-20 md:py-28 bg-brand text-white">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
							<Reveal>
								<h2 className="font-sans text-2xl font-black tracking-tight md:text-3xl max-w-[18ch]">
									{t("studenti.cta.heading")}
								</h2>
								<p className="mt-4 font-sans text-base opacity-80 max-w-[44ch]">
									{t("studenti.cta.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.1}>
								<Link to="/search">
									<Button
										size="lg"
										className="h-14 px-10 rounded-pill bg-white text-brand hover:bg-white/90 font-bold text-base gap-2 shadow-lg"
									>
										<MapPin className="h-5 w-5" />
										{t("studenti.cta.button")}
									</Button>
								</Link>
							</Reveal>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
