import QRCode from "qrcode";
import mascotLogo from "@/assets/mascot-logo.png";

const WIDTH = 1240; // A4 at ~150dpi
const HEIGHT = 1754;

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
		img.src = src;
	});
}

/** Wraps `text` onto centered lines no wider than `maxWidth`, returns the y of the last line drawn. */
function drawWrappedText(
	ctx: CanvasRenderingContext2D,
	text: string,
	centerX: number,
	startY: number,
	maxWidth: number,
	lineHeight: number,
): number {
	const words = text.split(" ");
	let line = "";
	let y = startY;
	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (ctx.measureText(candidate).width > maxWidth && line) {
			ctx.fillText(line, centerX, y);
			line = word;
			y += lineHeight;
		} else {
			line = candidate;
		}
	}
	if (line) {
		ctx.fillText(line, centerX, y);
		y += lineHeight;
	}
	return y;
}

/**
 * Renders a printable A4 poster (school name + tagline + QR code + our
 * branding) as a PNG data URL, for a school to print and display in its
 * office. Pure client-side canvas composition — no backend call.
 */
export async function generateInvitePosterDataUrl({
	schoolName,
	inviteUrl,
	tagline,
}: {
	schoolName: string;
	inviteUrl: string;
	tagline: string;
}): Promise<string> {
	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D context unavailable");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.textAlign = "center";

	const [logo, qrImg] = await Promise.all([
		loadImage(mascotLogo),
		QRCode.toDataURL(inviteUrl, { width: 720, margin: 1 }).then(loadImage),
	]);

	const logoSize = 170;
	ctx.drawImage(logo, (WIDTH - logoSize) / 2, 110, logoSize, logoSize);

	ctx.fillStyle = "#111111";
	ctx.font = "bold 40px sans-serif";
	ctx.fillText("Patentedigitale.it", WIDTH / 2, 330);

	ctx.font = "bold 60px sans-serif";
	const afterName = drawWrappedText(
		ctx,
		schoolName,
		WIDTH / 2,
		440,
		WIDTH - 160,
		72,
	);

	ctx.fillStyle = "#444444";
	ctx.font = "32px sans-serif";
	drawWrappedText(ctx, tagline, WIDTH / 2, afterName + 40, WIDTH - 220, 44);

	const qrSize = 720;
	ctx.drawImage(qrImg, (WIDTH - qrSize) / 2, HEIGHT - qrSize - 220, qrSize, qrSize);

	ctx.fillStyle = "#666666";
	ctx.font = "26px sans-serif";
	ctx.fillText(inviteUrl, WIDTH / 2, HEIGHT - 100);

	return canvas.toDataURL("image/png");
}
