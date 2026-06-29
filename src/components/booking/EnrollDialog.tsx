import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getMyContact, getMyEnrollment } from "@/lib/booking/api";
import { PATENTE_CATEGORIES } from "@/lib/booking/licence";
import { isValidPhone } from "@/lib/booking/phone";

const fieldClass =
	"rounded-(--radius-sm) border border-line bg-bg px-3 py-2 text-sm text-ink transition focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-brand/30";

/**
 * Collects the two details a school needs before it can act on an enrollment
 * request: the student's licence type (→ enrollment) and phone (→ profile).
 * Both are mandatory; the request can't be sent until they validate.
 */
export function EnrollDialog({
	open,
	onOpenChange,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (licence: string, phone: string) => Promise<void>;
}) {
	const { t } = useTranslation();
	const [licence, setLicence] = useState("");
	const [phone, setPhone] = useState("");
	const [touched, setTouched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	// Prefill from the profile / last enrollment when the dialog opens. Only fills
	// blanks so it never clobbers what the student is mid-edit.
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		void (async () => {
			const [contact, enr] = await Promise.all([
				getMyContact().catch(() => null),
				getMyEnrollment().catch(() => null),
			]);
			if (cancelled) return;
			if (contact?.phone) setPhone((p) => p || contact.phone || "");
			if (enr?.licence_code) setLicence((l) => l || enr.licence_code || "");
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);

	const licenceOk = licence.trim() !== "";
	const phoneOk = isValidPhone(phone);

	const submit = async () => {
		setTouched(true);
		if (!licenceOk || !phoneOk) return;
		setBusy(true);
		setErr(null);
		try {
			await onConfirm(licence.trim(), phone.trim());
			onOpenChange(false);
		} catch {
			setErr(t("booking.enroll.error"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!busy) onOpenChange(o);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("booking.enroll.dialogTitle")}</DialogTitle>
					<DialogDescription>
						{t("booking.enroll.dialogSubtitle")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<label className="flex flex-col gap-1.5 text-sm">
						<span className="font-medium text-ink">
							{t("booking.enroll.licenceLabel")}
						</span>
						<select
							value={licence}
							onChange={(e) => setLicence(e.target.value)}
							className={fieldClass}
							aria-invalid={touched && !licenceOk}
						>
							<option value="">{t("booking.enroll.licencePlaceholder")}</option>
							{PATENTE_CATEGORIES.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
						{touched && !licenceOk && (
							<span className="text-xs text-accent-ink">
								{t("booking.enroll.licenceRequired")}
							</span>
						)}
					</label>

					<label className="flex flex-col gap-1.5 text-sm">
						<span className="font-medium text-ink">
							{t("booking.enroll.phoneLabel")}
						</span>
						<input
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+39 ..."
							className={fieldClass}
							aria-invalid={touched && !phoneOk}
						/>
						{touched && !phoneOk && (
							<span className="text-xs text-accent-ink">
								{t("booking.enroll.phoneInvalid")}
							</span>
						)}
					</label>

					{err && (
						<p className="text-sm text-accent-ink" role="alert">
							{err}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={busy}
					>
						{t("booking.enroll.dialogCancel")}
					</Button>
					<Button onClick={submit} disabled={busy}>
						{busy
							? t("booking.enroll.dialogSending")
							: t("booking.enroll.dialogSubmit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
