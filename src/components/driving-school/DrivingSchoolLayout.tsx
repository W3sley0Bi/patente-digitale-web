import { Link, NavLink } from "react-router";
import { LayoutDashboard, Pencil, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Mascot, Wordmark } from "@/components/brand/Brand";
import { UserMenu } from "@/components/nav/UserMenu";

const NAV_ITEMS = [
  { href: "/driving-school/dashboard", icon: LayoutDashboard, label: "school.dashboard.nav.overview", end: true },
  { href: "/driving-school/dashboard/edit", icon: Pencil, label: "school.dashboard.nav.editListing", end: false },
  { href: "/driving-school/dashboard/settings", icon: Settings, label: "school.dashboard.nav.settings", end: false },
];

interface DrivingSchoolLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
}

export function DrivingSchoolLayout({ children, schoolName }: DrivingSchoolLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* School-specific top bar — no public nav links, logo → dashboard */}
      <header className="fixed top-0 z-[60] w-full bg-bg/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-(--container-wide) items-center justify-between px-4 lg:px-8">
          <Link to="/driving-school/dashboard" className="flex items-center gap-2.5">
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

        {/* Mobile top tabs */}
        <div className="md:hidden fixed top-20 left-0 right-0 z-40 bg-bg border-b border-line flex px-4 gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label, end }) => (
            <NavLink
              key={href}
              to={href}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
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

        {/* Main content */}
        <main className="flex-1 px-6 py-8 md:px-10 pt-20 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
