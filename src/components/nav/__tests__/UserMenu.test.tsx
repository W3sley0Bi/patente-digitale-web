import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { UserMenu } from "@/components/nav/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function mockLoggedInStudent() {
	vi.mocked(useAuth).mockReturnValue({
		user: { id: "u1", email: "s@example.com" } as never,
		session: {} as never,
		loading: false,
		signOut: async () => {},
	});
	vi.mocked(useProfile).mockReturnValue({
		profile: null,
		role: "student",
		approved: true,
		loading: false,
		error: null,
		refresh: async () => {},
	});
}

describe("UserMenu site/app switcher", () => {
	it("shows 'Go to app' linking to the student home when on a marketing page", () => {
		mockLoggedInStudent();
		render(
			<MemoryRouter initialEntries={["/students"]}>
				<UserMenu onClose={() => {}} />
			</MemoryRouter>,
		);
		const link = screen.getByText("Go to app").closest("a");
		expect(link).toHaveAttribute("href", "/app/student");
	});

	it("shows 'Go to website' linking to '/' when inside the app", () => {
		mockLoggedInStudent();
		render(
			<MemoryRouter initialEntries={["/app/student/profile"]}>
				<UserMenu onClose={() => {}} />
			</MemoryRouter>,
		);
		const link = screen.getByText("Go to website").closest("a");
		expect(link).toHaveAttribute("href", "/");
	});
});
