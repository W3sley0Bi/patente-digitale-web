import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/nav/UserMenu", () => ({
	UserMenu: () => <div data-testid="user-menu" />,
}));

import { StudentLayout } from "@/components/student/StudentLayout";

describe("StudentLayout nav", () => {
	it("never links to the marketing /search page", () => {
		render(
			<MemoryRouter initialEntries={["/app/student"]}>
				<StudentLayout>
					<div>content</div>
				</StudentLayout>
			</MemoryRouter>,
		);
		const links = screen.queryAllByRole("link");
		for (const link of links) {
			expect(link).not.toHaveAttribute("href", "/search");
		}
	});

	it("still links to the dashboard and guide routes", () => {
		render(
			<MemoryRouter initialEntries={["/app/student"]}>
				<StudentLayout>
					<div>content</div>
				</StudentLayout>
			</MemoryRouter>,
		);
		const hrefs = screen
			.getAllByRole("link")
			.map((link) => link.getAttribute("href"));
		expect(hrefs).toContain("/app/student");
		expect(hrefs).toContain("/app/student/drive-bookings");
	});
});
