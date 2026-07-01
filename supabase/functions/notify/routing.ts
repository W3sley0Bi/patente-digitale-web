// supabase/functions/notify/routing.ts
// Pure, runtime-agnostic decision for who receives a booking email. No Deno/DOM
// APIs and no imports, so it is unit-testable from vitest as well as usable by the
// edge function. Keeps the gating rules in one place:
//   • School notice  → sent on every `booking_requested` (auto-confirm on OR off),
//     gated by the school's `email_school_request` toggle and a resolvable address.
//   • Student confirm → sent when a drive becomes confirmed (manual `booking_confirmed`,
//     or the auto-confirm `booking_requested` whose booking is already `confirmed`),
//     gated by the student's own `email_confirmations` preference and an address.
//   • Student decline → sent when a request is rejected (`booking_declined`), gated by
//     the same student preference and an address.

export type BookingEvent =
	| "booking_requested"
	| "booking_confirmed"
	| "booking_declined";

export interface RoutingInput {
	event: BookingEvent;
	/** Booking status after the RPC ran ("pending" | "confirmed" | ...). */
	bookingStatus: string;
	/** School toggle: notify the school on new requests. */
	emailSchoolRequest: boolean;
	/** Resolved school recipient (driving_schools.email or owner fallback); "" if none. */
	schoolRecipient: string;
	/** Student toggle: student wants drive-confirmation emails. */
	studentWantsConfirmation: boolean;
	/** Student email; "" if none. */
	studentEmail: string;
}

export interface RoutingDecision {
	/** Send the "new request" notice to the school. */
	school: boolean;
	/** Send the "drive confirmed" email (with calendar) to the student. */
	student: boolean;
}

export function decideRecipients(i: RoutingInput): RoutingDecision {
	const hasSchool = i.schoolRecipient.trim().length > 0;
	const hasStudent = i.studentEmail.trim().length > 0;

	if (i.event === "booking_requested") {
		return {
			// School is notified on every request, regardless of auto-confirm.
			school: i.emailSchoolRequest && hasSchool,
			// Auto-confirm path: request already confirmed also notifies the student.
			student:
				i.bookingStatus === "confirmed" &&
				i.studentWantsConfirmation &&
				hasStudent,
		};
	}

	// booking_confirmed (manual confirm) and booking_declined (rejection) both
	// notify only the student, gated by their own preference.
	return {
		school: false,
		student: i.studentWantsConfirmation && hasStudent,
	};
}
