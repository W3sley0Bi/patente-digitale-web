import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "@/components/booking/StatusPill";
import {
	confirmBooking,
	declineBooking,
	listInstructors,
	listSchoolBookings,
} from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";

export function RequestsInbox({
	schoolId,
	onChange,
}: {
	schoolId: string;
	onChange?: () => void;
}) {
	const { t, i18n } = useTranslation();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [instructors, setInstructors] = useState<Instructor[]>([]);
	const [picked, setPicked] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState<string | null>(null);
	const [err, setErr] = useState<Record<string, string>>({});

	const load = async () => {
		const [b, i] = await Promise.all([
			listSchoolBookings(schoolId),
			listInstructors(schoolId),
		]);
		setBookings(b);
		setInstructors(i.filter((x) => x.active));
	};
	useEffect(() => {
		void load().catch(() => {});
	}, [schoolId]);

	const pending = bookings.filter((b) => b.status === "pending");

	const confirm = async (b: Booking) => {
		const instructorId = picked[b.id];
		if (!instructorId) {
			setErr((e) => ({ ...e, [b.id]: t("booking.school.assignInstructor") }));
			return;
		}
		setBusy(b.id);
		setErr((e) => ({ ...e, [b.id]: "" }));
		try {
			await confirmBooking(b.id, instructorId);
			await load();
			onChange?.();
		} catch (e) {
			const m = (e as Error).message;
			setErr((prev) => ({
				...prev,
				[b.id]:
					m === "instructor_busy" ? t("booking.school.instructorBusy") : m,
			}));
		} finally {
			setBusy(null);
		}
	};
	const decline = async (b: Booking) => {
		setBusy(b.id);
		try {
			await declineBooking(b.id);
			await load();
			onChange?.();
		} finally {
			setBusy(null);
		}
	};

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
		<section className="rounded-[1.5rem] border border-line bg-bg-raised">
			<header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
				<h2 className="text-base font-bold tracking-tight text-ink">
					{t("booking.school.requests")}
				</h2>
				{pending.length > 0 && (
					<span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
						{pending.length}
					</span>
				)}
			</header>

			{pending.length === 0 ? (
				<p className="px-5 py-6 text-sm text-ink-faint">
					{t("booking.school.noRequests")}
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
					{pending.map((b) => {
						const { day, time } = fmt(b.starts_at);
						const isBusy = busy === b.id;
						return (
							<li
								key={b.id}
								className="rounded-xl border border-line bg-bg p-3.5"
							>
								<div className="flex items-baseline justify-between gap-2">
									<span className="text-sm font-semibold text-ink">
										{day} · {time}
									</span>
									<span className="text-xs text-ink-faint">
										{b.duration_min}m
									</span>
								</div>
								<div className="mt-2">
									<StatusPill status={b.status} />
								</div>
								<div className="mt-2.5 flex items-center gap-2">
									<select
										value={picked[b.id] ?? ""}
										onChange={(e) =>
											setPicked((p) => ({ ...p, [b.id]: e.target.value }))
										}
										className="min-w-0 flex-1 rounded-md border border-line bg-bg-raised px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
									>
										<option value="">
											{t("booking.school.assignInstructor")}
										</option>
										{instructors.map((i) => (
											<option key={i.id} value={i.id}>
												{i.name}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => confirm(b)}
										disabled={isBusy}
										aria-label={t("booking.school.confirm")}
										className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
									>
										<Check size={16} aria-hidden />
									</button>
									<button
										type="button"
										onClick={() => decline(b)}
										disabled={isBusy}
										aria-label={t("booking.school.decline")}
										className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
									>
										<X size={16} aria-hidden />
									</button>
								</div>
								{err[b.id] && (
									<p className="mt-2 text-xs text-accent-ink">{err[b.id]}</p>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
