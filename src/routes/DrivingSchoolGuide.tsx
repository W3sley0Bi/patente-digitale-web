import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AvailabilityEditor } from "@/components/booking/AvailabilityEditor";
import { EnrollmentsInbox } from "@/components/booking/EnrollmentsInbox";
import { InstructorsManager } from "@/components/booking/InstructorsManager";
import { LessonsCalendar } from "@/components/booking/LessonsCalendar";
import { RequestsInbox } from "@/components/booking/RequestsInbox";
import { ServiceSettings } from "@/components/booking/ServiceSettings";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { useAuth } from "@/hooks/useAuth";
import { listInstructors, listSchoolBookings } from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";

interface SchoolRow {
	id: string;
	name: string | null;
	lesson_duration_min: number | null;
	booking_enabled: boolean;
}

export default function DrivingSchoolGuide() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [school, setSchool] = useState<SchoolRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [instructors, setInstructors] = useState<Instructor[]>([]);
	const [tick, setTick] = useState(0);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select("id, name, lesson_duration_min, booking_enabled")
			.eq("user_id", user.id)
			.eq("status", "accepted")
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(({ data }) => {
				setSchool((data as SchoolRow) ?? null);
				setLoading(false);
			});
	}, [user]);

	useEffect(() => {
		if (!school?.id) return;
		Promise.all([listSchoolBookings(school.id), listInstructors(school.id)])
			.then(([b, i]) => {
				setBookings(b);
				setInstructors(i);
			})
			.catch(() => {});
	}, [school?.id, tick]);

	const refresh = () => setTick((n) => n + 1);

	if (loading) {
		return (
			<DrivingSchoolLayout>
				<div className="flex min-h-[40vh] items-center justify-center">
					<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
				</div>
			</DrivingSchoolLayout>
		);
	}

	if (!school) {
		return (
			<DrivingSchoolLayout>
				<h1 className="text-2xl font-bold">{t("booking.school.calendar")}</h1>
				<p className="mt-2 text-sm text-ink-muted">
					{t("school.dashboard.nav.guide")}
				</p>
			</DrivingSchoolLayout>
		);
	}

	return (
		<DrivingSchoolLayout schoolName={school.name ?? undefined}>
			<h1 className="text-2xl font-bold">{t("school.dashboard.nav.guide")}</h1>

			<div className="mt-6">
				<RequestsInbox schoolId={school.id} onChange={refresh} />
			</div>

			<div className="mt-6">
				<LessonsCalendar bookings={bookings} instructors={instructors} />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<EnrollmentsInbox schoolId={school.id} />
				<InstructorsManager schoolId={school.id} onChange={refresh} />
				<ServiceSettings
					schoolId={school.id}
					initialDuration={school.lesson_duration_min}
					initialEnabled={school.booking_enabled}
					onSaved={refresh}
				/>
				<AvailabilityEditor schoolId={school.id} onSaved={refresh} />
			</div>
		</DrivingSchoolLayout>
	);
}
