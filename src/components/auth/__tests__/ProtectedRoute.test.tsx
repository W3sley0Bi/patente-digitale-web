import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function Wrap({
	element,
	initialPath = "/protected",
}: {
	element: React.ReactNode;
	initialPath?: string;
}) {
	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/protected" element={element} />
				<Route path="/app/login" element={<LoginProbe />} />
				<Route
					path="/app/driving-school"
					element={<div>DS dashboard</div>}
				/>
			</Routes>
		</MemoryRouter>
	);
}

function LoginProbe() {
	const [params] = useSearchParams();
	return <div>Login page next={params.get("next")}</div>;
}

describe("ProtectedRoute", () => {
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

	it("redirects to /login when not authenticated", () => {
		render(
			<Wrap
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(screen.getByText("Login page next=/protected")).toBeInTheDocument();
		expect(screen.queryByText("Secret")).not.toBeInTheDocument();
	});

	it("preserves the query string in the next redirect", () => {
		render(
			<Wrap
				initialPath="/protected?placeId=abc123"
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(
			screen.getByText("Login page next=/protected?placeId=abc123"),
		).toBeInTheDocument();
	});

	it("renders children when role matches", () => {
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
		render(
			<Wrap
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(screen.getByText("Secret")).toBeInTheDocument();
	});

	it("redirects when authenticated but wrong role", () => {
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
		render(
			<Wrap
				element={
					<ProtectedRoute requiredRole="student">
						<div>Secret</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(screen.queryByText("Secret")).not.toBeInTheDocument();
		// wrong-role users now route to their actual dashboard, not /login
		expect(screen.getByText("DS dashboard")).toBeInTheDocument();
	});

	it("redirects to /driving-school/dashboard when approved=false and requireApproved=true", () => {
		vi.mocked(useAuth).mockReturnValue({
			user: { id: "u1" } as never,
			session: {} as never,
			loading: false,
			signOut: async () => {},
		});
		vi.mocked(useProfile).mockReturnValue({
			profile: null,
			role: "autoscuola",
			approved: false,
			loading: false,
			error: null,
			refresh: async () => {},
		});
		render(
			<Wrap
				element={
					<ProtectedRoute requiredRole="autoscuola" requireApproved>
						<div>Editor</div>
					</ProtectedRoute>
				}
			/>,
		);
		expect(screen.queryByText("Editor")).not.toBeInTheDocument();
		expect(screen.getByText("DS dashboard")).toBeInTheDocument();
	});
});
