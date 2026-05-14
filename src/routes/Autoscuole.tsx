import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
	ArrowRight,
	ArrowDown,
	BadgeCheck,
	Download,
	Search,
	Zap,
	FileCheck,
	TrendingUp,
} from "lucide-react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/layout/Footer";
import { SectionEyebrow } from "@/components/layout/SectionEyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import verifiedBadge from "@/assets/verified-autoscuola-green.png";
import managerIcon from "@/assets/autoscuola-manager-icon.png";

function DashboardMock() {
	const { t } = useTranslation();
	return (
		<div className="rounded-2xl border border-line bg-bg-raised shadow-lg overflow-hidden">
			{/* Window chrome */}
			<div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-bg-sunken/40">
				<div className="flex gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
				</div>
				<div className="ml-3 flex-1 flex items-center gap-2 rounded-md bg-bg border border-line px-3 py-1 truncate">
					<img src={managerIcon} alt="" aria-hidden="true" className="h-4 w-4 rounded-sm object-cover shrink-0" />
					<span className="font-sans text-xs text-ink-faint truncate">
						patentedigitale.it/dashboard
					</span>
				</div>
			</div>

			{/* Dashboard content */}
			<div className="p-6 md:p-8">
				{/* Profile header */}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="font-sans text-lg font-black text-ink">
							{t("autoscuole.dashboard.mock.title")}
						</h3>
						<div className="mt-1 flex items-center gap-1.5">
							<BadgeCheck className="h-3.5 w-3.5 text-brand" />
							<span className="font-sans text-xs text-brand-ink font-bold">
								{t("autoscuole.dashboard.mock.status")}
							</span>
						</div>
					</div>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-brand transition-colors pointer-events-none"
					>
						<Download className="h-3.5 w-3.5" />
						Esporta CSV
					</button>
				</div>

				{/* Metrics */}
				<div className="mt-6">
					<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
						{t("autoscuole.dashboard.mock.metricsLabel")}
					</span>
					<div className="mt-3 grid grid-cols-2 gap-3">
						<div className="rounded-xl bg-brand-soft/60 p-4">
							<div className="font-sans text-3xl font-black text-brand-ink leading-none">
								{t("autoscuole.dashboard.mock.metric1.value")}
							</div>
							<div className="mt-2 font-sans text-xs text-ink-muted">
								{t("autoscuole.dashboard.mock.metric1.label")}
							</div>
						</div>
						<div className="rounded-xl border border-line p-4">
							<div className="font-sans text-3xl font-black text-ink leading-none">
								{t("autoscuole.dashboard.mock.metric2.value")}
							</div>
							<div className="mt-2 font-sans text-xs text-ink-muted">
								{t("autoscuole.dashboard.mock.metric2.label")}
							</div>
						</div>
					</div>
				</div>

				{/* Recent enrolments */}
				<div className="mt-6">
					<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
						{t("autoscuole.dashboard.mock.recentLabel")}
					</span>
					<ul className="mt-3 flex flex-col divide-y divide-line border border-line rounded-xl bg-bg overflow-hidden">
						{[1, 2, 3].map((i) => (
							<li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
								<div className="flex items-center gap-3 min-w-0">
									<div className="h-7 w-7 rounded-full bg-brand-soft flex items-center justify-center font-sans text-xs font-black text-brand-ink shrink-0">
										{t(`autoscuole.dashboard.mock.student${i}`).slice(0, 1)}
									</div>
									<span className="font-sans text-sm text-ink truncate">
										{t(`autoscuole.dashboard.mock.student${i}`)}
									</span>
								</div>
								<span className="font-sans text-xs text-ink-faint shrink-0">
									{t(`autoscuole.dashboard.mock.time${i}`)}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

export default function Autoscuole() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-bg text-ink">
			<Nav />
			<main>
				{/* HERO — dark, badge-led */}
				<section className="relative flex items-center min-h-[100dvh] pt-[14dvh] pb-[10dvh] bg-ink overflow-hidden">
					{/* Subtle grid */}
					<div
						className="absolute inset-0 opacity-[0.04]"
						style={{
							backgroundImage:
								"linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
							backgroundSize: "56px 56px",
						}}
					/>

					<div className="relative mx-auto w-full max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid items-center gap-12 lg:grid-cols-12">
							<Reveal className="lg:col-span-7">
								<SectionEyebrow className="text-accent">
									{t("autoscuole.hero.eyebrow")}
								</SectionEyebrow>
								<h1 className="mt-3 font-sans text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
									{t("autoscuole.hero.headline")}
								</h1>
								<p className="mt-6 font-sans text-base leading-relaxed text-white/70 max-w-[52ch] md:text-lg">
									{t("autoscuole.hero.subhead")}
								</p>
								<div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
									<Link to="/signup/driving-school">
										<Button
											size="lg"
											className="h-14 px-8 rounded-pill bg-brand text-white hover:bg-brand-hover font-bold gap-2 shadow-cta"
										>
											{t("autoscuole.hero.cta")}
											<ArrowRight className="h-4 w-4" />
										</Button>
									</Link>
									<Link
										to="/search"
										className="flex items-center justify-center gap-2 font-sans text-sm font-bold text-white/70 hover:text-white transition-colors px-4 py-3"
									>
										<Search className="h-4 w-4" />
										{t("autoscuole.hero.ctaSecondary")}
									</Link>
								</div>
							</Reveal>

							{/* Verified badge — branded asset */}
							<Reveal delay={0.2} className="lg:col-span-5 flex justify-center lg:justify-end">
								<div className="relative">
									<div className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 animate-float">
										<img
											src={verifiedBadge}
											alt="Profilo Verificato Patentedigitale"
											className="w-full h-full object-contain drop-shadow-2xl"
										/>
									</div>
									<div className="absolute -bottom-2 -right-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 shadow-xl">
										<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-white/60 block">
											Verifica in
										</span>
										<span className="font-sans text-xl font-black text-white leading-none mt-1 block">
											&lt; 3 minuti
										</span>
									</div>
								</div>
							</Reveal>
						</div>
					</div>

					{/* Scroll cue — absolute bottom-center */}
					<a
						href="#come-funziona"
						className="group absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 font-sans text-xs font-bold text-white/50 hover:text-white transition-colors"
					>
						<span className="uppercase tracking-widest">{t("autoscuole.hero.ctaSecondaryScroll")}</span>
						<ArrowDown className="h-4 w-4 motion-safe:animate-bounce group-hover:text-white" />
					</a>
				</section>

				{/* DASHBOARD MOCKUP — the visual proof */}
				<section id="come-funziona" className="scroll-mt-20 py-24 md:py-32 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="lg:col-span-5">
								{/* Product header — app icon + product name */}
								<div className="flex flex-col gap-2 mb-6 w-fit">
									<div className="inline-flex items-center gap-3 rounded-2xl border border-line bg-bg-raised pl-2 pr-4 py-2 shadow-sm">
										<img
											src={managerIcon}
											alt="Autoscuola Manager"
											className="h-10 w-10 rounded-xl object-cover"
										/>
										<div className="flex flex-col">
											<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint leading-none">
												App
											</span>
											<span className="font-sans text-sm font-black text-ink leading-tight mt-0.5">
												Autoscuola Manager
											</span>
										</div>
									</div>
									<div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1">
										<span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
										<span className="font-sans text-[11px] font-bold text-amber-700 uppercase tracking-wider">
											Mobile &amp; Desktop — In Testing
										</span>
									</div>
								</div>
								<SectionEyebrow>{t("autoscuole.dashboard.eyebrow")}</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl">
									{t("autoscuole.dashboard.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("autoscuole.dashboard.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.15} className="lg:col-span-7">
								<DashboardMock />
							</Reveal>
						</div>
					</div>
				</section>

				{/* PAYMENT FLOW — crucial reassurance about getting paid upfront */}
				<section className="py-24 md:py-32 bg-ink text-white relative overflow-hidden">
					<div
						className="absolute inset-0 opacity-[0.04]"
						style={{
							backgroundImage:
								"radial-gradient(circle at 20% 40%, rgba(255,255,255,0.4) 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.4) 1px, transparent 1px)",
							backgroundSize: "32px 32px, 32px 32px",
						}}
					/>
					<div className="relative mx-auto w-full max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-20">
							<Reveal className="lg:col-span-6">
								<SectionEyebrow className="text-accent">
									{t("autoscuole.payments.eyebrow")}
								</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight md:text-3xl lg:text-4xl whitespace-pre-line leading-[1.1] max-w-[22ch]">
									{t("autoscuole.payments.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-white/70 max-w-[48ch]">
									{t("autoscuole.payments.body")}
								</p>
							</Reveal>

							<Reveal delay={0.15} className="lg:col-span-6">
								<div className="flex flex-col gap-4">
									{/* Student row */}
									<div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-7 flex items-center justify-between gap-4">
										<div>
											<span className="font-sans text-xs font-bold uppercase tracking-widest text-white/50 block">
												{t("autoscuole.payments.pillStudent")}
											</span>
											<span className="mt-2 font-sans text-lg font-black text-white block">
												{t("autoscuole.payments.pillStudentValue")}
											</span>
										</div>
										<div className="flex gap-1.5">
											{[1, 2, 3].map((n) => (
												<span
													key={n}
													className="h-10 w-3 rounded-full bg-white/30"
												/>
											))}
										</div>
									</div>

									{/* Arrow divider */}
									<div className="flex items-center gap-3 px-6">
										<span className="h-px flex-1 bg-white/10" />
										<ArrowRight className="h-4 w-4 text-accent rotate-90" />
										<span className="h-px flex-1 bg-white/10" />
									</div>

									{/* School row — accented */}
									<div className="rounded-2xl bg-brand text-white p-6 md:p-7 flex items-center justify-between gap-4 shadow-cta">
										<div>
											<span className="font-sans text-xs font-bold uppercase tracking-widest text-white/70 block">
												{t("autoscuole.payments.pillSchool")}
											</span>
											<span className="mt-2 font-sans text-lg font-black text-white block">
												{t("autoscuole.payments.pillSchoolValue")}
											</span>
										</div>
										<div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center">
											<BadgeCheck className="h-6 w-6 text-white" />
										</div>
									</div>
								</div>
							</Reveal>
						</div>
					</div>
				</section>

				{/* BENEFITS — asymmetric: one big primary + two small secondaries */}
				<section className="py-24 md:py-32 bg-bg-sunken/30">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
							{/* Primary benefit — large */}
							<Reveal className="lg:col-span-7">
								<div className="rounded-2xl bg-brand text-white p-8 md:p-12 h-full flex flex-col gap-6">
									<TrendingUp className="h-8 w-8" />
									<h3 className="font-sans text-xl font-black md:text-2xl lg:text-3xl leading-tight max-w-[18ch]">
										{t("autoscuole.benefits.primary.title")}
									</h3>
									<p className="font-sans text-base leading-relaxed text-white/85 max-w-[48ch]">
										{t("autoscuole.benefits.primary.body")}
									</p>
								</div>
							</Reveal>

							{/* Secondary benefits — stacked */}
							<div className="lg:col-span-5 flex flex-col gap-6">
								<Reveal delay={0.1}>
									<div className="rounded-2xl border border-line bg-bg-raised p-6 md:p-8 h-full">
										<FileCheck className="h-6 w-6 text-brand" />
										<h3 className="mt-4 font-sans text-base font-bold text-ink">
											{t("autoscuole.benefits.secondary.1.title")}
										</h3>
										<p className="mt-2 font-sans text-sm leading-relaxed text-ink-muted">
											{t("autoscuole.benefits.secondary.1.body")}
										</p>
									</div>
								</Reveal>
								<Reveal delay={0.2}>
									<div className="rounded-2xl border border-line bg-bg-raised p-6 md:p-8 h-full">
										<Download className="h-6 w-6 text-brand" />
										<h3 className="mt-4 font-sans text-base font-bold text-ink">
											{t("autoscuole.benefits.secondary.2.title")}
										</h3>
										<p className="mt-2 font-sans text-sm leading-relaxed text-ink-muted">
											{t("autoscuole.benefits.secondary.2.body")}
										</p>
									</div>
								</Reveal>
							</div>
						</div>
					</div>
				</section>

				{/* CLAIM PATHS — side-by-side comparison, asymmetric weight */}
				<section className="py-24 md:py-32 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<Reveal>
							<SectionEyebrow>{t("autoscuole.claim.eyebrow")}</SectionEyebrow>
							<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl">
								{t("autoscuole.claim.heading")}
							</h2>
						</Reveal>

						<div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
							{/* Auto claim — accented */}
							<Reveal>
								<div className="relative rounded-2xl bg-brand-soft/60 border border-brand/20 p-8 md:p-10 h-full">
									<div className="absolute top-6 right-6">
										<Zap className="h-5 w-5 text-brand" />
									</div>
									<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
										{t("autoscuole.claim.auto.label")}
									</span>
									<div className="mt-4 flex items-baseline gap-2">
										<span className="font-sans text-3xl font-black text-brand">
											{t("autoscuole.claim.auto.time")}
										</span>
									</div>
									<p className="mt-5 font-sans text-sm leading-relaxed text-ink max-w-[42ch]">
										{t("autoscuole.claim.auto.description")}
									</p>
								</div>
							</Reveal>

							{/* Manual claim — neutral */}
							<Reveal delay={0.1}>
								<div className="rounded-2xl border border-line bg-bg-raised p-8 md:p-10 h-full">
									<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
										{t("autoscuole.claim.manual.label")}
									</span>
									<div className="mt-4 flex items-baseline gap-2">
										<span className="font-sans text-3xl font-black text-ink">
											{t("autoscuole.claim.manual.time")}
										</span>
									</div>
									<p className="mt-5 font-sans text-sm leading-relaxed text-ink-muted max-w-[42ch]">
										{t("autoscuole.claim.manual.description")}
									</p>
								</div>
							</Reveal>
						</div>
					</div>
				</section>

				{/* PRICING — honest, two-row asymmetric */}
				<section className="py-24 md:py-32 bg-bg-sunken/30">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="lg:col-span-5">
								<SectionEyebrow>{t("autoscuole.pricing.eyebrow")}</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl max-w-[18ch]">
									{t("autoscuole.pricing.heading")}
								</h2>
								<p className="mt-6 font-sans text-xs leading-relaxed text-ink-faint max-w-[40ch] flex items-start gap-2">
									<span className="inline-block w-1 h-1 rounded-full bg-ink-faint mt-2 shrink-0" />
									{t("autoscuole.pricing.note")}
								</p>
							</Reveal>

							<div className="lg:col-span-7 flex flex-col gap-4">
								{/* Today row */}
								<Reveal>
									<div className="flex flex-wrap items-baseline gap-6 rounded-2xl border border-line bg-bg-raised p-6 md:p-8">
										<div className="min-w-[80px]">
											<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
												{t("autoscuole.pricing.today.label")}
											</span>
											<div className="mt-2 font-sans text-4xl font-black text-brand leading-none">
												{t("autoscuole.pricing.today.value")}
											</div>
										</div>
										<p className="flex-1 font-sans text-sm leading-relaxed text-ink-muted min-w-[240px]">
											{t("autoscuole.pricing.today.description")}
										</p>
									</div>
								</Reveal>

								{/* Transaction row */}
								<Reveal delay={0.1}>
									<div className="flex flex-wrap items-baseline gap-6 rounded-2xl border border-line bg-bg-raised p-6 md:p-8">
										<div className="min-w-[80px]">
											<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
												{t("autoscuole.pricing.transaction.label")}
											</span>
											<div className="mt-2 font-sans text-4xl font-black text-ink leading-none">
												{t("autoscuole.pricing.transaction.value")}
											</div>
										</div>
										<p className="flex-1 font-sans text-sm leading-relaxed text-ink-muted min-w-[240px]">
											{t("autoscuole.pricing.transaction.description")}
										</p>
									</div>
								</Reveal>
							</div>
						</div>
					</div>
				</section>

				{/* FINAL CTA */}
				<section className="py-20 md:py-28 bg-brand text-white">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
							<Reveal>
								<h2 className="font-sans text-2xl font-black tracking-tight md:text-3xl max-w-[22ch]">
									{t("autoscuole.cta.heading")}
								</h2>
								<p className="mt-4 font-sans text-base opacity-80 max-w-[48ch]">
									{t("autoscuole.cta.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.1}>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<Link to="/signup/driving-school">
										<Button
											size="lg"
											className="h-14 px-10 rounded-pill bg-white text-brand hover:bg-white/90 font-bold text-base gap-2 shadow-lg"
										>
											{t("autoscuole.cta.button")}
											<ArrowRight className="h-4 w-4" />
										</Button>
									</Link>
								</div>
							</Reveal>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
