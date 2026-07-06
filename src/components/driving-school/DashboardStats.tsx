import { Bell, CalendarDays, UserCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardStatsProps {
	activeStudents: number;
	lessonsThisWeek: number;
	pendingCount: number;
	activeInstructors: number;
}

function StatCard({
	icon: Icon,
	value,
	label,
	warn,
}: {
	icon: typeof Users;
	value: number;
	label: string;
	warn?: boolean;
}) {
	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-5">
			<div className="flex items-center gap-2 text-ink-muted">
				<Icon size={16} aria-hidden="true" />
				<p className="text-xs font-bold uppercase tracking-wide">{label}</p>
			</div>
			<p
				className={`mt-2 text-2xl font-bold ${
					warn && value > 0 ? "text-amber-600" : "text-ink"
				}`}
			>
				{value}
			</p>
		</div>
	);
}

export function DashboardStats({
	activeStudents,
	lessonsThisWeek,
	pendingCount,
	activeInstructors,
}: DashboardStatsProps) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<StatCard
				icon={Users}
				value={activeStudents}
				label={t("school.dashboard.stats.activeStudents")}
			/>
			<StatCard
				icon={CalendarDays}
				value={lessonsThisWeek}
				label={t("school.dashboard.stats.lessonsThisWeek")}
			/>
			<StatCard
				icon={Bell}
				value={pendingCount}
				label={t("school.dashboard.stats.pendingRequests")}
				warn
			/>
			<StatCard
				icon={UserCheck}
				value={activeInstructors}
				label={t("school.dashboard.stats.activeInstructors")}
			/>
		</div>
	);
}
