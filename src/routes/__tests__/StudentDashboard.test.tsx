import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@/components/student/StudentLayout", () => ({
	StudentLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/student/CalendarPreference", () => ({
	CalendarPreference: () => <div data-testid="calendar-preference" />,
}));

vi.mock("@/components/student/StatusChangeBanner", () => ({
	StatusChangeBanner: () => null,
}));

vi.mock("@/components/booking/school-finder/AppSchoolFinderPanel", () => ({
	AppSchoolFinderPanel: () => <div data-testid="app-school-finder" />,
}));

vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => ({
		profile: { id: "u1", full_name: "Mario" },
		refresh: vi.fn(),
	}),
}));

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: () => ({
				eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
			}),
		}),
	},
}));

const getMyEnrollment = vi.fn();
vi.mock("@/lib/booking/api", () => ({
	getMyEnrollment: () => getMyEnrollment(),
	listMyBookings: () => Promise.resolve([]),
}));

import StudentDashboard from "@/routes/StudentDashboard";

describe("StudentDashboard school finder gating", () => {
	it("shows the finder when there is no enrollment", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(
			<MemoryRouter>
				<StudentDashboard />
			</MemoryRouter>,
		);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("shows the finder when enrollment is pending", async () => {
		getMyEnrollment.mockResolvedValue({ status: "pending", school_id: "s1" });
		render(
			<MemoryRouter>
				<StudentDashboard />
			</MemoryRouter>,
		);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("hides the finder when enrollment is active", async () => {
		getMyEnrollment.mockResolvedValue({ status: "active", school_id: "s1" });
		render(
			<MemoryRouter>
				<StudentDashboard />
			</MemoryRouter>,
		);
		await screen.findByTestId("calendar-preference");
		expect(screen.queryByTestId("app-school-finder")).not.toBeInTheDocument();
	});

	it("never links to /search from the dashboard", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(
			<MemoryRouter>
				<StudentDashboard />
			</MemoryRouter>,
		);
		await screen.findByTestId("app-school-finder");
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", "/search");
		}
	});
});
