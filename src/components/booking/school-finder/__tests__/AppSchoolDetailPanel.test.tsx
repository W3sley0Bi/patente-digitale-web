import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/booking/EnrollButton", () => ({
	EnrollButton: ({ placeId }: { placeId: string }) => (
		<div data-testid="enroll-button">{placeId}</div>
	),
}));

import { AppSchoolDetailPanel } from "@/components/booking/school-finder/AppSchoolDetailPanel";
import type { NormalizedSchool } from "@/lib/geojson";

function makeSchool(
	overrides: Partial<NormalizedSchool> = {},
): NormalizedSchool {
	return {
		id: "school-1",
		name: "Autoscuola Roma Centro",
		address: "Via Roma 1",
		city: "Roma",
		zip: "00100",
		region: "Lazio",
		phone: "+390612345",
		website: null,
		latlng: [41.9, 12.5],
		partner: false,
		enrollment_enabled: true,
		openingHours: null,
		rating: null,
		userRatingCount: null,
		businessStatus: null,
		googleMapsUri: null,
		_placeId: "place-1",
		...overrides,
	} as NormalizedSchool;
}

describe("AppSchoolDetailPanel", () => {
	it("renders nothing when no school is selected", () => {
		const { container } = render(
			<AppSchoolDetailPanel school={null} onClose={vi.fn()} />,
		);
		expect(container.textContent).not.toContain("Autoscuola");
	});

	it("shows school name and address when selected", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		expect(screen.getByText("Autoscuola Roma Centro")).toBeInTheDocument();
		expect(screen.getByText(/Via Roma 1/)).toBeInTheDocument();
	});

	it("renders EnrollButton with the school's placeId", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		expect(screen.getByTestId("enroll-button")).toHaveTextContent("place-1");
	});

	it("never renders a link to marketing search or the owner claim flow", () => {
		render(<AppSchoolDetailPanel school={makeSchool()} onClose={vi.fn()} />);
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute(
				"href",
				expect.stringContaining("/search"),
			);
			expect(link).not.toHaveAttribute(
				"href",
				expect.stringContaining("/app/signup/driving-school"),
			);
		}
	});
});
