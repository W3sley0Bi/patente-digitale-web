import { ArrowRight, CalendarClock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { EnrollBlockedDialog } from "@/components/booking/EnrollBlockedDialog";
import { AppSchoolFinderPanel } from "@/components/booking/school-finder/AppSchoolFinderPanel";
import { CalendarPreference } from "@/components/student/CalendarPreference";
import { StatusChangeBanner } from "@/components/student/StatusChangeBanner";
import { StudentLayout } from "@/components/student/StudentLayout";
import { useProfile } from "@/hooks/useProfile";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
	listMyBookings,
} from "@/lib/booking/api";
import { effectiveStatus } from "@/lib/booking/helpers";
import type { Booking, Student } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";

type SchoolInfo = {
	name: string | null;
};

function EnrollmentStatusCard({
	loading,
	enrollment,
	school,
}: {
	loading: boolean;
	enrollment: Student | null;
	school: SchoolInfo | null;
}) {
	const { t } = useTranslation();

	if (loading) {
		return <div className="mt-6 h-16 animate-pulse rounded-2xl bg-bg-sunken" />;
	}

	const status = enrollment?.status;

	// Not enrolled (or rejected/left) → the finder panel renders below this card
	if (!enrollment || status === "rejected" || status === "left") {
		return (
			<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-6 text-center">
				<p className="text-sm text-ink-muted">
					{t("booking.student.notEnrolled")}
				</p>
			</div>
		);
	}

	return (
		<div className="mt-6 rounded-2xl border border-line bg-brand-soft/30 px-5 py-4">
			<p className="text-sm font-bold text-brand-ink">
				{status === "active"
					? t("booking.student.enrolledAt", { school: school?.name ?? "—" })
					: t("booking.student.pending", { school: school?.name ?? "—" })}
			</p>
		</div>
	);
}

/**
 * Handles an enrollment deep link (?placeId=) for students who already have an
 * ACTIVE enrollment. In that case the school finder isn't rendered at all, so
 * EnrollButton can never surface its "blocked" state — this covers the gap by
 * popping a dismissable modal explaining that the account can't enroll at
 * another school. Arriving with the placeId of the school they're already
 * enrolled at shows nothing: the status card above already says so.
 */
function DeepLinkBlockedCheck({ enrollment }: { enrollment: Student }) {
	const [searchParams] = useSearchParams();
	// Only the placeId present when the dashboard mounted counts as a deep link.
	const deepLinkPlaceIdRef = useRef(searchParams.get("placeId"));
	const checkedRef = useRef(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const placeId = deepLinkPlaceIdRef.current;
		if (!placeId || checkedRef.current) return;
		checkedRef.current = true;
		let cancelled = false;
		getAcceptedSchoolByPlaceId(placeId)
			.then((s) => {
				// Different school than the active enrollment → explain the block.
				if (!cancelled && s && s.id !== enrollment.school_id) setOpen(true);
			})
			.catch(() => {
				/* unresolvable placeId → nothing to explain */
			});
		return () => {
			cancelled = true;
		};
	}, [enrollment.school_id]);

	return <EnrollBlockedDialog open={open} onOpenChange={setOpen} />;
}

function LessonsGlance() {
	const { t, i18n } = useTranslation();
	const [bookings, setBookings] = useState<Booking[]>([]);

	useEffect(() => {
		listMyBookings()
			.then(setBookings)
			.catch(() => setBookings([]));
	}, []);

	const { nextLesson, pendingCount } = useMemo(() => {
		const now = Date.now();
		let next: Booking | null = null;
		let pending = 0;
		for (const b of bookings) {
			const st = effectiveStatus(b);
			if (st === "pending") pending += 1;
			if (
				st === "confirmed" &&
				new Date(b.starts_at).getTime() >= now &&
				(!next || b.starts_at < next.starts_at)
			) {
				next = b;
			}
		}
		return { nextLesson: next, pendingCount: pending };
	}, [bookings]);

	const nextDatetime = nextLesson
		? new Date(nextLesson.starts_at).toLocaleString(i18n.language, {
				dateStyle: "medium",
				timeStyle: "short",
			})
		: null;

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-6">
			<div className="flex items-start gap-3">
				<CalendarClock
					size={20}
					aria-hidden="true"
					className="mt-0.5 shrink-0 text-ink-muted"
				/>
				<div className="min-w-0">
					<p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
						{t("student.dashboard.nextLesson")}
					</p>
					<p className="mt-1 text-sm font-bold text-ink">
						{nextDatetime ?? t("student.dashboard.noUpcoming")}
					</p>
					{pendingCount > 0 && (
						<p className="mt-1 text-sm text-ink-muted">
							{t("student.dashboard.pendingCount", { count: pendingCount })}
						</p>
					)}
				</div>
			</div>

			<Link
				to="/app/student/drive-bookings"
				className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
			>
				{t("student.dashboard.goToGuide")}
				<ArrowRight size={15} aria-hidden="true" />
			</Link>
		</div>
	);
}

function CompleteNamePrompt() {
	const { t } = useTranslation();
	const { profile, refresh } = useProfile();
	const [value, setValue] = useState("");
	const [saving, setSaving] = useState(false);

	if (!profile || profile.full_name?.trim()) return null;

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		const full_name = value.trim();
		if (!full_name) return;
		setSaving(true);
		const { error } = await supabase
			.from("profiles")
			.update({ full_name })
			.eq("id", profile.id);
		setSaving(false);
		if (!error) await refresh();
	};

	return (
		<form
			onSubmit={save}
			className="mt-6 rounded-2xl border border-line bg-brand-soft/30 p-5"
		>
			<p className="text-sm font-bold text-brand-ink">
				{t("student.profile.completeTitle")}
			</p>
			<p className="mt-1 text-sm text-ink-muted">
				{t("student.profile.completeBody")}
			</p>
			<div className="mt-3 flex gap-2">
				<input
					type="text"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					required
					autoComplete="name"
					placeholder={t("auth.form.fullName")}
					className="flex-1 rounded-lg border bg-bg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-ink/20"
				/>
				<button
					type="submit"
					disabled={saving}
					className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
				>
					{saving ? t("student.profile.saving") : t("student.profile.save")}
				</button>
			</div>
		</form>
	);
}

export default function StudentDashboard() {
	const { t } = useTranslation();
	const { profile } = useProfile();
	const name = profile?.full_name?.split(" ")[0];

	const [enrollment, setEnrollment] = useState<Student | null>(null);
	const [school, setSchool] = useState<SchoolInfo | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getMyEnrollment()
			.then(async (e) => {
				setEnrollment(e);
				if (e) {
					const { data } = await supabase
						.from("driving_schools")
						.select("name")
						.eq("id", e.school_id)
						.maybeSingle();
					setSchool((data as SchoolInfo) ?? null);
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const isActive = enrollment?.status === "active";

	return (
		<StudentLayout>
			<div className="mx-auto max-w-5xl pb-12">
				<h1 className="text-2xl font-bold">
					{name
						? t("booking.student.greeting", { name })
						: t("student.dashboard.title")}
				</h1>
				<CompleteNamePrompt />

				<EnrollmentStatusCard
					loading={loading}
					enrollment={enrollment}
					school={school}
				/>
				{!loading && !isActive && <AppSchoolFinderPanel />}
				{!loading && isActive && enrollment && (
					<DeepLinkBlockedCheck enrollment={enrollment} />
				)}
				<StatusChangeBanner />
				<LessonsGlance />
				{isActive && <CalendarPreference />}
			</div>
		</StudentLayout>
	);
}
