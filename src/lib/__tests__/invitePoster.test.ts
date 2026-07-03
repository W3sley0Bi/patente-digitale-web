import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
	default: {
		toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake-qr"),
	},
}));

import { generateInvitePosterDataUrl } from "@/lib/invitePoster";

let shouldFailImage = false;

class FakeImage {
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	private _src = "";
	get src() {
		return this._src;
	}
	set src(value: string) {
		this._src = value;
		queueMicrotask(() => {
			if (shouldFailImage) this.onerror?.();
			else this.onload?.();
		});
	}
}

describe("generateInvitePosterDataUrl", () => {
	let ctx: {
		fillRect: ReturnType<typeof vi.fn>;
		fillText: ReturnType<typeof vi.fn>;
		drawImage: ReturnType<typeof vi.fn>;
		measureText: ReturnType<typeof vi.fn>;
		fillStyle: string;
		font: string;
		textAlign: string;
	};

	beforeEach(() => {
		shouldFailImage = false;
		vi.stubGlobal("Image", FakeImage);
		ctx = {
			fillRect: vi.fn(),
			fillText: vi.fn(),
			drawImage: vi.fn(),
			measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
			fillStyle: "",
			font: "",
			textAlign: "",
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			ctx as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,fake-poster",
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns the canvas-rendered poster as a PNG data URL", async () => {
		const result = await generateInvitePosterDataUrl({
			schoolName: "Autoscuola",
			inviteUrl: "https://patentedigitale.it/cerca?placeId=abc",
			tagline: "Scansiona per iscriverti",
		});

		expect(result).toBe("data:image/png;base64,fake-poster");
	});

	it("draws the school name and both images onto the canvas", async () => {
		await generateInvitePosterDataUrl({
			schoolName: "Autoscuola",
			inviteUrl: "https://patentedigitale.it/cerca?placeId=abc",
			tagline: "Scansiona per iscriverti",
		});

		expect(ctx.fillText).toHaveBeenCalledWith(
			"Autoscuola",
			expect.any(Number),
			expect.any(Number),
		);
		expect(ctx.drawImage).toHaveBeenCalledTimes(2);
	});

	it("rejects if an image fails to load", async () => {
		shouldFailImage = true;

		await expect(
			generateInvitePosterDataUrl({
				schoolName: "Autoscuola",
				inviteUrl: "https://patentedigitale.it/cerca?placeId=abc",
				tagline: "Scansiona per iscriverti",
			}),
		).rejects.toThrow();
	});

	it("throws if the canvas 2D context is unavailable", async () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

		await expect(
			generateInvitePosterDataUrl({
				schoolName: "Autoscuola",
				inviteUrl: "https://patentedigitale.it/cerca?placeId=abc",
				tagline: "Scansiona per iscriverti",
			}),
		).rejects.toThrow("Canvas 2D context unavailable");
	});
});
