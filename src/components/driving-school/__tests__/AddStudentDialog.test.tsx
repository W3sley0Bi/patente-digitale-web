import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "en" },
	}),
}));

vi.mock("@/lib/booking/api", () => ({
	addStudentManual: vi.fn(),
}));

import { AddStudentDialog } from "@/components/driving-school/AddStudentDialog";
import { addStudentManual } from "@/lib/booking/api";

function renderDialog(onAdded = vi.fn(), onOpenChange = vi.fn()) {
	render(
		<AddStudentDialog
			schoolId="school-1"
			open
			onOpenChange={onOpenChange}
			onAdded={onAdded}
		/>,
	);
	return { onAdded, onOpenChange };
}

describe("AddStudentDialog", () => {
	beforeEach(() => {
		vi.mocked(addStudentManual).mockReset();
	});

	it("renders the fields and the consent hint", () => {
		renderDialog();

		expect(
			screen.getByLabelText("booking.school.addStudentName"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("booking.school.addStudentEmail"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("booking.school.addStudentPhone"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("booking.school.addStudentLicence"),
		).toBeInTheDocument();
		expect(
			screen.getByText("booking.school.addStudentHint"),
		).toBeInTheDocument();
	});

	it("submits name/email, calls onAdded and closes", async () => {
		vi.mocked(addStudentManual).mockResolvedValue("new-id");
		const { onAdded, onOpenChange } = renderDialog();

		fireEvent.change(screen.getByLabelText("booking.school.addStudentName"), {
			target: { value: "Mario Rossi" },
		});
		fireEvent.change(screen.getByLabelText("booking.school.addStudentEmail"), {
			target: { value: "mario@example.com" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);

		await waitFor(() => expect(onAdded).toHaveBeenCalled());
		expect(addStudentManual).toHaveBeenCalledWith("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
			phone: undefined,
			licence_code: undefined,
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("passes phone and licence when filled", async () => {
		vi.mocked(addStudentManual).mockResolvedValue("new-id");
		const { onAdded } = renderDialog();

		fireEvent.change(screen.getByLabelText("booking.school.addStudentName"), {
			target: { value: "Mario Rossi" },
		});
		fireEvent.change(screen.getByLabelText("booking.school.addStudentEmail"), {
			target: { value: "mario@example.com" },
		});
		fireEvent.change(screen.getByLabelText("booking.school.addStudentPhone"), {
			target: { value: "+39 333 1234567" },
		});
		fireEvent.change(
			screen.getByLabelText("booking.school.addStudentLicence"),
			{ target: { value: "B" } },
		);
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);

		await waitFor(() => expect(onAdded).toHaveBeenCalled());
		expect(addStudentManual).toHaveBeenCalledWith("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
			phone: "+39 333 1234567",
			licence_code: "B",
		});
	});

	it("shows the duplicate-email error on student_email_exists", async () => {
		vi.mocked(addStudentManual).mockRejectedValue(
			new Error("student_email_exists"),
		);
		const { onAdded } = renderDialog();

		fireEvent.change(screen.getByLabelText("booking.school.addStudentName"), {
			target: { value: "Mario Rossi" },
		});
		fireEvent.change(screen.getByLabelText("booking.school.addStudentEmail"), {
			target: { value: "mario@example.com" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);

		expect(
			await screen.findByText("booking.school.addStudentEmailExists"),
		).toBeInTheDocument();
		expect(onAdded).not.toHaveBeenCalled();
	});

	it("shows a validation error when submitting with empty name/email", async () => {
		const { onAdded } = renderDialog();

		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);

		expect(
			await screen.findByText("school.claimForm.errors.requiredField"),
		).toBeInTheDocument();
		expect(addStudentManual).not.toHaveBeenCalled();
		expect(onAdded).not.toHaveBeenCalled();
	});

	it("resets fields and error when the dialog is reopened", async () => {
		const { rerender } = render(
			<AddStudentDialog
				schoolId="school-1"
				open
				onOpenChange={vi.fn()}
				onAdded={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByLabelText("booking.school.addStudentName"), {
			target: { value: "Mario Rossi" },
		});
		// Trigger the empty-email validation error so we can assert it clears
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);
		expect(
			await screen.findByText("school.claimForm.errors.requiredField"),
		).toBeInTheDocument();

		rerender(
			<AddStudentDialog
				schoolId="school-1"
				open={false}
				onOpenChange={vi.fn()}
				onAdded={vi.fn()}
			/>,
		);
		rerender(
			<AddStudentDialog
				schoolId="school-1"
				open
				onOpenChange={vi.fn()}
				onAdded={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("booking.school.addStudentName")).toHaveValue(
			"",
		);
		expect(
			screen.queryByText("school.claimForm.errors.requiredField"),
		).not.toBeInTheDocument();
	});

	it("shows a generic error on other failures", async () => {
		vi.mocked(addStudentManual).mockRejectedValue(new Error("boom"));
		const { onAdded } = renderDialog();

		fireEvent.change(screen.getByLabelText("booking.school.addStudentName"), {
			target: { value: "Mario Rossi" },
		});
		fireEvent.change(screen.getByLabelText("booking.school.addStudentEmail"), {
			target: { value: "mario@example.com" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "booking.school.addStudentSubmit" }),
		);

		expect(
			await screen.findByText("booking.school.updateError"),
		).toBeInTheDocument();
		expect(onAdded).not.toHaveBeenCalled();
	});
});
