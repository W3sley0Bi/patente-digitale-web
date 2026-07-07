import {
	ArrowDown,
	ArrowRight,
	BadgeCheck,
	Bell,
	CalendarClock,
	CalendarDays,
	CalendarSync,
	CheckCircle2,
	Download,
	GraduationCap,
	Link2,
	Lock,
	Mail,
	MessageCircle,
	Phone,
	Search,
	UserCheck,
	Users,
	Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import managerIcon from "@/assets/autoscuola-manager-icon.png";
import verifiedBadge from "@/assets/verified-autoscuola-green.png";
import { Footer } from "@/components/layout/Footer";
import { SectionEyebrow } from "@/components/layout/SectionEyebrow";
import { MockupTest } from "@/components/mockup-test/MockupTest";
import { Reveal } from "@/components/motion/Reveal";
import { Nav } from "@/components/nav/Nav";
import { Button } from "@/components/ui/button";

/** Shared "browser window" chrome so every mock reads as one product, one screenshot family. */
function MockChrome({
	url,
	children,
}: {
	url: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-line bg-bg-raised shadow-lg overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-bg-sunken/40">
				<div className="flex gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
					<span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
				</div>
				<div className="ml-3 flex-1 min-w-0 flex items-center gap-2 rounded-md bg-bg border border-line px-3 py-1">
					<img
						src={managerIcon}
						alt=""
						aria-hidden="true"
						className="h-4 w-4 rounded-sm object-cover shrink-0"
					/>
					<span className="font-sans min-w-0 text-xs text-ink-faint truncate">
						{url}
					</span>
				</div>
			</div>
			<div className="p-6 md:p-8">{children}</div>
		</div>
	);
}

function DashboardMock() {
	const { t } = useTranslation();
	return (
		<MockChrome url="patentedigitale.it/app/driving-school">
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

			{/* Stat cards — mirrors the real dashboard's overview row */}
			<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{[
					{
						icon: Users,
						value: "18",
						label: t("school.dashboard.stats.activeStudents"),
					},
					{
						icon: CalendarDays,
						value: "9",
						label: t("school.dashboard.stats.lessonsThisWeek"),
					},
					{
						icon: Bell,
						value: "3",
						label: t("school.dashboard.stats.pendingRequests"),
						warn: true,
					},
					{
						icon: UserCheck,
						value: "4",
						label: t("school.dashboard.stats.activeInstructors"),
					},
				].map((stat) => (
					<div
						key={stat.label}
						className="rounded-xl border border-line bg-bg p-3.5"
					>
						<div className="flex items-center gap-1.5 text-ink-muted">
							<stat.icon className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="font-sans text-[10px] font-bold uppercase tracking-wide">
								{stat.label}
							</span>
						</div>
						<p
							className={`mt-1.5 font-sans text-xl font-black ${stat.warn ? "text-amber-600" : "text-ink"}`}
						>
							{stat.value}
						</p>
					</div>
				))}
			</div>

			{/* Recent enrolments */}
			<div className="mt-6">
				<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-faint">
					{t("autoscuole.dashboard.mock.recentLabel")}
				</span>
				<ul className="mt-3 flex flex-col divide-y divide-line border border-line rounded-xl bg-bg overflow-hidden">
					{[1, 2, 3].map((i) => (
						<li
							key={i}
							className="flex items-center justify-between gap-3 px-4 py-3"
						>
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
		</MockChrome>
	);
}

function RosterMock() {
	const { t } = useTranslation();
	const rows = [1, 2, 3, 4] as const;
	return (
		<MockChrome url="patentedigitale.it/app/driving-school/students">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="font-sans text-lg font-black text-ink">
						{t("autoscuole.roster.mock.title")}
					</h3>
					<p className="mt-1 font-sans text-xs text-ink-muted">
						{t("autoscuole.roster.mock.subtitle")}
					</p>
				</div>
				<div className="inline-flex items-center gap-2 rounded-md bg-brand-soft border border-brand/20 px-3 py-1.5">
					<Link2 className="h-3.5 w-3.5 text-brand" />
					<span className="font-sans text-xs font-bold text-brand-ink">
						{t("autoscuole.roster.mock.inviteBadge")}
					</span>
				</div>
			</div>

			{/* Search */}
			<div className="relative mt-5 max-w-xs">
				<Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
				<div className="w-full rounded-md border border-line bg-bg py-2 pl-8 pr-3 font-sans text-xs text-ink-faint">
					{t("autoscuole.roster.mock.searchPlaceholder")}
				</div>
			</div>

			<ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
				{rows.map((i) => {
					const claimed = i !== 3;
					return (
						<li key={i} className="flex items-center gap-3 px-4 py-3">
							<span
								className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-sans text-xs font-black ${
									claimed
										? "bg-brand-soft text-brand-ink"
										: "bg-amber-100 text-amber-700"
								}`}
							>
								{t(`autoscuole.roster.mock.student${i}.initials`)}
							</span>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate font-sans text-sm font-semibold text-ink">
										{t(`autoscuole.roster.mock.student${i}.name`)}
									</span>
									{!claimed && (
										<span className="shrink-0 rounded-full bg-bg-sunken px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-ink-faint">
											{t("autoscuole.roster.mock.unclaimedBadge")}
										</span>
									)}
								</div>
								<div className="mt-0.5 flex items-center gap-1 font-sans text-xs text-ink-muted">
									{claimed ? (
										<Mail className="h-3 w-3 shrink-0" />
									) : (
										<Phone className="h-3 w-3 shrink-0" />
									)}
									<span className="truncate">
										{t(`autoscuole.roster.mock.student${i}.contact`)}
									</span>
								</div>
							</div>
							<span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wide text-brand-ink">
								<GraduationCap className="h-2.5 w-2.5 shrink-0" />
								{t(`autoscuole.roster.mock.student${i}.licence`)}
							</span>
						</li>
					);
				})}
			</ul>
		</MockChrome>
	);
}

function CalendarMock() {
	const { t } = useTranslation();
	const days = [1, 2, 3, 4, 5] as const;
	// Mirrors the real per-instructor colored blocks: student name + instructor
	// name + licence badge, solid fill when confirmed, dashed amber when pending.
	const blocks = [
		{
			day: 0,
			top: 10,
			height: 20,
			color: "bg-violet-500",
			student: t("autoscuole.roster.mock.student1.name"),
			instructor: t("autoscuole.calendar.mock.instructor1"),
			licence: t("autoscuole.roster.mock.student1.licence"),
			pending: false,
		},
		{
			day: 2,
			top: 15,
			height: 20,
			color: "bg-pink-500",
			student: t("autoscuole.roster.mock.student2.name"),
			instructor: t("autoscuole.calendar.mock.instructor2"),
			licence: t("autoscuole.roster.mock.student2.licence"),
			pending: false,
		},
		{
			day: 2,
			top: 55,
			height: 16,
			student: t("autoscuole.roster.mock.student3.name"),
			instructor: "",
			licence: "",
			pending: true,
		},
		{
			day: 4,
			top: 30,
			height: 20,
			color: "bg-violet-500",
			student: t("autoscuole.roster.mock.student4.name"),
			instructor: t("autoscuole.calendar.mock.instructor1"),
			licence: t("autoscuole.roster.mock.student4.licence"),
			pending: false,
		},
	];
	return (
		<MockChrome url="patentedigitale.it/app/driving-school/drive-bookings">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3 className="font-sans text-lg font-black text-ink">
					{t("autoscuole.calendar.mock.title")}
				</h3>
				<span className="font-sans text-xs font-bold text-ink-muted">
					{t("autoscuole.calendar.mock.weekLabel")}
				</span>
			</div>

			<div className="mt-5 grid grid-cols-5 gap-2">
				{days.map((day) => (
					<div
						key={day}
						className="font-sans text-[10px] font-bold uppercase tracking-wide text-ink-faint text-center"
					>
						{t(`autoscuole.calendar.mock.day${day}`)}
					</div>
				))}
			</div>
			<div className="mt-2 grid grid-cols-5 gap-2 relative h-56 rounded-xl border border-line bg-bg overflow-hidden">
				{days.map((day) => {
					const i = day - 1;
					return (
						<div
							key={day}
							className={
								i !== 4 ? "border-r border-line/60 relative" : "relative"
							}
						>
							{blocks
								.filter((b) => b.day === i)
								.map((b) => (
									<div
										key={`${b.day}-${b.top}`}
										className={
											b.pending
												? "absolute left-1 right-1 rounded-md border-2 border-dashed border-amber-500 bg-amber-500/10 px-1.5 py-1 overflow-hidden"
												: `absolute left-1 right-1 rounded-md px-1.5 py-1 overflow-hidden ${b.color}`
										}
										style={{ top: `${b.top}%`, height: `${b.height}%` }}
									>
										{b.pending ? (
											<span className="font-sans text-[10px] font-bold text-amber-700 truncate block">
												{b.student}
											</span>
										) : (
											<>
												<p className="font-sans text-[10px] font-black text-white leading-tight truncate">
													{b.student}
												</p>
												<p className="font-sans text-[9px] text-white/80 leading-tight truncate">
													{b.instructor}
												</p>
												<span className="absolute bottom-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/25 font-sans text-[8px] font-black text-white">
													{b.licence}
												</span>
											</>
										)}
									</div>
								))}
						</div>
					);
				})}
			</div>
			<div className="mt-4 flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
					<span className="font-sans text-xs text-ink-muted">
						{t("autoscuole.calendar.mock.instructor1")}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
					<span className="font-sans text-xs text-ink-muted">
						{t("autoscuole.calendar.mock.instructor2")}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-amber-500" />
					<span className="font-sans text-xs text-ink-muted">
						{t("autoscuole.calendar.mock.legendPending")}
					</span>
				</div>
			</div>
		</MockChrome>
	);
}

/** Phone-shaped chrome, distinct from the desktop dashboard chrome — this is what a student sees. */
function StudentMock() {
	const { t } = useTranslation();
	return (
		<div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-8 border-ink bg-bg shadow-lg overflow-hidden">
			<div className="h-6 flex items-center justify-center bg-ink">
				<span className="h-1.5 w-16 rounded-full bg-white/20" />
			</div>
			<div className="p-5">
				<h3 className="font-sans text-lg font-black text-ink">
					{t("autoscuole.student.mock.greeting")}
				</h3>

				<div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5">
					<CheckCircle2 className="h-3.5 w-3.5 text-brand" />
					<span className="font-sans text-xs font-bold text-brand-ink">
						{t("autoscuole.student.mock.enrolledAt")}
					</span>
				</div>

				<div className="mt-4 rounded-2xl border border-line bg-bg-raised p-4">
					<div className="flex items-start gap-2.5">
						<CalendarClock className="h-4 w-4 mt-0.5 text-ink-muted shrink-0" />
						<div>
							<p className="font-sans text-[10px] font-bold uppercase tracking-wide text-ink-muted">
								{t("autoscuole.student.mock.nextLessonLabel")}
							</p>
							<p className="mt-0.5 font-sans text-sm font-bold text-ink">
								{t("autoscuole.student.mock.nextLessonValue")}
							</p>
						</div>
					</div>
					<button
						type="button"
						className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 font-sans text-xs font-bold text-white pointer-events-none"
					>
						{t("autoscuole.student.mock.cta")}
						<ArrowRight className="h-3 w-3" />
					</button>
				</div>

				<div className="mt-3 rounded-2xl border border-line bg-bg-raised p-4">
					<div className="flex items-start gap-2.5">
						<CalendarSync className="h-4 w-4 mt-0.5 text-ink-muted shrink-0" />
						<div>
							<p className="font-sans text-sm font-bold text-ink">
								{t("autoscuole.student.mock.syncTitle")}
							</p>
							<p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted">
								{t("autoscuole.student.mock.syncBody")}
							</p>
						</div>
					</div>
					<div className="mt-3 flex flex-col gap-1.5">
						<span className="rounded-md border border-line bg-bg px-3 py-1.5 font-sans text-[11px] font-bold text-ink text-center">
							{t("autoscuole.student.mock.syncGoogle")}
						</span>
						<span className="rounded-md border border-line bg-bg px-3 py-1.5 font-sans text-[11px] font-bold text-ink text-center">
							{t("autoscuole.student.mock.syncApple")}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Landing() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-bg text-ink">
			<Nav />
			<main>
				{/* HERO — dark, badge-led */}
				<section className="relative flex items-center min-h-[100svh] pt-[14svh] pb-[10svh] bg-ink overflow-hidden">
					<div
						className="absolute inset-0 opacity-[0.04]"
						style={{
							backgroundImage:
								"linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
							backgroundSize: "56px 56px",
						}}
					/>

					<div className="relative mx-auto w-full max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid min-w-0 items-center gap-12 lg:grid-cols-12">
							<Reveal className="min-w-0 lg:col-span-7">
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
									<Link to="/app/signup/driving-school" className="w-full sm:w-auto">
										<Button
											size="lg"
											className="h-14 w-full whitespace-normal px-6 text-center rounded-pill bg-brand text-white hover:bg-brand-hover font-bold gap-2 shadow-cta sm:w-auto sm:whitespace-nowrap sm:px-8"
										>
											{t("autoscuole.hero.cta")}
											<ArrowRight className="h-4 w-4 shrink-0" />
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

							<Reveal
								delay={0.2}
								className="lg:col-span-5 flex justify-center lg:justify-end"
							>
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

					<a
						href="#come-funziona"
						className="group absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 font-sans text-xs font-bold text-white/50 hover:text-white transition-colors"
					>
						<span className="uppercase tracking-widest">
							{t("autoscuole.hero.ctaSecondaryScroll")}
						</span>
						<ArrowDown className="h-4 w-4 motion-safe:animate-bounce group-hover:text-white" />
					</a>
				</section>

				{/* DASHBOARD MOCKUP — the visual proof */}
				<section
					id="come-funziona"
					className="scroll-mt-20 py-24 md:py-32 bg-bg"
				>
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid min-w-0 items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="min-w-0 lg:col-span-5">
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
								</div>
								<SectionEyebrow>
									{t("autoscuole.dashboard.eyebrow")}
								</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl">
									{t("autoscuole.dashboard.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("autoscuole.dashboard.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.15} className="min-w-0 lg:col-span-7">
								<MockupTest name="landing-dashboard-mock">
									<DashboardMock />
								</MockupTest>
							</Reveal>
						</div>
					</div>
				</section>

				{/* STUDENT ROSTER MOCKUP */}
				<section className="py-24 md:py-32 bg-bg-sunken/30">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid min-w-0 items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal delay={0.15} className="min-w-0 lg:col-span-7 order-2 lg:order-1">
								<MockupTest name="landing-roster-mock">
									<RosterMock />
								</MockupTest>
							</Reveal>
							<Reveal className="min-w-0 lg:col-span-5 order-1 lg:order-2">
								<SectionEyebrow>
									{t("autoscuole.roster.eyebrow")}
								</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl">
									{t("autoscuole.roster.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("autoscuole.roster.subhead")}
								</p>
							</Reveal>
						</div>
					</div>
				</section>

				{/* CALENDAR MOCKUP */}
				<section className="py-24 md:py-32 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid min-w-0 items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal className="min-w-0 lg:col-span-5">
								<SectionEyebrow>
									{t("autoscuole.calendar.eyebrow")}
								</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl">
									{t("autoscuole.calendar.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[44ch]">
									{t("autoscuole.calendar.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.15} className="min-w-0 lg:col-span-7">
								<MockupTest name="landing-calendar-mock">
									<CalendarMock />
								</MockupTest>
							</Reveal>
						</div>
					</div>
				</section>

				{/* STUDENT EXPERIENCE — what the school's students actually get */}
				<section
					id="esperienza-studenti"
					className="scroll-mt-20 py-24 md:py-32 bg-bg-sunken/30"
				>
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<div className="grid min-w-0 items-center gap-12 lg:grid-cols-12 lg:gap-16">
							<Reveal delay={0.15} className="min-w-0 lg:col-span-5 order-2 lg:order-1">
								<MockupTest name="landing-student-mock">
									<StudentMock />
								</MockupTest>
							</Reveal>
							<Reveal className="min-w-0 lg:col-span-7 order-1 lg:order-2">
								<SectionEyebrow>
									{t("autoscuole.student.eyebrow")}
								</SectionEyebrow>
								<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl lg:text-4xl">
									{t("autoscuole.student.heading")}
								</h2>
								<p className="mt-6 font-sans text-base leading-relaxed text-ink-muted max-w-[52ch]">
									{t("autoscuole.student.subhead")}
								</p>
							</Reveal>
						</div>
					</div>
				</section>

				{/* WHATSAPP BUSINESS — honest roadmap teaser, matches the locked in-app nav item */}
				<section className="py-16 md:py-20 bg-bg-sunken/30">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<Reveal>
							<div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-bg-raised p-8 md:p-10 text-center md:flex-row md:text-left">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
									<MessageCircle className="h-6 w-6" />
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-center gap-2 md:justify-start">
										<h3 className="font-sans text-base font-black text-ink">
											{t("autoscuole.whatsapp.heading")}
										</h3>
										<span className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-ink-faint">
											<Lock className="h-2.5 w-2.5" />
											{t("autoscuole.whatsapp.badge")}
										</span>
									</div>
									<p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-muted max-w-[56ch]">
										{t("autoscuole.whatsapp.body")}
									</p>
								</div>
							</div>
						</Reveal>
					</div>
				</section>

				{/* CLAIM PATHS */}
				<section className="py-16 md:py-20 bg-bg">
					<div className="mx-auto max-w-(--container-wide) px-4 lg:px-8">
						<Reveal>
							<SectionEyebrow>{t("autoscuole.claim.eyebrow")}</SectionEyebrow>
							<h2 className="mt-3 font-sans text-2xl font-black tracking-tight text-ink md:text-3xl">
								{t("autoscuole.claim.heading")}
							</h2>
						</Reveal>

						<div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 items-start">
							<Reveal>
								<div className="relative rounded-2xl bg-brand-soft/60 border border-brand/20 p-6">
									<div className="flex items-center gap-2">
										<Zap className="h-4 w-4 text-brand" />
										<span className="font-sans text-xs font-bold uppercase tracking-widest text-brand-ink">
											{t("autoscuole.claim.auto.label")}
										</span>
									</div>
									<div className="mt-2 flex items-baseline gap-2">
										<span className="font-sans text-xl font-black text-brand">
											{t("autoscuole.claim.auto.time")}
										</span>
									</div>
									<p className="mt-2 font-sans text-sm leading-relaxed text-ink max-w-[42ch]">
										{t("autoscuole.claim.auto.description")}
									</p>
								</div>
							</Reveal>

							<Reveal delay={0.1}>
								<div className="rounded-2xl border border-line bg-bg-raised p-6">
									<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
										{t("autoscuole.claim.manual.label")}
									</span>
									<div className="mt-2 flex items-baseline gap-2">
										<span className="font-sans text-xl font-black text-ink">
											{t("autoscuole.claim.manual.time")}
										</span>
									</div>
									<p className="mt-2 font-sans text-sm leading-relaxed text-ink-muted max-w-[42ch]">
										{t("autoscuole.claim.manual.description")}
									</p>
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
								<h2 className="font-sans text-2xl font-black tracking-tight md:text-3xl max-w-[22ch]">
									{t("autoscuole.cta.heading")}
								</h2>
								<p className="mt-4 font-sans text-base opacity-80 max-w-[48ch]">
									{t("autoscuole.cta.subhead")}
								</p>
							</Reveal>
							<Reveal delay={0.1}>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<Link to="/app/signup/driving-school" className="w-full sm:w-auto">
										<Button
											size="lg"
											className="h-14 w-full whitespace-normal px-6 text-center rounded-pill bg-white text-brand hover:bg-white/90 font-bold text-base gap-2 shadow-lg sm:w-auto sm:whitespace-nowrap sm:px-10"
										>
											{t("autoscuole.cta.button")}
											<ArrowRight className="h-4 w-4 shrink-0" />
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
