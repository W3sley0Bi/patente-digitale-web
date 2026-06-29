import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EnrollDialog } from "@/components/booking/EnrollDialog";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
	requestEnrollment,
} from "@/lib/booking/api";

/**
 * Enroll entry point shown on a school's detail panel. The search data is keyed
 * by place_id, so we resolve it to the accepted driving_schools row before enrolling.
 * Renders nothing unless the place_id maps to an accepted school with booking enabled.
 */
export function EnrollButton({ placeId }: { placeId: string }) {
	const { t } = useTranslation();
	const [school, setSchool] = useState<{
		id: string;
		email: string | null;
	} | null>(null);
	const [status, setStatus] = useState<"none" | "pending" | "active">("none");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const s = await getAcceptedSchoolByPlaceId(placeId);
				if (cancelled) return;
				if (!s) {
					setReady(true);
					return;
				}
				setSchool({ id: s.id, email: s.email });
				const e = await getMyEnrollment();
				if (cancelled) return;
				if (e && e.school_id === s.id)
					setStatus(e.status === "active" ? "active" : "pending");
			} catch {
				/* leave hidden on resolve failure */
			} finally {
				if (!cancelled) setReady(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [placeId]);

	if (!ready || !school) return null;

	// Throws on failure so EnrollDialog can surface the error inline.
	const handleConfirm = async (licence: string, phone: string) => {
		await requestEnrollment(
			school.id,
			licence,
			phone,
			school.email ?? undefined,
		);
		setStatus("pending");
	};

	if (status === "active")
		return (
			<span className="text-sm font-bold text-brand-ink">
				{t("booking.enroll.active")}
			</span>
		);
	if (status === "pending")
		return (
			<span className="text-sm text-ink-muted">
				{t("booking.enroll.pending")}
			</span>
		);
	return (
		<div>
			<button
				type="button"
				onClick={() => setDialogOpen(true)}
				className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-95"
			>
				{t("booking.enroll.cta")}
			</button>
			<EnrollDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={handleConfirm}
			/>
		</div>
	);
}
