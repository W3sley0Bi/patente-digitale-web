import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateInvitePosterDataUrl } from "@/lib/invitePoster";

interface InviteLinkCardProps {
	placeId: string;
	schoolName: string;
}

/**
 * A static, reusable enroll link + QR code for a single school, built purely
 * from its own place_id — no invite tokens, no expiry, no tracking. The link
 * points at the existing marketing deep-link route (/cerca?placeId=...),
 * which already auto-selects the school and surfaces the right enroll CTA
 * for both signed-in and anonymous visitors.
 *
 * "Download" produces a printable A4 poster (our branding + school name +
 * QR code), not a bare QR image — schools print this and hang it in their
 * office, so it needs to look presentable on its own.
 */
export function InviteLinkCard({ placeId, schoolName }: InviteLinkCardProps) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [generatingPoster, setGeneratingPoster] = useState(false);
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const inviteUrl = `${window.location.origin}/cerca?placeId=${encodeURIComponent(placeId)}`;

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
		};
	}, []);

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
		if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
		copiedTimeoutRef.current = setTimeout(() => {
			setCopied(false);
			copiedTimeoutRef.current = null;
		}, 2000);
	};

	const handleDownloadPoster = async () => {
		setGeneratingPoster(true);
		try {
			const posterDataUrl = await generateInvitePosterDataUrl({
				schoolName,
				inviteUrl,
				tagline: t("school.editor.invite.posterTagline"),
			});
			const link = document.createElement("a");
			link.href = posterDataUrl;
			link.download = `invito-autoscuola-${placeId}.png`;
			link.click();
		} catch {
			/* generation failed client-side; nothing to download, no state to roll back */
		} finally {
			setGeneratingPoster(false);
		}
	};

	return (
		<div className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-bg p-2 sm:justify-end">
			{qrDataUrl && (
				<img
					src={qrDataUrl}
					alt={t("school.editor.invite.qrAlt")}
					width={44}
					height={44}
					className="shrink-0 rounded-md border border-line"
				/>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-1">
					<p className="truncate text-xs font-semibold text-ink">
						{t("school.editor.invite.heading")}
					</p>
					<Tooltip>
						<TooltipTrigger
							aria-label={t("school.editor.invite.moreInfo")}
							className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
						>
							<Info size={13} />
						</TooltipTrigger>
						<TooltipContent>
							{t("school.editor.invite.description")}
						</TooltipContent>
					</Tooltip>
				</div>
				<div className="flex items-center gap-1">
					<input
						readOnly
						value={inviteUrl}
						onFocus={(e) => e.currentTarget.select()}
						aria-label={t("school.editor.invite.description")}
						className="min-w-0 flex-1 rounded-md border border-line bg-bg-raised px-2 py-1 text-[11px] text-ink"
					/>
					<button
						type="button"
						onClick={handleCopy}
						aria-live="polite"
						className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink hover:bg-line/30"
					>
						{copied
							? t("school.editor.invite.copied")
							: t("school.editor.invite.copy")}
					</button>
					{qrDataUrl && (
						<button
							type="button"
							onClick={handleDownloadPoster}
							disabled={generatingPoster}
							className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink hover:bg-line/30 disabled:opacity-60"
						>
							{generatingPoster
								? t("school.editor.invite.generatingPoster")
								: t("school.editor.invite.downloadQr")}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
