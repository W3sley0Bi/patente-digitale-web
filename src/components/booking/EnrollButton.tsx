import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EnrollBlockedDialog } from "@/components/booking/EnrollBlockedDialog";
import { EnrollDialog } from "@/components/booking/EnrollDialog";
import {
	getAcceptedSchoolByPlaceId,
	getMyEnrollment,
	requestEnrollment,
} from "@/lib/booking/api";

type Status = "none" | "pending" | "active" | "blocked";

/**
 * Enroll entry point shown on a school's detail panel. The search data is keyed
 * by place_id, so we resolve it to the accepted driving_schools row before enrolling.
 * Renders nothing unless the place_id maps to an accepted school with booking enabled.
 *
 * `autoOpen` is set by the caller when this school was reached via the initial
 * ?placeId= deep link (invite link / QR). It opens the request dialog once
 * without waiting for a manual tap — or, when the student is blocked because
 * of an active enrollment at another school, an explanatory modal instead.
 * It must NOT be derived from the live URL: selecting a school also writes
 * placeId= to the URL (useCerca selection sync), and that must never
 * auto-open anything.
 */
export function EnrollButton({
	placeId,
	autoOpen = false,
	schoolName,
	schoolAddress,
}: {
	placeId: string;
	autoOpen?: boolean;
	/** Displayed in the enroll dialog so the student can confirm the school. */
	schoolName?: string;
	schoolAddress?: string;
}) {
	const { t } = useTranslation();
	const [school, setSchool] = useState<{
		id: string;
		email: string | null;
	} | null>(null);
	const [status, setStatus] = useState<Status>("none");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const autoOpenedRef = useRef(false);

	useEffect(() => {
		let cancelled = false;
		setReady(false);
		setSchool(null);
		setStatus("none");
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
				if (e && e.school_id === s.id) {
					setStatus(e.status === "active" ? "active" : "pending");
				} else if (e && e.status === "active") {
					// Active at a *different* school — the DB only allows one
					// active enrollment per student, so block instead of letting
					// the request fail with an unhandled constraint error.
					setStatus("blocked");
				}
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

	// Deep-link auto-open: fires at most once per mount, and only when the
	// caller flagged this school as the initial deep-link target.
	useEffect(() => {
		if (autoOpenedRef.current) return;
		if (!autoOpen || !ready) return;
		if (status === "none") {
			autoOpenedRef.current = true;
			setDialogOpen(true);
		} else if (status === "blocked") {
			autoOpenedRef.current = true;
			setBlockedDialogOpen(true);
		}
	}, [autoOpen, ready, status]);

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
	if (status === "blocked")
		return (
			<>
				<span className="text-sm text-ink-muted">
					{t("booking.enroll.blockedElsewhere")}
				</span>
				<EnrollBlockedDialog
					open={blockedDialogOpen}
					onOpenChange={setBlockedDialogOpen}
				/>
			</>
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
				schoolName={schoolName}
				schoolAddress={schoolAddress}
			/>
		</div>
	);
}
