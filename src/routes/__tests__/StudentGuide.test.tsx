import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/student/StudentLayout", () => ({
	StudentLayout: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/booking/school-finder/AppSchoolFinderPanel", () => ({
	AppSchoolFinderPanel: () => <div data-testid="app-school-finder" />,
}));

vi.mock("@/components/booking/BookLessonForm", () => ({
	BookLessonForm: () => <div data-testid="book-lesson-form" />,
}));

vi.mock("@/components/booking/MyLessons", () => ({
	MyLessons: () => <div data-testid="my-lessons" />,
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
}));

import StudentGuide from "@/routes/StudentGuide";

describe("StudentGuide school finder gating", () => {
	it("shows the finder when there is no enrollment", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(<StudentGuide />);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("shows the finder when enrollment is rejected", async () => {
		getMyEnrollment.mockResolvedValue({ status: "rejected", school_id: "s1" });
		render(<StudentGuide />);
		expect(await screen.findByTestId("app-school-finder")).toBeInTheDocument();
	});

	it("hides the finder when enrollment is active", async () => {
		getMyEnrollment.mockResolvedValue({ status: "active", school_id: "s1" });
		render(<StudentGuide />);
		await screen.findByTestId("my-lessons");
		expect(screen.queryByTestId("app-school-finder")).not.toBeInTheDocument();
	});

	it("never links to /search from the guide page", async () => {
		getMyEnrollment.mockResolvedValue(null);
		render(<StudentGuide />);
		await screen.findByTestId("app-school-finder");
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", "/search");
		}
	});
});
