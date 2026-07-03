import { render, screen, waitFor } from "@testing-library/react";
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
	EnrollDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="enroll-dialog-open" /> : null,
}));

import { EnrollButton } from "@/components/booking/EnrollButton";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
} from "@/lib/booking/api";

function renderAt(path: string, placeId = "place-1") {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<EnrollButton placeId={placeId} />
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

		expect(await screen.findByText("booking.enroll.active")).toBeInTheDocument();
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

	it("auto-opens the enroll dialog when arriving via a matching ?placeId= deep link", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=place-1", "place-1");

		expect(await screen.findByTestId("enroll-dialog-open")).toBeInTheDocument();
	});

	it("does not auto-open the dialog when the URL placeId doesn't match this button", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue({
			id: "school-1",
			email: "school@example.com",
		});
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		renderAt("/app/student?placeId=some-other-place", "place-1");

		await screen.findByText("booking.enroll.cta");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
	});

	it("does not auto-open the dialog when blocked, even with a matching deep link", async () => {
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

		renderAt("/app/student?placeId=place-1", "place-1");

		await screen.findByText("booking.enroll.blockedElsewhere");
		expect(screen.queryByTestId("enroll-dialog-open")).not.toBeInTheDocument();
	});

	it("waits for the auto-open effect asynchronously without throwing", async () => {
		vi.mocked(getAcceptedSchoolByPlaceId).mockResolvedValue(null);
		vi.mocked(getMyEnrollment).mockResolvedValue(null);

		const { container } = renderAt("/app/student?placeId=place-1", "place-1");

		await waitFor(() => expect(container.textContent).toBe(""));
	});
});
