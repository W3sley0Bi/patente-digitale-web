import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AttentionItem } from "@/components/driving-school/DashboardAttention";
import { DashboardAttention } from "@/components/driving-school/DashboardAttention";
import { DashboardPending } from "@/components/driving-school/DashboardPending";
import { DashboardStats } from "@/components/driving-school/DashboardStats";
import type { UpcomingLesson } from "@/components/driving-school/DashboardUpcoming";
import { DashboardUpcoming } from "@/components/driving-school/DashboardUpcoming";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { Nav } from "@/components/nav/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { EnrollmentRequest } from "@/lib/booking/api";
import {
	listEnrollmentRequests,
	listInstructors,
	listSchoolBookings,
	listSchoolEnrollments,
} from "@/lib/booking/api";
import { effectiveStatus, isInCurrentWeek } from "@/lib/booking/helpers";
import type { Booking, Instructor, Student } from "@/lib/booking/types";
import { supabase } from "@/lib/supabase";

interface DashboardData {
	students: Student[];
	bookings: Booking[];
	instructors: Instructor[];
	enrollmentRequests: EnrollmentRequest[];
}
const EMPTY_DATA: DashboardData = {
	students: [],
	bookings: [],
	instructors: [],
	enrollmentRequests: [],
};

interface ClaimRow {
	id: string;
	status: "pending" | "accepted" | "rejected";
	name: string;
	lesson_duration_min: number | null;
	booking_enabled: boolean;
}

export default function DrivingSchoolDashboard() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const {
		approved,
		loading: profileLoading,
		refresh: refreshProfile,
	} = useProfile();
	const [claim, setClaim] = useState<ClaimRow | null>(null);
	const [claimLoading, setClaimLoading] = useState(true);
	const [domainClaimDone, setDomainClaimDone] = useState(false);
	const [rpcError, setRpcError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const retryCountRef = useRef(0);
	const MAX_RETRIES = 1;
	const [data, setData] = useState<DashboardData>(EMPTY_DATA);
	const [dataLoading, setDataLoading] = useState(true);

	const fetchClaim = async (userId: string) => {
		const { data } = await supabase
			.from("driving_schools")
			.select("id, status, name, lesson_duration_min, booking_enabled")
			.eq("user_id", userId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		setClaim(data ? (data as ClaimRow) : null);
	};

	useEffect(() => {
		if (!user) return;
		setClaimLoading(true);
		fetchClaim(user.id).finally(() => setClaimLoading(false));
	}, [user]);

	useEffect(() => {
		if (!user || profileLoading || approved || domainClaimDone) return;
		const stored = localStorage.getItem("domain_claim");
		if (!stored) {
			console.warn(
				"[auto-claim] no domain_claim in localStorage — skipping. User likely clicked magic link in a different browser than where they entered their email.",
			);
			return;
		}

		// Guard: if the user already has a manual pending claim, the domain_claim is stale — drop it.
		supabase
			.from("driving_schools")
			.select("id")
			.eq("user_id", user.id)
			.eq("status", "pending")
			.maybeSingle()
			.then(({ data: existingClaim }) => {
				if (existingClaim) {
					console.warn(
						"[auto-claim] skipped: existing driving_schools row found",
						existingClaim,
					);
					localStorage.removeItem("domain_claim");
					return;
				}

				if (retryCountRef.current >= MAX_RETRIES) {
					console.warn("[auto-claim] max retries reached — giving up.");
					setRpcError(
						t("school.dashboard.rpcError", { message: "max retries reached" }),
					);
					return;
				}

				const {
					_placeId,
					name,
					address,
					city,
					zip,
					region,
					phone,
					website,
					lat,
					lng,
					openingHours,
				} = JSON.parse(stored);
				setDomainClaimDone(true);
				retryCountRef.current += 1;
				console.info("[auto-claim] calling claim_driving_school_via_domain", {
					_placeId,
					name,
					attempt: retryCountRef.current,
				});
				supabase
					.rpc("claim_driving_school_via_domain", {
						p_place_id: _placeId,
						p_school_name: name,
						p_address: address ?? null,
						p_city: city ?? null,
						p_zip: zip ?? null,
						p_region: region ?? null,
						p_phone: phone ?? null,
						p_website: website ?? null,
						p_lat: lat ?? null,
						p_lng: lng ?? null,
						p_opening_hours: openingHours ? JSON.stringify(openingHours) : null,
					})
					.then(({ data, error }) => {
						if (!error) {
							console.info("[auto-claim] success", data);
							localStorage.removeItem("domain_claim");
							supabase.auth.refreshSession();
						} else {
							console.error("[auto-claim] RPC failed:", error);
							if (retryCountRef.current >= MAX_RETRIES) {
								setRpcError(
									t("school.dashboard.rpcError", { message: error.message }),
								);
							} else {
								setDomainClaimDone(false);
							}
						}
					});
			});
	}, [user, profileLoading, approved, domainClaimDone, t]);

	const handleRefresh = async () => {
		if (!user) return;
		setRefreshing(true);
		await Promise.all([refreshProfile(), fetchClaim(user.id)]);
		setRefreshing(false);
	};

	useEffect(() => {
		if (!approved || !claim?.id) return;
		setDataLoading(true);
		Promise.all([
			listSchoolEnrollments(claim.id),
			listSchoolBookings(claim.id),
			listInstructors(claim.id),
			listEnrollmentRequests(claim.id),
		])
			.then(([students, bookings, instructors, enrollmentRequests]) => {
				setData({ students, bookings, instructors, enrollmentRequests });
			})
			.catch(() => setData(EMPTY_DATA))
			.finally(() => setDataLoading(false));
	}, [approved, claim?.id]);

	const {
		activeStudents,
		lessonsThisWeek,
		activeInstructors,
		upcomingLessons,
	} = useMemo(() => {
		const studentNameById = new Map(
			data.students.map((s) => [s.id, s.full_name ?? "—"]),
		);
		const instructorNameById = new Map(
			data.instructors.map((i) => [i.id, i.name]),
		);
		const now = new Date();
		const activeStudents = data.students.filter(
			(s) => s.status === "active",
		).length;
		const activeInstructors = data.instructors.filter((i) => i.active).length;
		const lessonsThisWeek = data.bookings.filter(
			(b) =>
				effectiveStatus(b, now) === "confirmed" &&
				isInCurrentWeek(b.starts_at, now),
		).length;
		const upcomingLessons: UpcomingLesson[] = data.bookings
			.filter(
				(b) =>
					effectiveStatus(b, now) === "confirmed" &&
					new Date(b.starts_at).getTime() >= now.getTime(),
			)
			.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
			.slice(0, 5)
			.map((b) => ({
				id: b.id,
				studentName: studentNameById.get(b.student_id) ?? "—",
				instructorName: b.instructor_id
					? (instructorNameById.get(b.instructor_id) ?? "—")
					: t("booking.school.unassigned"),
				startsAt: b.starts_at,
			}));
		return {
			activeStudents,
			lessonsThisWeek,
			activeInstructors,
			upcomingLessons,
		};
	}, [data, t]);

	const attentionItems: AttentionItem[] = useMemo(() => {
		const studentNameById = new Map(
			data.students.map((s) => [s.id, s.full_name ?? "—"]),
		);
		const now = new Date();
		const enrollmentItems: AttentionItem[] = data.enrollmentRequests.map(
			(r) => ({
				id: r.enrollment_id,
				type: "enrollment",
				name: r.full_name ?? r.email ?? "—",
				createdAt: r.created_at,
				href: "/app/driving-school/students",
			}),
		);
		const bookingItems: AttentionItem[] = data.bookings
			.filter((b) => effectiveStatus(b, now) === "pending")
			.map((b) => ({
				id: b.id,
				type: "booking",
				name: studentNameById.get(b.student_id) ?? "—",
				createdAt: b.created_at,
				href: "/app/driving-school/drive-bookings",
			}));
		return [...enrollmentItems, ...bookingItems].sort((a, b) =>
			b.createdAt.localeCompare(a.createdAt),
		);
	}, [data]);

	if (profileLoading || claimLoading) {
		return (
			<div className="min-h-screen bg-bg flex items-center justify-center">
				<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
			</div>
		);
	}

	if (!approved) {
		let pendingStatus: "pending" | "rejected" | "no-claim";
		if (claim?.status === "rejected") {
			pendingStatus = "rejected";
		} else if (claim?.status === "pending") {
			pendingStatus = "pending";
		} else {
			// No claim row and no active domain_claim in localStorage
			pendingStatus = "no-claim";
		}

		return (
			<div className="min-h-screen bg-bg text-ink">
				<Nav />
				<div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 gap-4">
					{rpcError && (
						<div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{rpcError}
						</div>
					)}
					<DashboardPending
						status={pendingStatus}
						onRefresh={pendingStatus === "pending" ? handleRefresh : undefined}
						refreshing={refreshing}
					/>
				</div>
			</div>
		);
	}

	const schoolName = claim?.name ?? t("school.dashboard.defaultName");

	return (
		<DrivingSchoolLayout schoolName={schoolName}>
			<h1 className="text-2xl font-bold">{schoolName}</h1>
			<p className="text-ink-muted mt-1 text-sm">
				{t("school.dashboard.subtitle")}
			</p>
			{dataLoading ? (
				<div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder count
							key={i}
							className="h-24 animate-pulse rounded-2xl bg-bg-sunken"
						/>
					))}
				</div>
			) : (
				<>
					<div className="mt-8">
						<DashboardStats
							activeStudents={activeStudents}
							lessonsThisWeek={lessonsThisWeek}
							pendingCount={attentionItems.length}
							activeInstructors={activeInstructors}
						/>
					</div>
					<DashboardAttention items={attentionItems} />
					<DashboardUpcoming lessons={upcomingLessons} />
				</>
			)}
		</DrivingSchoolLayout>
	);
}
