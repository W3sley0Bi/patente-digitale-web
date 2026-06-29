import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	approveEnrollment,
	listSchoolEnrollments,
	rejectEnrollment,
} from "@/lib/booking/api";
import type { Enrollment } from "@/lib/booking/types";

export function EnrollmentsInbox({ schoolId }: { schoolId: string }) {
	const { t } = useTranslation();
	const [items, setItems] = useState<Enrollment[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const load = () =>
		listSchoolEnrollments(schoolId)
			.then(setItems)
			.catch(() => setItems([]));
	useEffect(() => {
		void load();
	}, [schoolId]);

	const pending = items.filter((e) => e.status === "pending");
	const act = async (fn: () => Promise<unknown>) => {
		setErr(null);
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
		}
	};

	return (
		<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
			<h3 className="text-base font-bold tracking-tight text-ink">
				{t("booking.school.enrollments")}
			</h3>
			{err && <p className="mt-2 text-sm text-red-600">{err}</p>}
			<ul className="mt-4 divide-y divide-line">
				{pending.map((e) => (
					<li
						key={e.id}
						className="flex items-center justify-between py-3 text-sm"
					>
						<span className="text-ink">
							{e.student_id.slice(0, 8)} · {e.licence_code ?? "—"}
						</span>
						<span className="flex gap-2">
							<button
								type="button"
								onClick={() => act(() => approveEnrollment(e.id))}
								className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white"
							>
								{t("booking.school.approve")}
							</button>
							<button
								type="button"
								onClick={() => act(() => rejectEnrollment(e.id))}
								className="rounded-md border border-line px-3 py-1 text-xs"
							>
								{t("booking.school.reject")}
							</button>
						</span>
					</li>
				))}
				{pending.length === 0 && (
					<li className="py-3 text-sm text-ink-faint">
						{t("booking.school.noRequests")}
					</li>
				)}
			</ul>
		</div>
	);
}
