import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface UpcomingLesson {
	id: string;
	studentName: string;
	instructorName: string;
	startsAt: string; // ISO
}

export function DashboardUpcoming({ lessons }: { lessons: UpcomingLesson[] }) {
	const { t, i18n } = useTranslation();

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-6">
			<div className="flex items-center gap-2 text-ink-muted">
				<CalendarClock size={16} aria-hidden="true" />
				<p className="text-xs font-bold uppercase tracking-wide">
					{t("school.dashboard.upcoming.title")}
				</p>
			</div>
			{lessons.length === 0 ? (
				<p className="mt-3 text-sm text-ink-muted">
					{t("school.dashboard.upcoming.empty")}
				</p>
			) : (
				<ul className="mt-3 divide-y divide-line">
					{lessons.map((lesson) => (
						<li
							key={lesson.id}
							className="flex items-center justify-between gap-3 py-2.5 text-sm"
						>
							<span className="min-w-0 truncate font-semibold">
								{lesson.studentName}
							</span>
							<span className="shrink-0 text-ink-muted">
								{lesson.instructorName}
							</span>
							<span className="shrink-0 text-xs text-ink-faint">
								{new Date(lesson.startsAt).toLocaleString(i18n.language, {
									dateStyle: "medium",
									timeStyle: "short",
								})}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
