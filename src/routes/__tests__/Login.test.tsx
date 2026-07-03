import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/nav/Nav", () => ({
	Nav: () => <div data-testid="nav" />,
}));

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useProfile", () => ({
	useProfile: () => ({ role: null, loading: false }),
}));

const mockOnSuccess: { current: (() => void) | null } = { current: null };

vi.mock("@/components/auth/AuthForm", () => ({
	AuthForm: ({
		mode,
		onSuccess,
	}: {
		mode: string;
		onSuccess?: () => void;
	}) => {
		if (mode === "signup") mockOnSuccess.current = onSuccess ?? null;
		return <div data-testid={`auth-form-${mode}`} />;
	},
}));

vi.mock("@/components/auth/ForgotPasswordForm", () => ({
	ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));

import Login from "@/routes/Login";

function LocationProbe() {
	const [searchParams] = useSearchParams();
	return <div data-testid="location-probe">{searchParams.toString()}</div>;
}

function renderLogin(initialPath: string) {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route
					path="/app/login"
					element={
						<>
							<Login />
							<LocationProbe />
						</>
					}
				/>
				<Route path="/app/student" element={<div>Student dashboard</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("Login next-param preservation", () => {
	it("keeps the next param in the URL when switching from login to signup", async () => {
		const user = userEvent.setup();
		renderLogin("/app/login?next=%2Fapp%2Fstudent%3FplaceId%3Dplace-1");

		await user.click(screen.getByText("auth.signupLink"));

		// goSignup() only shows the role-picker view; the signup AuthForm
		// (mode="signup") only mounts once a role is chosen.
		expect(screen.getByText("auth.student.title")).toBeInTheDocument();
		const probeSearch = screen.getByTestId("location-probe").textContent;
		expect(probeSearch).toContain("tab=signup");
		expect(probeSearch).toContain("next=");
		expect(probeSearch).toContain("place-1");

		await user.click(screen.getByText("auth.student.title"));
		expect(screen.getByTestId("auth-form-signup")).toBeInTheDocument();
	});

	it("navigates to next on signup success instead of the hardcoded dashboard", async () => {
		const user = userEvent.setup();
		renderLogin("/app/login?next=%2Fapp%2Fstudent%3FplaceId%3Dplace-1");

		await user.click(screen.getByText("auth.signupLink"));
		await user.click(screen.getByText("auth.student.title"));

		expect(mockOnSuccess.current).not.toBeNull();
		mockOnSuccess.current?.();

		expect(await screen.findByText("Student dashboard")).toBeInTheDocument();
	});
});
