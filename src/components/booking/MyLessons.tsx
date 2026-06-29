import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddToCalendar } from "@/components/booking/AddToCalendar";
import { StatusPill } from "@/components/booking/StatusPill";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cancelBooking, listMyBookings } from "@/lib/booking/api";
import { effectiveStatus, isCancellable } from "@/lib/booking/helpers";
import type { Booking } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

export function MyLessons({ refreshKey = 0 }: { refreshKey?: number }) {
	const { t, i18n } = useTranslation();
	const [items, setItems] = useState<Booking[]>([]);
	// The lesson awaiting cancel confirmation; null = dialog closed.
	const [pending, setPending] = useState<Booking | null>(null);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);

	const load = () =>
		listMyBookings()
			.then(setItems)
			.catch(() => setItems([]));
	useEffect(() => {
		void load();
	}, [refreshKey]);

	const closeDialog = () => {
		if (busy) return;
		setPending(null);
		setReason("");
	};

	const confirmCancel = async () => {
		if (!pending) return;
		setBusy(true);
		try {
			await cancelBooking(pending.id, reason.trim() || undefined);
			await load();
			setPending(null);
			setReason("");
		} finally {
			setBusy(false);
		}
	};

	// Locale-aware, second-free formatting (mirrors RequestsInbox).
	const fmt = (iso: string) => {
		const d = new Date(iso);
		return {
			day: d.toLocaleDateString(i18n.language, {
				weekday: "short",
				day: "2-digit",
				month: "short",
			}),
			time: d.toLocaleTimeString(i18n.language, {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};
	};

	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-6">
			<h3 className="font-sans text-lg font-black text-ink">
				{t("booking.mine.title")}
			</h3>
			<ul className="mt-2 divide-y divide-line">
				{items.map((b) => {
					const st = effectiveStatus(b);
					const { day, time } = fmt(b.starts_at);
					// Past/closed lessons read quieter; nothing left to act on.
					const inactive =
						st === "cancelled" || st === "declined" || st === "completed";
					const showCalendar = st === "confirmed" || st === "completed";
					const cancellable = isCancellable(b) && st !== "completed";
					return (
						<li
							key={b.id}
							className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5 text-sm"
						>
							<span
								className={cn(
									"font-medium tabular-nums",
									inactive ? "text-ink-faint" : "text-ink",
								)}
							>
								{day}
								<span className="text-ink-faint"> · </span>
								{time}
							</span>
							<StatusPill status={st} />
							{(showCalendar || cancellable) && (
								<span className="ml-auto flex items-center gap-1">
									{showCalendar && <AddToCalendar booking={b} />}
									{cancellable && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setPending(b)}
											className="text-ink-muted hover:bg-accent-soft/60 hover:text-accent-ink"
										>
											{t("booking.mine.cancel")}
										</Button>
									)}
								</span>
							)}
						</li>
					);
				})}
				{items.length === 0 && (
					<li className="flex flex-col items-center gap-2 py-10 text-center">
						<CalendarClock
							size={24}
							className="text-ink-faint"
							aria-hidden="true"
						/>
						<p className="text-sm text-ink-faint">{t("booking.mine.empty")}</p>
					</li>
				)}
			</ul>

			<Dialog
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) closeDialog();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("booking.mine.cancelTitle")}</DialogTitle>
						<DialogDescription>
							{pending
								? t("booking.mine.cancelBody", {
										datetime: new Date(pending.starts_at).toLocaleString(),
									})
								: null}
						</DialogDescription>
					</DialogHeader>

					<label className="flex flex-col gap-1.5 text-sm">
						<span className="text-ink-muted">
							{t("booking.mine.cancelReason")}
						</span>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							className="resize-none rounded-(--radius-sm) border border-line bg-bg px-3 py-2 text-sm text-ink transition focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-brand/30"
						/>
					</label>

					<DialogFooter>
						<Button variant="ghost" onClick={closeDialog} disabled={busy}>
							{t("booking.mine.cancelKeep")}
						</Button>
						<Button
							variant="destructive"
							onClick={confirmCancel}
							disabled={busy}
						>
							{busy
								? t("booking.mine.cancelling")
								: t("booking.mine.cancelConfirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
