import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/booking/api", () => ({
	getAcceptedSchoolByPlaceId: vi.fn(),
	getMyEnrollment: vi.fn(),
	getMyContact: vi.fn(),
	requestEnrollment: vi.fn(),
}));

vi.mock("@/components/booking/EnrollDialog", () => ({
	EnrollDialog: ({
		open,
		onConfirm,
	}: {
		open: boolean;
		onConfirm(licence: string, phone: string): Promise<void>;
	}) =>
		open ? (
			<button
				type="button"
				data-testid="enroll-dialog-open"
				onClick={() => onConfirm("B", "333 1234567")}
			/>
		) : null,
}));

import { EnrollButton } from "@/components/booking/EnrollButton";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
	requestEnrollment,
} from "@/lib/booking/api";

function renderAt(path: string, placeId = "place-1", autoOpen = false) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<EnrollButton placeId={placeId} autoOpen={autoOpen} />
		</MemoryRouter>,
	);
}

describe("EnrollButton", () => {
	it("renders the CTA when there is no existing enrollment", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student");

		expect(await screen.findByText("booking.enroll.cta")).toBeInTheDocument();
	});

	it("shows the active label when enrolled at this school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "school-1",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student");

		expect(
			await screen.findByText("booking.enroll.active"),
		).toBeInTheDocument();
	});

	it("shows a blocked message when active at a different school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student");

		expect(
			await screen.findByText("booking.enroll.blockedElsewhere"),
		).toBeInTheDocument();
		expect(screen.queryByText("booking.enroll.cta")).not.toBeInTheDocument();
	});

	it("still shows the CTA when pending at a different school", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "pending",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: null,
		});

		renderAt("/app/student");

		expect(await screen.findByText("booking.enroll.cta")).toBeInTheDocument();
	});

	it("auto-opens the enroll dialog when flagged as the deep-link target", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=place-1", "place-1", true);

		expect(await screen.findByTestId("enroll-dialog-open")).toBeInTheDocument();
	});

	it("does not auto-open the dialog when a placeId is in the URL but autoOpen is not set (manual selection sync)", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=some-other-place", "place-1");

		await screen.findByText("booking.enroll.cta");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
	});

	it("opens the blocked modal instead of the enroll dialog when blocked via a deep link", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "some-other-school",
			student_id: "u1",
			status: "active",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student?placeId=place-1", "place-1", true);

		await screen.findByText("booking.enroll.blockedElsewhere");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
		expect(
			await screen.findByText("booking.enroll.blockedDialogTitle"),
		).toBeInTheDocument();
	});

	it("shows the pending label after confirming when the RPC created a request", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);
		vi.mocked(requestEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "school-1",
			auth_user_id: "u1",
			full_name: null,
			email: null,
			phone: null,
			status: "pending",
			source: "self",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: null,
		});

		renderAt("/app/student");
		fireEvent.click(await screen.findByText("booking.enroll.cta"));
		fireEvent.click(await screen.findByTestId("enroll-dialog-open"));

		expect(
			await screen.findByText("booking.enroll.pending"),
		).toBeInTheDocument();
	});

	it("shows the active label after confirming when the RPC claimed a matching record", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);
		vi.mocked(requestEnrollment).mockResolvedValue({
			id: "e1",
			school_id: "school-1",
			auth_user_id: "u1",
			full_name: "Mario Rossi",
			email: null,
			phone: null,
			status: "active",
			source: "manual",
			licence_code: "B",
			created_at: "2026-01-01",
			decided_at: "2026-01-02",
		});

		renderAt("/app/student");
		fireEvent.click(await screen.findByText("booking.enroll.cta"));
		fireEvent.click(await screen.findByTestId("enroll-dialog-open"));

		expect(
			await screen.findByText("booking.enroll.active"),
		).toBeInTheDocument();
		expect(
			screen.queryByText("booking.enroll.pending"),
		).not.toBeInTheDocument();
	});

	it("waits for the auto-open effect asynchronously without throwing", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue(null);
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		const { container } = renderAt(
			"/app/student?placeId=place-1",
			"place-1",
			true,
		);

		await waitFor(() => expect(container.textContent).toBe(""));
	});
});
