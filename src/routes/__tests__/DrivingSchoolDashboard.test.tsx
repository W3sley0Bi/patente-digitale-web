import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@/components/driving-school/DrivingSchoolLayout", () => ({
	DrivingSchoolLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/nav/Nav", () => ({ Nav: () => null }));

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => ({
		approved: true,
		loading: false,
		refresh: vi.fn(),
	}),
}));

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: () => ({
				eq: () => ({
					order: () => ({
						limit: () => ({
							maybeSingle: () =>
								Promise.resolve({
									data: {
										id: "school-1",
										status: "accepted",
										name: "Test School",
										lesson_duration_min: 45,
										booking_enabled: true,
									},
								}),
						}),
					}),
				}),
			}),
		}),
	},
}));

const listSchoolEnrollments = vi.fn();
const listSchoolBookings = vi.fn();
const listInstructors = vi.fn();
const listEnrollmentRequests = vi.fn();
vi.mock("@/lib/booking/api", () => ({
	listSchoolEnrollments: (...args: unknown[]) => listSchoolEnrollments(...args),
	listSchoolBookings: (...args: unknown[]) => listSchoolBookings(...args),
	listInstructors: (...args: unknown[]) => listInstructors(...args),
	listEnrollmentRequests: (...args: unknown[]) =>
		listEnrollmentRequests(...args),
}));

import DrivingSchoolDashboard from "@/routes/DrivingSchoolDashboard";

describe("DrivingSchoolDashboard overview", () => {
	it("renders stats, attention and upcoming sections with fetched data", async () => {
		listSchoolEnrollments.mockResolvedValue([
			{ id: "s1", status: "active", full_name: "Mario Rossi" },
			{ id: "s2", status: "pending", full_name: "Anna Bianchi" },
		]);
		const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		listSchoolBookings.mockResolvedValue([
			{
				id: "b1",
				student_id: "s1",
				instructor_id: "i1",
				status: "confirmed",
				starts_at: future,
				ends_at: future,
				created_at: future,
			},
			{
				id: "b2",
				student_id: "s2",
				instructor_id: null,
				status: "pending",
				starts_at: future,
				ends_at: future,
				created_at: future,
			},
		]);
		listInstructors.mockResolvedValue([
			{ id: "i1", name: "Giulia Verdi", active: true },
		]);
		listEnrollmentRequests.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<DrivingSchoolDashboard />
			</MemoryRouter>,
		);

		expect(
			await screen.findByText("school.dashboard.stats.activeStudents"),
		).toBeInTheDocument();
		expect(
			screen.getByText("school.dashboard.attention.title"),
		).toBeInTheDocument();
		expect(
			screen.getByText("school.dashboard.upcoming.title"),
		).toBeInTheDocument();
		expect(await screen.findByText("Anna Bianchi")).toBeInTheDocument();
		expect(screen.getByText("Mario Rossi")).toBeInTheDocument();
		expect(screen.getByText("Giulia Verdi")).toBeInTheDocument();
	});

	it("shows the empty state when there is nothing pending", async () => {
		listSchoolEnrollments.mockResolvedValue([]);
		listSchoolBookings.mockResolvedValue([]);
		listInstructors.mockResolvedValue([]);
		listEnrollmentRequests.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<DrivingSchoolDashboard />
			</MemoryRouter>,
		);

		expect(
			await screen.findByText("school.dashboard.attention.empty"),
		).toBeInTheDocument();
		expect(
			screen.getByText("school.dashboard.upcoming.empty"),
		).toBeInTheDocument();
	});
});
