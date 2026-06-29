import { GraduationCap, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	approveEnrollment,
	type EnrollmentRequest,
	listEnrollmentRequests,
	rejectEnrollment,
} from "@/lib/booking/api";

const initials = (name: string | null) =>
	(name ?? "?")
		.split(" ")
		.map((p) => p[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

export function EnrollmentsInbox({ schoolId }: { schoolId: string }) {
	const { t } = useTranslation();
	const [items, setItems] = useState<EnrollmentRequest[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);

	const load = useCallback(
		() =>
			listEnrollmentRequests(schoolId)
				.then(setItems)
				.catch(() => setItems([])),
		[schoolId],
	);
	useEffect(() => {
		void load();
	}, [load]);

	const act = async (id: string, fn: () => Promise<unknown>) => {
		setErr(null);
		setBusy(id);
		try {
			await fn();
			await load();
		} catch (e) {
			const m = (e as Error).message;
			setErr(
				m === "student_active_elsewhere"
					? t("booking.school.activeElsewhere")
					: m,
			);
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
			<h3 className="text-base font-bold tracking-tight text-ink">
				{t("booking.school.enrollments")}
			</h3>
			{err && (
				<p
					role="alert"
					className="mt-3 rounded-[0.5rem] bg-accent-soft px-3 py-2 text-xs text-accent-ink"
				>
					{err}
				</p>
			)}
			{items.length === 0 ? (
				<p className="mt-4 text-sm text-ink-faint">
					{t("booking.school.noRequests")}
				</p>
			) : (
				<ul className="mt-3 divide-y divide-line">
					{items.map((e) => (
						<li key={e.enrollment_id} className="flex items-center gap-3 py-3">
							<span
								aria-hidden
								className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink"
							>
								{initials(e.full_name)}
							</span>

							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-ink">
									{e.full_name ?? (
										<span className="text-ink-faint">
											{t("booking.school.student")}
										</span>
									)}
								</p>
								<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
									{e.email && (
										<span className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
											<Mail size={12} aria-hidden className="shrink-0" />
											<span className="truncate">{e.email}</span>
										</span>
									)}
									{e.licence_code && (
										<span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-ink">
											<GraduationCap
												size={11}
												aria-hidden
												className="shrink-0"
											/>
											{e.licence_code}
										</span>
									)}
								</div>
							</div>

							<span className="flex shrink-0 gap-2">
								<button
									type="button"
									disabled={busy === e.enrollment_id}
									onClick={() =>
										act(e.enrollment_id, () =>
											approveEnrollment(e.enrollment_id),
										)
									}
									className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-60"
								>
									{t("booking.school.approve")}
								</button>
								<button
									type="button"
									disabled={busy === e.enrollment_id}
									onClick={() =>
										act(e.enrollment_id, () =>
											rejectEnrollment(e.enrollment_id),
										)
									}
									className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-60"
								>
									{t("booking.school.reject")}
								</button>
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
