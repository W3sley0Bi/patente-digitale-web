import { Car, LayoutDashboard, Search, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router";
import { Mascot, Wordmark } from "@/components/brand/Brand";
import { UserMenu } from "@/components/nav/UserMenu";

const NAV_ITEMS = [
	{
		href: "/student/dashboard",
		icon: LayoutDashboard,
		label: "student.nav.dashboard",
		end: true,
	},
	{
		href: "/student/dashboard/guide",
		icon: Car,
		label: "student.nav.guide",
		end: false,
	},
	{
		href: "/student/dashboard/profile",
		icon: UserRound,
		label: "student.nav.profile",
		end: false,
	},
	{
		href: "/search",
		icon: Search,
		label: "student.nav.findSchool",
		end: false,
	},
];

interface StudentLayoutProps {
	children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-bg text-ink">
			{/* Student top bar — logo links to student dashboard */}
			<header className="fixed top-0 z-[60] w-full bg-bg/90 shadow-sm backdrop-blur-md">
				<div className="mx-auto flex h-20 max-w-(--container-wide) items-center justify-between px-4 lg:px-8">
					<Link to="/student/dashboard" className="flex items-center gap-2.5">
						<Mascot size="sm" />
						<Wordmark />
					</Link>
					<UserMenu />
				</div>
			</header>

			<div className="flex mx-auto max-w-(--container-wide) min-h-[calc(100vh-5rem)] pt-20">
				{/* Desktop sidebar */}
				<aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-line px-3 py-6 gap-1">
					{NAV_ITEMS.map(({ href, icon: Icon, label, end }) => (
						<NavLink
							key={href}
							to={href}
							end={end}
							className={({ isActive }) =>
								`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out ${
									isActive
										? "bg-brand-soft text-brand"
										: "text-ink-muted hover:bg-brand-soft/40 hover:text-ink"
								}`
							}
						>
							<Icon size={16} aria-hidden="true" />
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
								`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors duration-150 ease-out ${
									isActive
										? "border-brand text-brand"
										: "border-transparent text-ink-muted hover:text-ink"
								}`
							}
						>
							<Icon size={14} aria-hidden="true" />
							{t(label)}
						</NavLink>
					))}
				</div>

				{/* Main content area */}
				<main className="min-w-0 flex-1 px-6 py-8 pt-20 md:px-10 md:pt-8">
					{children}
				</main>
			</div>
		</div>
	);
}
