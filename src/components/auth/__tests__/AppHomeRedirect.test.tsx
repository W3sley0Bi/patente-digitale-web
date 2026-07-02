import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { AppHomeRedirect } from "@/components/auth/AppHomeRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function Wrap({ initialEntry }: { initialEntry: string }) {
	return (
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/app" element={<AppHomeRedirect />} />
				<Route path="/app/login" element={<div>Login page</div>} />
				<Route path="/app/student" element={<div>Student home</div>} />
				<Route
					path="/app/driving-school"
					element={<div>DS home</div>}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe("AppHomeRedirect", () => {
	beforeEach(() => {
		vi.mocked(useAuth).mockReturnValue({
			user: null,
			session: null,
			loading: false,
			signOut: async () => {},
		});
		vi.mocked(useProfile).mockReturnValue({
			profile: null,
			role: null,
			approved: false,
			loading: false,
			error: null,
			refresh: async () => {},
		});
	});

	it("redirects to /app/login when not authenticated, from /app", () => {
		render(<Wrap initialEntry="/app" />);
		expect(screen.getByText("Login page")).toBeInTheDocument();
	});

	it("redirects to /app/login when not authenticated, from /app/", () => {
		render(<Wrap initialEntry="/app/" />);
		expect(screen.getByText("Login page")).toBeInTheDocument();
	});

	it("redirects a student to /app/student", () => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: "u1" } as never,
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
		render(<Wrap initialEntry="/app" />);
		expect(screen.getByText("Student home")).toBeInTheDocument();
	});

	it("redirects a driving school to /app/driving-school", () => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: "u1" } as never,
			session: {} as never,
			loading: false,
			signOut: async () => {},
		});
		vi.mocked(useProfile).mockReturnValue({
			profile: null,
			role: "autoscuola",
			approved: true,
			loading: false,
			error: null,
			refresh: async () => {},
		});
		render(<Wrap initialEntry="/app" />);
		expect(screen.getByText("DS home")).toBeInTheDocument();
	});

	it("redirects to /app/login when authenticated but role not yet provisioned", () => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: "u1" } as never,
			session: {} as never,
			loading: false,
			signOut: async () => {},
		});
		render(<Wrap initialEntry="/app" />);
		expect(screen.getByText("Login page")).toBeInTheDocument();
	});
});
