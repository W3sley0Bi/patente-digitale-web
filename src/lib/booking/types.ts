export type BookingStatus =
	| "pending"
	| "confirmed"
	| "declined"
	| "cancelled"
	| "completed";
export type EnrollmentStatus = "pending" | "active" | "rejected" | "left";

export interface Instructor {
	id: string;
	school_id: string;
	name: string;
	active: boolean;
	color: string | null; // calendar colour; null = palette fallback
	created_at: string;
}

export interface Student {
	id: string;
	school_id: string;
	auth_user_id: string | null; // null = unclaimed (manually added, not registered)
	full_name: string | null;
	email: string | null; // contact email while unclaimed; null once claimed
	phone: string | null;
	status: EnrollmentStatus;
	source: "self" | "manual";
	licence_code: string | null;
	created_at: string;
	decided_at: string | null;
}

export interface Booking {
	id: string;
	school_id: string;
	student_id: string; // students.id (not an auth uid)
	instructor_id: string | null;
	preferred_instructor_id: string | null; // student's soft choice at request time
	starts_at: string; // ISO
	duration_min: number;
	ends_at: string; // ISO (maintained by trigger)
	status: BookingStatus;
	cancelled_by: "student" | "school" | null;
	cancel_reason: string | null;
	licence_code: string | null;
	created_at: string;
	updated_at: string;
	decided_at: string | null;
	driving_school?: {
		cancellation_policy: "always" | "no_cancel" | "custom";
		cancellation_cutoff_hours: number;
	} | null;
	student?: { full_name: string | null } | null;
}
