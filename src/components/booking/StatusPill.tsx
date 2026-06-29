import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, CircleCheck, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BookingStatus } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

// status → tokens + icon. Color is never the only signal: the label and the
// icon both carry the state (DESIGN a11y rule). Token utilities only.
const STATUS: Record<BookingStatus, { className: string; icon: LucideIcon }> = {
	confirmed: { className: "bg-brand-soft text-brand-ink", icon: CheckCircle2 },
	pending: { className: "bg-warning-soft text-warning-ink", icon: Clock },
	declined: { className: "bg-accent-soft text-accent-ink", icon: XCircle },
	cancelled: { className: "bg-bg-sunken text-ink-muted", icon: Ban },
	completed: { className: "bg-info-soft text-info-ink", icon: CircleCheck },
};

export function StatusPill({
	status,
	className,
}: {
	status: BookingStatus;
	className?: string;
}) {
	const { t } = useTranslation();
	const { className: tone, icon: Icon } = STATUS[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
				tone,
				className,
			)}
		>
			<Icon size={14} aria-hidden className="shrink-0" />
			{t(`booking.mine.status.${status}`)}
		</span>
	);
}
