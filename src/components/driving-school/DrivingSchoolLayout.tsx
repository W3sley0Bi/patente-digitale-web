import {
	CalendarDays,
	LayoutDashboard,
	Pencil,
	Settings,
	Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router";
import { Mascot, Wordmark } from "@/components/brand/Brand";
import { UserMenu } from "@/components/nav/UserMenu";

const NAV_ITEMS = [
	{
		href: "/app/driving-school",
		icon: LayoutDashboard,
		label: "school.dashboard.nav.overview",
		end: true,
	},
	{
		href: "/app/driving-school/drive-bookings",
		icon: CalendarDays,
		label: "school.dashboard.nav.guide",
		end: false,
	},
	{
		href: "/app/driving-school/students",
		icon: Users,
		label: "school.dashboard.nav.students",
		end: false,
	},
	{
		href: "/app/driving-school/profile",
		icon: Pencil,
		label: "school.dashboard.nav.editListing",
		end: false,
	},
	{
		href: "/app/driving-school/settings",
		icon: Settings,
		label: "school.dashboard.nav.settings",
		end: false,
	},
];

interface DrivingSchoolLayoutProps {
	children: React.ReactNode;
	schoolName?: string;
}

export function DrivingSchoolLayout({
	children,
	schoolName,
}: DrivingSchoolLayoutProps) {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-bg text-ink">
			{/* School-specific top bar — no public nav links, logo → dashboard */}
			<header className="fixed top-0 z-[60] w-full bg-bg/90 shadow-sm backdrop-blur-md">
				<div className="mx-auto flex h-20 max-w-(--container-wide) items-center justify-between px-4 lg:px-8">
					<Link
						to="/app/driving-school"
						className="flex items-center gap-2.5"
					>
						<Mascot size="sm" />
						<Wordmark />
					</Link>
					<UserMenu />
				</div>
			</header>

			<div className="flex mx-auto max-w-(--container-wide) min-h-[calc(100vh-5rem)] pt-20">
				{/* Desktop sidebar */}
				<aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-line px-3 py-6 gap-1">
					{schoolName && (
						<p className="px-3 mb-4 text-xs font-semibold uppercase tracking-widest text-ink-faint truncate">
							{schoolName}
						</p>
					)}
					{NAV_ITEMS.map(({ href, icon: Icon, label, end }) => (
						<NavLink
							key={href}
							to={href}
							end={end}
							className={({ isActive }) =>
								`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-brand-soft text-brand"
										: "text-ink-muted hover:bg-brand-soft/40 hover:text-ink"
								}`
							}
						>
							<Icon size={16} />
							{t(label)}
						</NavLink>
					))}
				</aside>

				{/* Mobile top tabs — horizontally scrollable, never overflow the page */}
				<div className="md:hidden fixed top-20 left-0 right-0 z-40 flex gap-1 overflow-x-auto border-b border-line bg-bg px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{NAV_ITEMS.map(({ href, icon: Icon, label, end }) => (
						<NavLink
							key={href}
							to={href}
							end={end}
							className={({ isActive }) =>
								`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
									isActive
										? "border-brand text-brand"
										: "border-transparent text-ink-muted hover:text-ink"
								}`
							}
						>
							<Icon size={14} />
							{t(label)}
						</NavLink>
					))}
				</div>

				{/* Main content — min-w-0 so wide children (calendar, grids) scroll
				    internally instead of pushing the whole page sideways. */}
				<main className="min-w-0 flex-1 px-6 py-8 pt-20 md:px-10 md:pt-8">
					{children}
				</main>
			</div>
		</div>
	);
}
