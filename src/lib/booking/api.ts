import { supabase } from "@/lib/supabase";
import type { Booking, Instructor, Student } from "./types";

// ── reads ──
export async function listSchoolBookings(schoolId: string): Promise<Booking[]> {
	const { data, error } = await supabase
		.from("bookings")
		.select("*")
		.eq("school_id", schoolId)
		.order("starts_at", { ascending: true });
	if (error) throw error;
	return (data ?? []) as Booking[];
}
export async function listMyBookings(): Promise<Booking[]> {
	const { data, error } = await supabase
		.from("bookings")
		.select(
			"*, driving_school:driving_schools ( cancellation_policy, cancellation_cutoff_hours )",
		)
		.order("starts_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as Booking[];
}
export async function listInstructors(schoolId: string): Promise<Instructor[]> {
	const { data, error } = await supabase
		.from("instructors")
		.select("*")
		.eq("school_id", schoolId)
		.order("name");
	if (error) throw error;
	return (data ?? []) as Instructor[];
}
export async function listSchoolEnrollments(
	schoolId: string,
): Promise<Student[]> {
	const { data, error } = await supabase
		.from("students")
		.select("*")
		.eq("school_id", schoolId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as Student[];
}

export interface EnrollmentRequest {
	enrollment_id: string;
	student_id: string;
	full_name: string | null;
	email: string | null;
	licence_code: string | null;
	created_at: string;
}
/** Pending enrollment requests at a school, resolved with student name + email. */
export async function listEnrollmentRequests(
	schoolId: string,
): Promise<EnrollmentRequest[]> {
	const { data, error } = await supabase.rpc("list_enrollment_requests", {
		p_school_id: schoolId,
	});
	if (error) throw error;
	return (data as EnrollmentRequest[]) ?? [];
}
/** Resolve a search-result place_id to its accepted driving_schools row (id + contact + booking flag). */
export async function getAcceptedSchoolByPlaceId(placeId: string): Promise<{
	id: string;
	email: string | null;
	booking_enabled: boolean;
} | null> {
	const { data, error } = await supabase
		.from("driving_schools")
		.select("id, email, booking_enabled")
		.eq("place_id", placeId)
		.eq("status", "accepted")
		.maybeSingle();
	if (error) throw error;
	return (
		(data as { id: string; email: string | null; booking_enabled: boolean }) ??
		null
	);
}

/** Prefers an active enrollment over a stale pending one at another school
 * (a student can hold a pending request elsewhere while already active
 * somewhere else — see approve_enrollment, which only decides the row it's
 * given). Fetches all matching rows and picks deterministically in JS rather
 * than relying on an unspecified Postgres row order. */
export async function getMyEnrollment(): Promise<Student | null> {
	const { data, error } = await supabase
		.from("students")
		.select("*")
		.in("status", ["pending", "active"]);
	if (error) throw error;
	const rows = (data as Student[]) ?? [];
	return rows.find((r) => r.status === "active") ?? rows[0] ?? null;
}

/** Current student's saved phone, for prefilling the enrollment dialog. */
export async function getMyContact(): Promise<{ phone: string | null } | null> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;
	const { data } = await supabase
		.from("profiles")
		.select("phone")
		.eq("id", user.id)
		.maybeSingle();
	return (data as { phone: string | null }) ?? null;
}

// ── instructor CRUD (RLS-guarded direct writes) ──
export async function addInstructor(
	schoolId: string,
	name: string,
): Promise<void> {
	const { error } = await supabase
		.from("instructors")
		.insert({ school_id: schoolId, name });
	if (error) throw error;
}
export async function setInstructorActive(
	id: string,
	active: boolean,
): Promise<void> {
	const { error } = await supabase
		.from("instructors")
		.update({ active })
		.eq("id", id);
	if (error) throw error;
}
export async function renameInstructor(
	id: string,
	name: string,
): Promise<void> {
	const { error } = await supabase
		.from("instructors")
		.update({ name })
		.eq("id", id);
	if (error) throw error;
}
export async function setInstructorColor(
	id: string,
	color: string,
): Promise<void> {
	const { error } = await supabase
		.from("instructors")
		.update({ color })
		.eq("id", id);
	if (error) throw error;
}
export async function deleteInstructor(id: string): Promise<void> {
	const { error } = await supabase.from("instructors").delete().eq("id", id);
	if (error) throw error;
}

// ── availability (school weekly hours + per-instructor weekly hours) ──
export interface AvailabilityRow {
	weekday: number; // ISO 1=Mon … 7=Sun
	start_time: string; // "HH:MM" or "HH:MM:SS"
	end_time: string;
}
export async function listInstructorAvailability(
	instructorId: string,
): Promise<AvailabilityRow[]> {
	const { data, error } = await supabase
		.from("instructor_availability")
		.select("weekday, start_time, end_time")
		.eq("instructor_id", instructorId)
		.order("weekday");
	if (error) throw error;
	return (data ?? []) as AvailabilityRow[];
}
/** Replace all availability rows for one instructor. */
export async function setInstructorAvailability(
	instructorId: string,
	rows: AvailabilityRow[],
): Promise<void> {
	const del = await supabase
		.from("instructor_availability")
		.delete()
		.eq("instructor_id", instructorId);
	if (del.error) throw del.error;
	if (rows.length === 0) return;
	const ins = await supabase
		.from("instructor_availability")
		.insert(rows.map((r) => ({ ...r, instructor_id: instructorId })));
	if (ins.error) throw ins.error;
}

/** Available lesson start timestamps (ISO) for a school on a given day (YYYY-MM-DD). */
export async function listAvailableSlots(
	schoolId: string,
	dayISO: string,
	instructorId?: string,
): Promise<string[]> {
	const { data, error } = await supabase.rpc("list_available_slots", {
		p_school_id: schoolId,
		p_day: dayISO,
		p_instructor_id: instructorId ?? null,
	});
	if (error) throw error;
	return (data as string[]) ?? [];
}

export interface EnrolledStudent {
	student_id: string; // students.id
	full_name: string | null;
	email: string | null;
	phone: string | null;
	licence_code: string | null;
	is_claimed: boolean;
	claim_token: string | null; // set only while unclaimed
}
/** Active enrolled students at a school (for the school's assign picker). */
export async function listEnrolledStudents(
	schoolId: string,
): Promise<EnrolledStudent[]> {
	const { data, error } = await supabase.rpc("list_enrolled_students", {
		p_school_id: schoolId,
	});
	if (error) throw error;
	return (data as EnrolledStudent[]) ?? [];
}

/**
 * School edits a student's editable info (name, phone, licence). Email is the
 * login identity and cannot be changed here. `null` fields are left unchanged;
 * pass an empty string to clear phone/licence. Guarded server-side: caller must
 * own the school (or be admin) and the student must be actively enrolled.
 */
export async function updateStudentAsSchool(
	schoolId: string,
	studentId: string,
	fields: {
		full_name?: string;
		phone?: string | null;
		licence_code?: string | null;
		email?: string; // editable only while the student is unclaimed
	},
): Promise<void> {
	const { error } = await supabase.rpc("school_update_student", {
		p_school_id: schoolId,
		p_student_id: studentId,
		p_full_name: fields.full_name ?? null,
		p_phone: fields.phone ?? null,
		p_licence_code: fields.licence_code ?? null,
		p_email: fields.email ?? null,
	});
	if (error) throw error;
}

/** School edits an existing lesson (student / instructor / start time). */
export async function updateBookingAsSchool(
	bookingId: string,
	studentId: string,
	instructorId: string,
	startsAt: string,
): Promise<void> {
	const { error } = await supabase.rpc("update_booking_as_school", {
		p_booking_id: bookingId,
		p_student_id: studentId,
		p_instructor_id: instructorId,
		p_starts_at: startsAt,
	});
	if (error) throw error;
}

/** School schedules a confirmed lesson for a chosen student + instructor. */
export async function createBookingAsSchool(
	schoolId: string,
	studentId: string,
	instructorId: string,
	startsAt: string,
): Promise<string> {
	const { data, error } = await supabase.rpc("create_booking_as_school", {
		p_school_id: schoolId,
		p_student_id: studentId,
		p_instructor_id: instructorId,
		p_starts_at: startsAt,
	});
	if (error) throw error;
	const id = data as string;
	// School-created drives are confirmed on creation → email the student, same
	// as a manual confirm. Best-effort; gated server-side by the student's pref.
	await notifyBooking("booking_confirmed", id);
	return id;
}

/** Confirm every pending request at the school by assigning a free instructor.
 * Returns how many were confirmed. Used when auto-confirm is switched on. */
export async function confirmPendingRequests(
	schoolId: string,
): Promise<number> {
	const { data, error } = await supabase.rpc("confirm_pending_requests", {
		p_school_id: schoolId,
	});
	if (error) throw error;
	return (data as number) ?? 0;
}

// ── service settings (RLS-guarded; owner policy on driving_schools) ──
export async function setServiceSettings(
	schoolId: string,
	durationMin: number,
	enabled: boolean,
	autoConfirm: boolean,
	cancellationPolicy: "always" | "no_cancel" | "custom",
	cancellationCutoffHours: number,
): Promise<void> {
	const { error } = await supabase
		.from("driving_schools")
		.update({
			lesson_duration_min: durationMin,
			booking_enabled: enabled,
			auto_confirm: autoConfirm,
			cancellation_policy: cancellationPolicy,
			cancellation_cutoff_hours: cancellationCutoffHours,
		})
		.eq("id", schoolId);
	if (error) throw error;
}

// ── school email settings (RLS-guarded; owner policy on driving_schools) ──
export async function setEmailSettings(
	schoolId: string,
	schoolRequest: boolean,
): Promise<void> {
	const { error } = await supabase
		.from("driving_schools")
		.update({ email_school_request: schoolRequest })
		.eq("id", schoolId);
	if (error) throw error;
}
export async function getEmailSettings(
	schoolId: string,
): Promise<{ schoolRequest: boolean }> {
	const { data, error } = await supabase
		.from("driving_schools")
		.select("email_school_request")
		.eq("id", schoolId)
		.single();
	if (error) throw error;
	const row = data as { email_school_request: boolean };
	return { schoolRequest: row.email_school_request };
}

// ── student email preference (RLS-guarded; profiles_own_row) ──
/** Whether the current student wants drive-confirmation emails. */
export async function getMyEmailConfirmations(): Promise<boolean> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return true;
	const { data, error } = await supabase
		.from("profiles")
		.select("email_confirmations")
		.eq("id", user.id)
		.single();
	if (error) throw error;
	return (data as { email_confirmations: boolean }).email_confirmations;
}
export async function setMyEmailConfirmations(value: boolean): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("not_authenticated");
	const { error } = await supabase
		.from("profiles")
		.update({ email_confirmations: value })
		.eq("id", user.id);
	if (error) throw error;
}

// ── notifications (best-effort, never blocks the user action) ──
async function notify(
	event: string,
	to: string | null | undefined,
	body?: string,
): Promise<void> {
	if (!to) return;
	try {
		await supabase.functions.invoke("notify", { body: { event, to, body } });
	} catch {
		/* email is best-effort */
	}
}

/** Booking-aware notify: the edge function loads the drive + school toggles
 * server-side, so the client only passes the booking id. Best-effort. */
async function notifyBooking(
	event:
		| "booking_confirmed"
		| "booking_requested"
		| "booking_declined"
		| "booking_cancelled",
	bookingId: string,
): Promise<void> {
	try {
		await supabase.functions.invoke("notify", { body: { event, bookingId } });
	} catch {
		/* email is best-effort */
	}
}

// ── RPC mutations (throw on error; caller maps .message to i18n) ──
async function rpc(
	fn: string,
	args: Record<string, unknown>,
): Promise<unknown> {
	const { data, error } = await supabase.rpc(fn, args);
	if (error) throw error;
	return data;
}

export const requestEnrollment = async (
	schoolId: string,
	licence: string,
	phone: string,
	schoolEmail?: string,
) => {
	const id = await rpc("request_enrollment", {
		p_school_id: schoolId,
		p_licence_code: licence,
		p_phone: phone,
	});
	await notify("enrollment_requested", schoolEmail);
	return id;
};
export const approveEnrollment = async (id: string, studentEmail?: string) => {
	await rpc("approve_enrollment", { p_enrollment_id: id });
	await notify("enrollment_approved", studentEmail);
};
export const rejectEnrollment = (id: string) =>
	rpc("reject_enrollment", { p_enrollment_id: id });

/** School manually adds a student who hasn't registered. Returns students.id. */
export const addStudentManual = (
	schoolId: string,
	fields: {
		full_name: string;
		email: string;
		phone?: string;
		licence_code?: string;
	},
) =>
	rpc("add_student_manual", {
		p_school_id: schoolId,
		p_full_name: fields.full_name,
		p_email: fields.email,
		p_phone: fields.phone ?? null,
		p_licence_code: fields.licence_code ?? null,
	}) as Promise<string>;

/** Logged-in student claims a manually-added record via its token. */
export const claimStudentRecord = (token: string) =>
	rpc("claim_student_record", { p_token: token }) as Promise<string>;

/** Remove a student: hard-delete for unclaimed mistake rows without bookings,
 * soft (status='left') otherwise. */
export const removeStudent = (studentId: string) =>
	rpc("remove_student", { p_student_id: studentId }) as Promise<void>;

export const requestBooking = async (
	schoolId: string,
	startsAt: string,
	preferredInstructorId?: string,
) => {
	const id = (await rpc("request_booking", {
		p_school_id: schoolId,
		p_starts_at: startsAt,
		p_preferred_instructor_id: preferredInstructorId ?? null,
	})) as string;
	await notifyBooking("booking_requested", id);
	return id;
};
export const confirmBooking = async (
	id: string,
	instructorId: string,
	startsAt?: string,
) => {
	await rpc("confirm_booking", {
		p_booking_id: id,
		p_instructor_id: instructorId,
		p_starts_at: startsAt ?? null,
	});
	await notifyBooking("booking_confirmed", id);
};
export const declineBooking = async (id: string, reason?: string) => {
	await rpc("decline_booking", { p_booking_id: id, p_reason: reason ?? null });
	await notifyBooking("booking_declined", id);
};
export const cancelBooking = async (id: string, reason?: string) => {
	await rpc("cancel_booking", { p_booking_id: id, p_reason: reason ?? null });
	await notifyBooking("booking_cancelled", id);
};
