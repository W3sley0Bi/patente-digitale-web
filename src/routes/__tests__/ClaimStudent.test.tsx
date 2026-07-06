import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
	const actual =
		await vi.importActual<typeof import("react-router")>("react-router");
	return { ...actual, useNavigate: () => mockNavigate };
});

const authState: { user: { id: string } | null; loading: boolean } = {
	user: { id: "user-1" },
	loading: false,
};
vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({ ...authState }),
}));

const claimStudentRecord = vi.fn();
vi.mock("@/lib/booking/api", () => ({
	claimStudentRecord: (token: string) => claimStudentRecord(token),
}));

import ClaimStudent from "@/routes/ClaimStudent";

function LoginProbe() {
	const location = useLocation();
	return <div data-testid="login-probe">{location.search}</div>;
}

function renderClaim(initialPath: string, strict = false) {
	const routes = (
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/claim/:token" element={<ClaimStudent />} />
				<Route path="/app/login" element={<LoginProbe />} />
			</Routes>
		</MemoryRouter>
	);
	return render(strict ? <StrictMode>{routes}</StrictMode> : routes);
}

describe("ClaimStudent", () => {
	beforeEach(() => {
		authState.user = { id: "user-1" };
		authState.loading = false;
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it("shows the working message while the claim is in flight", () => {
		claimStudentRecord.mockReturnValue(new Promise(() => {}));
		renderClaim("/claim/tok-1");
		expect(screen.getByText("claim.working")).toBeInTheDocument();
		expect(claimStudentRecord).toHaveBeenCalledWith("tok-1");
	});

	it("shows success briefly, then navigates to the student dashboard", async () => {
		vi.useFakeTimers();
		claimStudentRecord.mockResolvedValue("student-1");
		renderClaim("/claim/tok-1");

		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(screen.getByText("claim.success")).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1200);
		});
		expect(mockNavigate).toHaveBeenCalledWith("/app/student", {
			replace: true,
		});
	});

	it("shows activeElsewhere for student_active_elsewhere", async () => {
		claimStudentRecord.mockRejectedValue(new Error("student_active_elsewhere"));
		renderClaim("/claim/tok-1");
		expect(
			await screen.findByText("claim.activeElsewhere"),
		).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("shows activeElsewhere for already_enrolled_at_school", async () => {
		claimStudentRecord.mockRejectedValue(
			new Error("already_enrolled_at_school"),
		);
		renderClaim("/claim/tok-1");
		expect(
			await screen.findByText("claim.activeElsewhere"),
		).toBeInTheDocument();
	});

	it("shows notFound for claim_not_found", async () => {
		claimStudentRecord.mockRejectedValue(new Error("claim_not_found"));
		renderClaim("/claim/tok-1");
		expect(await screen.findByText("claim.notFound")).toBeInTheDocument();
	});

	it("shows notFound for any other error (no record-existence leak)", async () => {
		claimStudentRecord.mockRejectedValue(new Error("role_must_be_student"));
		renderClaim("/claim/tok-1");
		expect(await screen.findByText("claim.notFound")).toBeInTheDocument();
	});

	it("redirects unauthenticated visitors to login, preserving the claim URL", () => {
		authState.user = null;
		renderClaim("/claim/tok-1");
		expect(screen.getByTestId("login-probe")).toHaveTextContent(
			`?next=${encodeURIComponent("/claim/tok-1")}`,
		);
		expect(claimStudentRecord).not.toHaveBeenCalled();
	});

	it("waits for auth to resolve before redirecting or claiming", () => {
		authState.user = null;
		authState.loading = true;
		renderClaim("/claim/tok-1");
		expect(screen.getByText("claim.working")).toBeInTheDocument();
		expect(screen.queryByTestId("login-probe")).not.toBeInTheDocument();
		expect(claimStudentRecord).not.toHaveBeenCalled();
	});

	it("calls the claim RPC only once under StrictMode double effects", async () => {
		claimStudentRecord.mockResolvedValue("student-1");
		renderClaim("/claim/tok-1", true);
		expect(await screen.findByText("claim.success")).toBeInTheDocument();
		expect(claimStudentRecord).toHaveBeenCalledTimes(1);
	});
});
