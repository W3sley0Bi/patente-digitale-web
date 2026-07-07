import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseCerca = {
	query: "",
	region: "",
	coords: null,
	results: [],
	selected: null,
	loading: false,
	error: null,
	setQuery: vi.fn(),
	setPlace: vi.fn(),
	setRegion: vi.fn(),
	setSelected: vi.fn(),
	clearFilters: vi.fn(),
};

vi.mock("@/hooks/useCerca", () => ({
	useCerca: () => mockUseCerca,
}));

vi.mock("@/components/cerca/SchoolMap", () => ({
	SchoolMap: () => <div data-testid="school-map" />,
}));

// AppSchoolDetailPanel pulls in EnrollButton -> EnrollDialog -> lib/booking/api
// -> lib/supabase, which throws at import time without VITE_SUPABASE_* env
// vars configured. Mock it out the same way Task 1's own test does.
vi.mock("@/components/booking/EnrollButton", () => ({
	EnrollButton: ({ placeId }: { placeId: string }) => (
		<div data-testid="enroll-button">{placeId}</div>
	),
}));

import { AppSchoolFinderPanel } from "@/components/booking/school-finder/AppSchoolFinderPanel";

describe("AppSchoolFinderPanel", () => {
	it("renders the filter bar and results list", () => {
		render(<AppSchoolFinderPanel />);
		expect(
			screen.getByPlaceholderText("cerca.searchPlaceholder"),
		).toBeInTheDocument();
		expect(screen.getByText("cerca.noResults")).toBeInTheDocument();
	});

	it("renders the map", () => {
		render(<AppSchoolFinderPanel />);
		expect(screen.getByTestId("school-map")).toBeInTheDocument();
	});

	it("never shows the verified-only toggle — the search is always scoped to verified schools", () => {
		render(<AppSchoolFinderPanel />);
		expect(
			screen.queryByText("cerca.filters.partnerOnly"),
		).not.toBeInTheDocument();
	});

	it("never links to marketing search or the owner claim flow", () => {
		render(<AppSchoolFinderPanel />);
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
