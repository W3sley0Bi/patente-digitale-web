import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("qrcode", () => ({
	default: {
		toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
	},
}));

import { InviteLinkCard } from "@/components/driving-school/InviteLinkCard";

describe("InviteLinkCard", () => {
	it("shows the invite link built from the school's place_id", () => {
		render(<InviteLinkCard placeId="place-42" />);
		const input = screen.getByDisplayValue(
			`${window.location.origin}/cerca?placeId=place-42`,
		);
		expect(input).toBeInTheDocument();
	});

	it("renders the generated QR code image once ready", async () => {
		render(<InviteLinkCard placeId="place-42" />);
		const img = await screen.findByAltText("school.editor.invite.qrAlt");
		expect(img).toHaveAttribute("src", "data:image/png;base64,fake");
	});

	it("copies the link to the clipboard and shows confirmation", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();
		// userEvent.setup() installs its own clipboard stub on navigator, so
		// our mock must be applied after setup() to avoid being overwritten.
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});

		render(<InviteLinkCard placeId="place-42" />);
		await user.click(screen.getByText("school.editor.invite.copy"));

		expect(writeText).toHaveBeenCalledWith(
			`${window.location.origin}/cerca?placeId=place-42`,
		);
		await waitFor(() =>
			expect(
				screen.getByText("school.editor.invite.copied"),
			).toBeInTheDocument(),
		);
	});

	it("offers a download link for the QR image once ready", async () => {
		render(<InviteLinkCard placeId="place-42" />);
		const link = await screen.findByText("school.editor.invite.downloadQr");
		expect(link.closest("a")).toHaveAttribute(
			"href",
			"data:image/png;base64,fake",
		);
		expect(link.closest("a")).toHaveAttribute(
			"download",
			"invito-autoscuola-place-42.png",
		);
	});
});
