import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { addStudentManual } from "@/lib/booking/api";
import { PATENTE_CATEGORIES } from "@/lib/booking/licence";

interface AddStudentDialogProps {
	schoolId: string;
	open: boolean;
	onOpenChange(open: boolean): void;
	/** Called after a successful add — the parent refetches the list. */
	onAdded(): void;
}

/**
 * School manually adds a student who hasn't signed up yet. The row is created
 * unclaimed (reachable only via its contact email) until the student registers
 * and claims it via the emailed link or the invite flow.
 */
export function AddStudentDialog({
	schoolId,
	open,
	onOpenChange,
	onAdded,
}: AddStudentDialogProps) {
	const { t } = useTranslation();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [licenceCode, setLicenceCode] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setFullName("");
		setEmail("");
		setPhone("");
		setLicenceCode("");
		setError(null);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const name = fullName.trim();
		const mail = email.trim();
		if (!name || !mail) return;
		setSaving(true);
		setError(null);
		try {
			await addStudentManual(schoolId, {
				full_name: name,
				email: mail,
				phone: phone.trim() || undefined,
				licence_code: licenceCode || undefined,
			});
			reset();
			onOpenChange(false);
			onAdded();
		} catch (err) {
			setError(
				err instanceof Error && err.message === "student_email_exists"
					? t("booking.school.addStudentEmailExists")
					: t("booking.school.updateError"),
			);
		} finally {
			setSaving(false);
		}
	}

	const inputBase =
		"w-full rounded-[0.5rem] border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-line-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="pb-2">
					<DialogTitle>{t("booking.school.addStudentTitle")}</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-5 py-2"
					noValidate
				>
					{/* Full name */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="add-student-name"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.addStudentName")}
						</label>
						<input
							id="add-student-name"
							type="text"
							required
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							className={inputBase}
							autoComplete="off"
						/>
					</div>

					{/* Email + consent hint */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="add-student-email"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.addStudentEmail")}
						</label>
						<input
							id="add-student-email"
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className={inputBase}
							autoComplete="off"
							aria-describedby="add-student-email-hint"
						/>
						<p id="add-student-email-hint" className="text-xs text-ink-faint">
							{t("booking.school.addStudentHint")}
						</p>
					</div>

					{/* Phone */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="add-student-phone"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.addStudentPhone")}
						</label>
						<input
							id="add-student-phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+39 ..."
							className={inputBase}
							autoComplete="off"
						/>
					</div>

					{/* Licence */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="add-student-licence"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.addStudentLicence")}
						</label>
						<select
							id="add-student-licence"
							value={licenceCode}
							onChange={(e) => setLicenceCode(e.target.value)}
							className={inputBase}
						>
							<option value="">{t("booking.school.selectLicence")}</option>
							{PATENTE_CATEGORIES.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
					</div>

					{/* Error */}
					{error && (
						<p
							role="alert"
							className="rounded-[0.5rem] bg-accent-soft px-3 py-2 text-xs text-accent-ink"
						>
							{error}
						</p>
					)}

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							disabled={saving}
						>
							{t("booking.school.cancel")}
						</Button>
						<Button type="submit" size="sm" disabled={saving}>
							{saving
								? t("booking.school.savingStudent")
								: t("booking.school.addStudentSubmit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
