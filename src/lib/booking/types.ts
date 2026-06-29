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

export interface Enrollment {
	id: string;
	school_id: string;
	student_id: string;
	status: EnrollmentStatus;
	licence_code: string | null;
	created_at: string;
	decided_at: string | null;
}

export interface Booking {
	id: string;
	school_id: string;
	student_id: string;
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
}
