import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { InstructorsManager } from "@/components/booking/InstructorsManager";
import { LessonsCalendar } from "@/components/booking/LessonsCalendar";
import { RequestsInbox } from "@/components/booking/RequestsInbox";
import { ServiceSettings } from "@/components/booking/ServiceSettings";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { useAuth } from "@/hooks/useAuth";
import {
	type EnrolledStudent,
	listEnrolledStudents,
	listInstructors,
	listSchoolBookings,
} from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";

interface SchoolRow {
	id: string;
	name: string | null;
	lesson_duration_min: number | null;
	booking_enabled: boolean;
	auto_confirm: boolean;
	cancellation_policy: "always" | "no_cancel" | "custom";
	cancellation_cutoff_hours: number;
}

export default function DrivingSchoolGuide() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [school, setSchool] = useState<SchoolRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [instructors, setInstructors] = useState<Instructor[]>([]);
	const [students, setStudents] = useState<EnrolledStudent[]>([]);
	const [tick, setTick] = useState(0);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select(
				"id, name, lesson_duration_min, booking_enabled, auto_confirm, cancellation_policy, cancellation_cutoff_hours",
			)
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
		Promise.all([
			listSchoolBookings(school.id),
			listInstructors(school.id),
			listEnrolledStudents(school.id).catch(() => []),
		])
			.then(([b, i, s]) => {
				setBookings(b);
				setInstructors(i);
				setStudents(s);
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
			<header className="mb-8">
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink">
					{t("school.dashboard.nav.guide")}
				</p>
				<h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
					{school.name ?? t("school.dashboard.nav.guide")}
				</h1>
				<p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
					{t("booking.school.guideSubtitle")}
				</p>
			</header>

			{/* Pending requests (hidden when auto-confirm is on), then the schedule */}
			<div className="flex flex-col gap-6">
				{!school.auto_confirm && (
					<RequestsInbox
						schoolId={school.id}
						onChange={refresh}
						refreshKey={tick}
					/>
				)}
				<LessonsCalendar
					bookings={bookings}
					instructors={instructors}
					schoolId={school.id}
					durationMin={school.lesson_duration_min ?? 60}
					students={students}
					onChanged={refresh}
				/>
			</div>

			{/* Configuration */}
			<div className="mt-12">
				<div className="mb-5 flex items-center gap-3">
					<h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
						{t("booking.school.manageSection")}
					</h2>
					<span className="h-px flex-1 bg-line" />
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2">
						<InstructorsManager schoolId={school.id} onChange={refresh} />
					</div>
					<ServiceSettings
						schoolId={school.id}
						initialDuration={school.lesson_duration_min}
						initialAutoConfirm={school.auto_confirm}
						initialCancellationPolicy={school.cancellation_policy}
						initialCancellationCutoffHours={school.cancellation_cutoff_hours}
						pendingCount={bookings.filter((b) => b.status === "pending").length}
						onSaved={({
							duration,
							autoConfirm,
							cancellationPolicy,
							cancellationCutoffHours,
						}) => {
							setSchool((s) =>
								s
									? {
											...s,
											lesson_duration_min: duration,
											auto_confirm: autoConfirm,
											cancellation_policy: cancellationPolicy,
											cancellation_cutoff_hours: cancellationCutoffHours,
										}
									: s,
							);
							refresh();
						}}
					/>
				</div>
			</div>
		</DrivingSchoolLayout>
	);
}
