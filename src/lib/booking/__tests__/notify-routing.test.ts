import { describe, expect, it } from "vitest";
// The gating logic lives with the edge function but is pure TS, so we test it here.
import {
	decideRecipients,
	type RoutingInput,
} from "../../../../supabase/functions/notify/routing";

// Sensible defaults; each test overrides only what it exercises.
const base: RoutingInput = {
	event: "booking_requested",
	bookingStatus: "pending",
	emailSchoolRequest: true,
	schoolRecipient: "scuola@example.com",
	studentWantsConfirmation: true,
	studentEmail: "studente@example.com",
};

describe("decideRecipients — school notification toggle", () => {
	it("notifies the school on a pending request when the toggle is ON (auto-confirm OFF)", () => {
		const d = decideRecipients({ ...base, bookingStatus: "pending" });
		expect(d.school).toBe(true);
		expect(d.student).toBe(false); // pending → student not yet confirmed
	});

	it("notifies the school on an auto-confirmed request too (auto-confirm ON)", () => {
		const d = decideRecipients({ ...base, bookingStatus: "confirmed" });
		expect(d.school).toBe(true);
	});

	it("does NOT notify the school when the toggle is OFF — regardless of auto-confirm", () => {
		const off = { ...base, emailSchoolRequest: false };
		expect(decideRecipients({ ...off, bookingStatus: "pending" }).school).toBe(
			false,
		);
		expect(
			decideRecipients({ ...off, bookingStatus: "confirmed" }).school,
		).toBe(false);
	});

	it("does NOT notify the school when there is no resolvable recipient", () => {
		const d = decideRecipients({ ...base, schoolRecipient: "" });
		expect(d.school).toBe(false);
	});

	it("never notifies the school on a manual booking_confirmed", () => {
		const d = decideRecipients({ ...base, event: "booking_confirmed" });
		expect(d.school).toBe(false);
	});
});

describe("decideRecipients — student confirmation toggle", () => {
	it("emails the student on manual confirmation when the toggle is ON", () => {
		const d = decideRecipients({
			...base,
			event: "booking_confirmed",
			studentWantsConfirmation: true,
		});
		expect(d.student).toBe(true);
	});

	it("does NOT email the student on manual confirmation when the toggle is OFF", () => {
		const d = decideRecipients({
			...base,
			event: "booking_confirmed",
			studentWantsConfirmation: false,
		});
		expect(d.student).toBe(false);
	});

	it("emails the student on the auto-confirm path when the toggle is ON", () => {
		const d = decideRecipients({
			...base,
			event: "booking_requested",
			bookingStatus: "confirmed",
			studentWantsConfirmation: true,
		});
		expect(d.student).toBe(true);
	});

	it("does NOT email the student on the auto-confirm path when the toggle is OFF", () => {
		const d = decideRecipients({
			...base,
			event: "booking_requested",
			bookingStatus: "confirmed",
			studentWantsConfirmation: false,
		});
		expect(d.student).toBe(false);
	});

	it("does NOT email the student for a pending request even with the toggle ON", () => {
		const d = decideRecipients({
			...base,
			event: "booking_requested",
			bookingStatus: "pending",
			studentWantsConfirmation: true,
		});
		expect(d.student).toBe(false);
	});

	it("does NOT email the student when there is no student email", () => {
		const d = decideRecipients({
			...base,
			event: "booking_confirmed",
			studentEmail: "",
		});
		expect(d.student).toBe(false);
	});
});

describe("decideRecipients — booking_declined (rejection)", () => {
	it("emails the student on rejection when the toggle is ON", () => {
		const d = decideRecipients({
			...base,
			event: "booking_declined",
			studentWantsConfirmation: true,
		});
		expect(d).toEqual({ school: false, student: true });
	});

	it("does NOT email the student on rejection when the toggle is OFF", () => {
		const d = decideRecipients({
			...base,
			event: "booking_declined",
			studentWantsConfirmation: false,
		});
		expect(d.student).toBe(false);
	});

	it("does NOT email the student on rejection with no address", () => {
		const d = decideRecipients({
			...base,
			event: "booking_declined",
			studentEmail: "",
		});
		expect(d.student).toBe(false);
	});

	it("never notifies the school on a rejection", () => {
		const d = decideRecipients({ ...base, event: "booking_declined" });
		expect(d.school).toBe(false);
	});
});

describe("decideRecipients — booking_cancelled (notify the counterparty)", () => {
	it("student cancels → notifies the school (toggle ON), not the student", () => {
		const d = decideRecipients({
			...base,
			event: "booking_cancelled",
			cancelledBy: "student",
			emailSchoolRequest: true,
		});
		expect(d).toEqual({ school: true, student: false });
	});

	it("student cancels but school toggle OFF → nobody", () => {
		const d = decideRecipients({
			...base,
			event: "booking_cancelled",
			cancelledBy: "student",
			emailSchoolRequest: false,
		});
		expect(d).toEqual({ school: false, student: false });
	});

	it("school cancels → notifies the student (toggle ON), not the school", () => {
		const d = decideRecipients({
			...base,
			event: "booking_cancelled",
			cancelledBy: "school",
			studentWantsConfirmation: true,
		});
		expect(d).toEqual({ school: false, student: true });
	});

	it("school cancels but student toggle OFF → nobody", () => {
		const d = decideRecipients({
			...base,
			event: "booking_cancelled",
			cancelledBy: "school",
			studentWantsConfirmation: false,
		});
		expect(d).toEqual({ school: false, student: false });
	});

	it("school cancels but there is no student email → nobody", () => {
		const d = decideRecipients({
			...base,
			event: "booking_cancelled",
			cancelledBy: "school",
			studentEmail: "",
		});
		expect(d.student).toBe(false);
	});
});

describe("decideRecipients — combined toggles on the auto-confirm request", () => {
	it("both ON → both recipients", () => {
		const d = decideRecipients({
			...base,
			bookingStatus: "confirmed",
			emailSchoolRequest: true,
			studentWantsConfirmation: true,
		});
		expect(d).toEqual({ school: true, student: true });
	});

	it("both OFF → nobody", () => {
		const d = decideRecipients({
			...base,
			bookingStatus: "confirmed",
			emailSchoolRequest: false,
			studentWantsConfirmation: false,
		});
		expect(d).toEqual({ school: false, student: false });
	});

	it("school OFF, student ON → only student", () => {
		const d = decideRecipients({
			...base,
			bookingStatus: "confirmed",
			emailSchoolRequest: false,
			studentWantsConfirmation: true,
		});
		expect(d).toEqual({ school: false, student: true });
	});

	it("school ON, student OFF → only school", () => {
		const d = decideRecipients({
			...base,
			bookingStatus: "confirmed",
			emailSchoolRequest: true,
			studentWantsConfirmation: false,
		});
		expect(d).toEqual({ school: true, student: false });
	});
});
