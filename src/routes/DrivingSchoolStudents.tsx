import {
	Check,
	GraduationCap,
	Link2,
	Mail,
	Pencil,
	Phone,
	Search,
	UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EnrollmentsInbox } from "@/components/booking/EnrollmentsInbox";
import { AddStudentDialog } from "@/components/driving-school/AddStudentDialog";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { InviteLinkCard } from "@/components/driving-school/InviteLinkCard";
import { StudentEditSheet } from "@/components/driving-school/StudentEditSheet";
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

	const [schoolId, setSchoolId] = useState<string | null>(null);
	const [schoolName, setSchoolName] = useState<string | null>(null);
	const [placeId, setPlaceId] = useState<string | null>(null);
	const [students, setStudents] = useState<EnrolledStudent[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");

	// Sheet state
	const [editTarget, setEditTarget] = useState<EnrolledStudent | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	// Add-student dialog + claim-link copy feedback
	const [addOpen, setAddOpen] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
		};
	}, []);

	async function copyClaimLink(s: EnrolledStudent) {
		if (!s.claim_token) return;
		await navigator.clipboard.writeText(
			`${window.location.origin}/claim/${s.claim_token}`,
		);
		setCopiedId(s.student_id);
		if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
		copiedTimeoutRef.current = setTimeout(() => {
			setCopiedId(null);
			copiedTimeoutRef.current = null;
		}, 2000);
	}

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select("id, name, place_id")
			.eq("user_id", user.id)
			.eq("status", "accepted")
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(async ({ data }) => {
				const row = data as {
					id: string;
					name: string | null;
					place_id: string | null;
				} | null;
				setSchoolName(row?.name ?? null);
				setPlaceId(row?.place_id ?? null);
				if (row?.id) {
					setSchoolId(row.id);
					setStudents(await listEnrolledStudents(row.id).catch(() => []));
				}
				setLoading(false);
			});
	}, [user]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return students;
		return students.filter(
			(s) =>
				s.full_name?.toLowerCase().includes(q) ||
				s.email?.toLowerCase().includes(q) ||
				s.phone?.toLowerCase().includes(q),
		);
	}, [students, query]);

	function openEdit(student: EnrolledStudent) {
		setEditTarget(student);
		setSheetOpen(true);
	}

	async function handleSaved() {
		if (!schoolId) return;
		setStudents(await listEnrolledStudents(schoolId).catch(() => []));
	}

	return (
		<DrivingSchoolLayout schoolName={schoolName ?? undefined}>
			<header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
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
					<button
						type="button"
						onClick={() => setAddOpen(true)}
						className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
					>
						<UserPlus size={15} aria-hidden />
						{t("booking.school.addStudent")}
					</button>
				</div>

				{placeId && schoolName && (
					<div className="w-full shrink-0 lg:max-w-md">
						<InviteLinkCard placeId={placeId} schoolName={schoolName} />
					</div>
				)}
			</header>

			{schoolId && (
				<section className="mb-8">
					<div className="mb-4 flex items-center gap-3">
						<h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
							{t("booking.school.enrollments")}
						</h2>
						<span className="h-px flex-1 bg-line" />
					</div>
					<EnrollmentsInbox schoolId={schoolId} />
				</section>
			)}

			{loading ? (
				/* Skeleton */
				<div className="space-y-2">
					{["a", "b", "c", "d"].map((k) => (
						<div
							key={k}
							className="h-[4.5rem] animate-pulse rounded-[0.875rem] bg-bg-sunken"
						/>
					))}
				</div>
			) : students.length === 0 ? (
				<div className="rounded-[1.5rem] border border-line bg-bg-raised p-10 text-center">
					<p className="text-sm text-ink-muted">
						{t("booking.school.noStudents")}
					</p>
				</div>
			) : (
				<>
					{/* Search */}
					<div className="relative mb-4 max-w-sm">
						<Search
							size={15}
							aria-hidden
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
						/>
						<input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={t("booking.school.searchStudents")}
							className="w-full rounded-[0.5rem] border border-line bg-bg py-2 pr-3 pl-8 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-line-strong focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
						/>
					</div>

					{filtered.length === 0 ? (
						<p className="py-10 text-center text-sm text-ink-muted">
							{t("booking.school.noMatch")}
						</p>
					) : (
						<ul className="divide-y divide-line overflow-hidden rounded-[0.875rem] border border-line bg-bg-raised">
							{filtered.map((s) => (
								<li
									key={s.student_id}
									className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-bg-sunken"
								>
									{/* Avatar */}
									<span
										aria-hidden
										className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
											s.is_claimed
												? "bg-brand-soft text-brand-ink"
												: "bg-warning-soft text-warning-ink"
										}`}
									>
										{initials(s.full_name)}
									</span>

									{/* Main info */}
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate text-sm font-semibold text-ink">
												{s.full_name ?? (
													<span className="text-ink-faint">
														{t("booking.school.student")}
													</span>
												)}
											</p>
											{!s.is_claimed && (
												<span className="inline-flex shrink-0 items-center rounded-full bg-bg-sunken px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint">
													{t("booking.school.unclaimedBadge")}
												</span>
											)}
										</div>

										<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
											{s.email && (
												<span className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
													<Mail size={12} aria-hidden className="shrink-0" />
													<span className="truncate">{s.email}</span>
												</span>
											)}

											{s.phone ? (
												<span className="flex items-center gap-1 text-xs text-ink-muted">
													<Phone size={12} aria-hidden className="shrink-0" />
													<span>{s.phone}</span>
												</span>
											) : (
												<span className="text-xs text-ink-faint">
													{t("booking.school.noPhone")}
												</span>
											)}
										</div>
									</div>

									{/* Licence badge */}
									<div className="shrink-0">
										{s.licence_code ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-ink">
												<GraduationCap
													size={11}
													aria-hidden
													className="shrink-0"
												/>
												{s.licence_code}
											</span>
										) : (
											<span className="text-xs text-ink-faint">
												{t("booking.school.noLicence")}
											</span>
										)}
									</div>

									{/* Copy claim link (unclaimed rows only) */}
									{!s.is_claimed && s.claim_token && (
										<button
											type="button"
											aria-label={
												copiedId === s.student_id
													? t("booking.school.claimLinkCopied")
													: t("booking.school.copyClaimLink")
											}
											aria-live="polite"
											onClick={() => copyClaimLink(s)}
											className="ml-1 flex shrink-0 items-center justify-center rounded-[0.5rem] p-1.5 text-ink-faint transition-colors duration-150 hover:bg-bg hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
										>
											{copiedId === s.student_id ? (
												<Check size={15} aria-hidden className="text-brand" />
											) : (
												<Link2 size={15} aria-hidden />
											)}
										</button>
									)}

									{/* Edit button */}
									<button
										type="button"
										aria-label={t("booking.school.editStudent")}
										onClick={() => openEdit(s)}
										className="ml-1 flex shrink-0 items-center justify-center rounded-[0.5rem] p-1.5 text-ink-faint transition-colors duration-150 hover:bg-bg hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
									>
										<Pencil size={15} aria-hidden />
									</button>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{schoolId && (
				<AddStudentDialog
					schoolId={schoolId}
					open={addOpen}
					onOpenChange={setAddOpen}
					onAdded={handleSaved}
				/>
			)}

			{schoolId && (
				<StudentEditSheet
					schoolId={schoolId}
					student={editTarget}
					open={sheetOpen}
					onOpenChange={setSheetOpen}
					onSaved={handleSaved}
				/>
			)}
		</DrivingSchoolLayout>
	);
}
