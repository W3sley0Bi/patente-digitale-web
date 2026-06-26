import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookLessonForm } from "@/components/booking/BookLessonForm";
import { MyLessons } from "@/components/booking/MyLessons";
import { Nav } from "@/components/nav/Nav";
import { getMyEnrollment } from "@/lib/booking/api";
import type { Enrollment } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";

function StudentBookingPanel() {
	const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
	const [durationMin, setDurationMin] = useState<number>(60);
	const [schoolEmail, setSchoolEmail] = useState<string | undefined>(undefined);
	const [refresh, setRefresh] = useState(0);

	useEffect(() => {
		getMyEnrollment()
			.then(async (e) => {
				setEnrollment(e);
				if (e?.status === "active") {
					const { data } = await supabase
						.from("driving_schools")
						.select("lesson_duration_min, email")
						.eq("id", e.school_id)
						.maybeSingle();
					if (data?.lesson_duration_min)
						setDurationMin(data.lesson_duration_min);
					if (data?.email) setSchoolEmail(data.email);
				}
			})
			.catch(() => {});
	}, []);

	return (
		<div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
			{enrollment?.status === "active" && (
				<BookLessonForm
					schoolId={enrollment.school_id}
					durationMin={durationMin}
					schoolEmail={schoolEmail}
					onBooked={() => setRefresh((n) => n + 1)}
				/>
			)}
			<MyLessons refreshKey={refresh} />
		</div>
	);
}

export default function StudentDashboard() {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen bg-bg text-ink">
			<Nav />
			<div className="mx-auto max-w-5xl px-6 pt-24 pb-12">
				<h1 className="text-2xl font-bold">{t("student.dashboard.title")}</h1>
				<p className="text-ink-muted mt-2">{t("student.dashboard.desc")}</p>
				<StudentBookingPanel />
			</div>
		</div>
	);
}
