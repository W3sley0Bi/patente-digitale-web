import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { useAuth } from "@/hooks/useAuth";
import { type EnrolledStudent, listEnrolledStudents } from "@/lib/booking/api";
import { supabase } from "@/lib/supabase";

const initials = (name: string | null) =>
	(name ?? "?")
		.split(" ")
		.map((p) => p[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

export default function DrivingSchoolStudents() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [schoolName, setSchoolName] = useState<string | null>(null);
	const [students, setStudents] = useState<EnrolledStudent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select("id, name")
			.eq("user_id", user.id)
			.eq("status", "accepted")
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(async ({ data }) => {
				const row = data as { id: string; name: string | null } | null;
				setSchoolName(row?.name ?? null);
				if (row?.id) {
					setStudents(await listEnrolledStudents(row.id).catch(() => []));
				}
				setLoading(false);
			});
	}, [user]);

	return (
		<DrivingSchoolLayout schoolName={schoolName ?? undefined}>
			<header className="mb-8">
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink">
					{t("school.dashboard.nav.students")}
				</p>
				<h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
					{t("school.dashboard.studentsTitle")}
				</h1>
				<p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
					{loading
						? ""
						: t("school.dashboard.studentsCount", { count: students.length })}
				</p>
			</header>

			{loading ? (
				<div className="flex min-h-[30vh] items-center justify-center">
					<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
				</div>
			) : students.length === 0 ? (
				<div className="rounded-[1.5rem] border border-line bg-bg-raised p-10 text-center">
					<p className="text-sm text-ink-muted">
						{t("booking.school.noStudents")}
					</p>
				</div>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{students.map((s) => (
						<li
							key={s.student_id}
							className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-bg-raised p-4"
						>
							<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
								{initials(s.full_name)}
							</span>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-ink">
									{s.full_name ?? t("booking.school.student")}
								</p>
								<p className="flex items-center gap-1 text-xs text-ink-muted">
									<GraduationCap size={13} aria-hidden />
									{s.licence_code ?? "—"}
								</p>
							</div>
						</li>
					))}
				</ul>
			)}
		</DrivingSchoolLayout>
	);
}
