import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "en" },
	}),
}));

vi.mock("@/lib/booking/api", () => ({
	updateStudentAsSchool: vi.fn(),
	removeStudent: vi.fn(),
}));

import { StudentEditSheet } from "@/components/driving-school/StudentEditSheet";
import {
	type EnrolledStudent,
	removeStudent,
	updateStudentAsSchool,
} from "@/lib/booking/api";

const baseStudent: EnrolledStudent = {
	student_id: "stu-1",
	full_name: "Mario Rossi",
	email: "mario@example.com",
	phone: "+39 333 1234567",
	licence_code: "B",
	is_claimed: true,
	claim_token: null,
};

const unclaimedStudent: EnrolledStudent = {
	...baseStudent,
	is_claimed: false,
	claim_token: "tok-1",
};

function renderSheet(
	student: EnrolledStudent,
	onSaved = vi.fn(),
	onOpenChange = vi.fn(),
) {
	render(
		<StudentEditSheet
			schoolId="school-1"
			student={student}
			open
			onOpenChange={onOpenChange}
			onSaved={onSaved}
		/>,
	);
	return { onSaved, onOpenChange };
}

describe("StudentEditSheet", () => {
	beforeEach(() => {
		vi.mocked(updateStudentAsSchool).mockReset();
		vi.mocked(removeStudent).mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("keeps email read-only with the locked hint for claimed students", () => {
		renderSheet(baseStudent);

		const email = screen.getByLabelText("Email");
		expect(email).toBeDisabled();
		expect(screen.getByText("booking.school.emailLocked")).toBeInTheDocument();
	});

	it("saves without email for claimed students", async () => {
		vi.mocked(updateStudentAsSchool).mockResolvedValue(undefined);
		const { onSaved, onOpenChange } = renderSheet(baseStudent);

		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.saveStudent" }),
		);

		await waitFor(() => expect(onSaved).toHaveBeenCalled());
		expect(updateStudentAsSchool).toHaveBeenCalledWith("school-1", "stu-1", {
			full_name: "Mario Rossi",
			phone: "+39 333 1234567",
			licence_code: "B",
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("allows editing the email for unclaimed students and includes it on save", async () => {
		vi.mocked(updateStudentAsSchool).mockResolvedValue(undefined);
		const { onSaved } = renderSheet(unclaimedStudent);

		const email = screen.getByLabelText("Email");
		expect(email).not.toBeDisabled();
		expect(
			screen.queryByText("booking.school.emailLocked"),
		).not.toBeInTheDocument();

		fireEvent.change(email, { target: { value: "nuovo@example.com" } });
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.saveStudent" }),
		);

		await waitFor(() => expect(onSaved).toHaveBeenCalled());
		expect(updateStudentAsSchool).toHaveBeenCalledWith("school-1", "stu-1", {
			full_name: "Mario Rossi",
			phone: "+39 333 1234567",
			licence_code: "B",
			email: "nuovo@example.com",
		});
	});

	it("blocks saving an unclaimed student with a blank email", async () => {
		const { onSaved } = renderSheet(unclaimedStudent);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "   " },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.saveStudent" }),
		);

		expect(
			await screen.findByText("school.claimForm.errors.requiredField"),
		).toBeInTheDocument();
		expect(updateStudentAsSchool).not.toHaveBeenCalled();
		expect(onSaved).not.toHaveBeenCalled();
	});

	it("maps student_email_exists to the duplicate-email message", async () => {
		vi.mocked(updateStudentAsSchool).mockRejectedValue(
			new Error("student_email_exists"),
		);
		const { onSaved } = renderSheet(unclaimedStudent);

		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.saveStudent" }),
		);

		expect(
			await screen.findByText("booking.school.addStudentEmailExists"),
		).toBeInTheDocument();
		expect(onSaved).not.toHaveBeenCalled();
	});

	it("removes the student after confirmation", async () => {
		vi.spyOn(window, "confirm").mockReturnValue(true);
		vi.mocked(removeStudent).mockResolvedValue(undefined);
		const { onSaved, onOpenChange } = renderSheet(unclaimedStudent);

		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.removeStudent" }),
		);

		await waitFor(() => expect(onSaved).toHaveBeenCalled());
		expect(window.confirm).toHaveBeenCalledWith("booking.school.removeStudent");
		expect(removeStudent).toHaveBeenCalledWith("stu-1");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does nothing when the removal is not confirmed", () => {
		vi.spyOn(window, "confirm").mockReturnValue(false);
		const { onSaved, onOpenChange } = renderSheet(baseStudent);

		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.removeStudent" }),
		);

		expect(removeStudent).not.toHaveBeenCalled();
		expect(onSaved).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
