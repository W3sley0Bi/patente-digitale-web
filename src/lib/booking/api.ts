import { supabase } from "@/lib/supabase";
import type { Booking, Enrollment, Instructor } from "./types";

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
		.select("*")
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
): Promise<Enrollment[]> {
	const { data, error } = await supabase
		.from("enrollments")
		.select("*")
		.eq("school_id", schoolId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as Enrollment[];
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

export async function getMyEnrollment(): Promise<Enrollment | null> {
	const { data, error } = await supabase
		.from("enrollments")
		.select("*")
		.in("status", ["pending", "active"])
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return (data as Enrollment) ?? null;
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
	student_id: string;
	full_name: string | null;
	licence_code: string | null;
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
	return data as string;
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
): Promise<void> {
	const { error } = await supabase
		.from("driving_schools")
		.update({
			lesson_duration_min: durationMin,
			booking_enabled: enabled,
			auto_confirm: autoConfirm,
		})
		.eq("id", schoolId);
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
	licence?: string,
	schoolEmail?: string,
) => {
	const id = await rpc("request_enrollment", {
		p_school_id: schoolId,
		p_licence_code: licence ?? null,
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

export const requestBooking = async (
	schoolId: string,
	startsAt: string,
	schoolEmail?: string,
	preferredInstructorId?: string,
) => {
	const id = await rpc("request_booking", {
		p_school_id: schoolId,
		p_starts_at: startsAt,
		p_preferred_instructor_id: preferredInstructorId ?? null,
	});
	await notify("booking_requested", schoolEmail);
	return id;
};
export const confirmBooking = async (
	id: string,
	instructorId: string,
	startsAt?: string,
	studentEmail?: string,
) => {
	await rpc("confirm_booking", {
		p_booking_id: id,
		p_instructor_id: instructorId,
		p_starts_at: startsAt ?? null,
	});
	await notify("booking_confirmed", studentEmail);
};
export const declineBooking = async (
	id: string,
	reason?: string,
	studentEmail?: string,
) => {
	await rpc("decline_booking", { p_booking_id: id, p_reason: reason ?? null });
	await notify("booking_declined", studentEmail);
};
export const cancelBooking = async (
	id: string,
	reason?: string,
	otherEmail?: string,
) => {
	await rpc("cancel_booking", { p_booking_id: id, p_reason: reason ?? null });
	await notify("booking_cancelled", otherEmail);
};
