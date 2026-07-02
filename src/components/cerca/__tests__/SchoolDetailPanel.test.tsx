import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseProfile = vi.fn();
vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => mockUseProfile(),
}));

vi.mock("@/components/booking/EnrollButton", () => ({
	EnrollButton: ({ placeId }: { placeId: string }) => (
		<div data-testid="enroll-button">{placeId}</div>
	),
}));

import { SchoolDetailPanel } from "@/components/cerca/SchoolDetailPanel";
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
		partner: true,
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

function renderPanel(school: NormalizedSchool) {
	return render(
		<MemoryRouter>
			<SchoolDetailPanel school={school} onClose={vi.fn()} />
		</MemoryRouter>,
	);
}

describe("SchoolDetailPanel anonymous login CTA", () => {
	it("shows a login-to-enroll link for anonymous visitors on a verified, enrollment-enabled school", () => {
		mockUseProfile.mockReturnValue({ role: null, loading: false });
		renderPanel(makeSchool());
		const links = screen.getAllByRole("link", {
			name: "cerca.detail.loginToEnroll",
		});
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) {
			expect(link).toHaveAttribute(
				"href",
				expect.stringContaining("/app/login?next="),
			);
			expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
				"/app/student?placeId=place-1",
			);
		}
	});

	it("does not show the login CTA while auth is still loading", () => {
		mockUseProfile.mockReturnValue({ role: null, loading: true });
		renderPanel(makeSchool());
		expect(
			screen.queryByRole("link", { name: "cerca.detail.loginToEnroll" }),
		).not.toBeInTheDocument();
	});

	it("does not show the login CTA for a non-enrollment-enabled school", () => {
		mockUseProfile.mockReturnValue({ role: null, loading: false });
		renderPanel(makeSchool({ enrollment_enabled: false }));
		expect(
			screen.queryByRole("link", { name: "cerca.detail.loginToEnroll" }),
		).not.toBeInTheDocument();
	});

	it("does not show the login CTA for an unverified school", () => {
		mockUseProfile.mockReturnValue({ role: null, loading: false });
		renderPanel(makeSchool({ partner: false }));
		expect(
			screen.queryByRole("link", { name: "cerca.detail.loginToEnroll" }),
		).not.toBeInTheDocument();
	});

	it("shows the real EnrollButton (not the login CTA) for a logged-in student", () => {
		mockUseProfile.mockReturnValue({ role: "student", loading: false });
		renderPanel(makeSchool());
		expect(screen.getAllByTestId("enroll-button").length).toBeGreaterThan(0);
		expect(
			screen.queryByRole("link", { name: "cerca.detail.loginToEnroll" }),
		).not.toBeInTheDocument();
	});

	it("shows neither the login CTA nor EnrollButton for a logged-in school owner", () => {
		mockUseProfile.mockReturnValue({ role: "autoscuola", loading: false });
		renderPanel(makeSchool());
		expect(screen.queryAllByTestId("enroll-button")).toHaveLength(0);
		expect(
			screen.queryByRole("link", { name: "cerca.detail.loginToEnroll" }),
		).not.toBeInTheDocument();
	});
});
