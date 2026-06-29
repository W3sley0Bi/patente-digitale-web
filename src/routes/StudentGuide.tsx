import { Clock, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { BookLessonForm } from "@/components/booking/BookLessonForm";
import { MyLessons } from "@/components/booking/MyLessons";
import { StudentLayout } from "@/components/student/StudentLayout";
import { getMyEnrollment } from "@/lib/booking/api";
import type { Enrollment } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type SchoolInfo = {
	name: string | null;
	lesson_duration_min: number | null;
	email: string | null;
	booking_enabled: boolean;
};

export default function StudentGuide() {
	const { t } = useTranslation();
	const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
	const [school, setSchool] = useState<SchoolInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [refresh, setRefresh] = useState(0);

	useEffect(() => {
		getMyEnrollment()
			.then(async (e) => {
				setEnrollment(e);
				if (e) {
					const { data } = await supabase
						.from("driving_schools")
						.select("name, lesson_duration_min, email, booking_enabled")
						.eq("id", e.school_id)
						.maybeSingle();
					setSchool((data as SchoolInfo) ?? null);
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const status = enrollment?.status;

	return (
		<StudentLayout>
			<div className="mx-auto max-w-5xl pb-12">
				<h1 className="text-2xl font-bold">{t("student.guide.title")}</h1>

				{loading ? (
					<div className="mt-8 flex min-h-[20vh] items-center justify-center">
						<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
					</div>
				) : !enrollment || status === "rejected" || status === "left" ? (
					// Not enrolled (or rejected/left) → point them to search
					<div className="mt-8 rounded-2xl border border-line bg-bg-raised p-8 text-center">
						<p className="text-sm text-ink-muted">
							{t("booking.student.notEnrolled")}
						</p>
						<Link
							to="/search"
							className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
						>
							<Search size={15} aria-hidden="true" />
							{t("booking.student.findSchool")}
						</Link>
					</div>
				) : (
					<div className="mt-8 space-y-6">
						{/* "Iscritto a {school}" lives on the dashboard; here we only
						    surface the pending state, which the booking flow depends on. */}
						{status !== "active" && (
							<div className="rounded-2xl border border-warning/30 bg-warning-soft/50 px-5 py-4">
								<p className="flex items-center gap-2 text-sm font-semibold text-warning-ink">
									<Clock size={16} aria-hidden="true" className="shrink-0" />
									{t("booking.student.pending", {
										school: school?.name ?? "—",
									})}
								</p>
							</div>
						)}

						<div
							className={cn(
								"grid grid-cols-1 gap-6",
								status === "active" && "lg:grid-cols-2",
							)}
						>
							{status === "active" &&
								(school?.booking_enabled ? (
									<BookLessonForm
										schoolId={enrollment.school_id}
										durationMin={school?.lesson_duration_min ?? 60}
										schoolEmail={school?.email ?? undefined}
										onBooked={() => setRefresh((n) => n + 1)}
									/>
								) : (
									<div className="rounded-2xl border border-line bg-bg-raised p-6 text-sm text-ink-muted">
										{t("booking.book.disabled")}
									</div>
								))}
							<MyLessons refreshKey={refresh} />
						</div>
					</div>
				)}
			</div>
		</StudentLayout>
	);
}
