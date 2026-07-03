import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";

interface InviteLinkCardProps {
	placeId: string;
}

/**
 * A static, reusable enroll link + QR code for a single school, built purely
 * from its own place_id — no invite tokens, no expiry, no tracking. The link
 * points at the existing marketing deep-link route (/cerca?placeId=...),
 * which already auto-selects the school and surfaces the right enroll CTA
 * for both signed-in and anonymous visitors.
 */
export function InviteLinkCard({ placeId }: InviteLinkCardProps) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	const inviteUrl = `${window.location.origin}/cerca?placeId=${encodeURIComponent(placeId)}`;

	useEffect(() => {
		let cancelled = false;
		QRCode.toDataURL(inviteUrl, { width: 240, margin: 1 })
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [inviteUrl]);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(inviteUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-4 sm:flex-row sm:items-center">
			{qrDataUrl && (
				<img
					src={qrDataUrl}
					alt={t("school.editor.invite.qrAlt")}
					width={120}
					height={120}
					className="shrink-0 rounded-lg border border-line"
				/>
			)}
			<div className="flex flex-1 flex-col gap-2">
				<p className="text-sm text-ink-muted">
					{t("school.editor.invite.description")}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<input
						readOnly
						value={inviteUrl}
						onFocus={(e) => e.currentTarget.select()}
						className="min-w-0 flex-1 rounded-lg border border-line bg-bg-raised px-3 py-2 text-xs text-ink"
					/>
					<button
						type="button"
						onClick={handleCopy}
						className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-line/30"
					>
						{copied
							? t("school.editor.invite.copied")
							: t("school.editor.invite.copy")}
					</button>
					{qrDataUrl && (
						<a
							href={qrDataUrl}
							download={`invito-autoscuola-${placeId}.png`}
							className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-line/30"
						>
							{t("school.editor.invite.downloadQr")}
						</a>
					)}
				</div>
			</div>
		</div>
	);
}
