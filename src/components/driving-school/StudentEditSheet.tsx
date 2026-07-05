import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	type EnrolledStudent,
	removeStudent,
	updateStudentAsSchool,
} from "@/lib/booking/api";
import { PATENTE_CATEGORIES } from "@/lib/booking/licence";

interface StudentEditSheetProps {
	schoolId: string;
	student: EnrolledStudent | null;
	open: boolean;
	onOpenChange(open: boolean): void;
	onSaved(): void;
}

export function StudentEditSheet({
	schoolId,
	student,
	open,
	onOpenChange,
	onSaved,
}: StudentEditSheetProps) {
	const { t } = useTranslation();

	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [licenceCode, setLicenceCode] = useState("");
	const [email, setEmail] = useState("");
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sync form fields whenever the sheet opens or the student changes
	useEffect(() => {
		if (open && student) {
			setFullName(student.full_name ?? "");
			setPhone(student.phone ?? "");
			setLicenceCode(student.licence_code ?? "");
			setEmail(student.email ?? "");
			setError(null);
		}
	}, [open, student]);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!student) return;
		if (!student.is_claimed && !email.trim()) {
			setError(t("school.claimForm.errors.requiredField"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await updateStudentAsSchool(schoolId, student.student_id, {
				full_name: fullName.trim() || undefined,
				phone: phone.trim() || null,
				licence_code: licenceCode || null,
				...(student.is_claimed ? {} : { email: email.trim() }),
			});
			onSaved();
			onOpenChange(false);
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

	async function handleRemove() {
		if (!student) return;
		if (!window.confirm(t("booking.school.removeStudent"))) return;
		setRemoving(true);
		setError(null);
		try {
			await removeStudent(student.student_id);
			onOpenChange(false);
			onSaved();
		} catch {
			setError(t("booking.school.updateError"));
		} finally {
			setRemoving(false);
		}
	}

	const inputBase =
		"w-full rounded-[0.5rem] border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-line-strong focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-md overflow-y-auto">
				<SheetHeader className="pb-2">
					<SheetTitle>{t("booking.school.editStudent")}</SheetTitle>
					{student?.email && (
						<SheetDescription>{student.email}</SheetDescription>
					)}
				</SheetHeader>

				<form
					onSubmit={handleSave}
					className="flex flex-col gap-5 px-4 py-2"
					noValidate
				>
					{/* Full name */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="student-full-name"
							className="text-xs font-semibold text-ink"
						>
							{t("auth.form.fullName")}
						</label>
						<input
							id="student-full-name"
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							className={inputBase}
							autoComplete="off"
						/>
					</div>

					{/* Phone */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="student-phone"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.studentPhone")}
						</label>
						<input
							id="student-phone"
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
							htmlFor="student-licence"
							className="text-xs font-semibold text-ink"
						>
							{t("booking.school.studentLicence")}
						</label>
						<select
							id="student-licence"
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

					{/* Email — editable while unclaimed, locked once claimed */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="student-email"
							className="text-xs font-semibold text-ink"
						>
							Email
						</label>
						{student?.is_claimed ? (
							<>
								<input
									id="student-email"
									type="email"
									value={student?.email ?? ""}
									disabled
									className={inputBase}
									aria-describedby="student-email-locked"
								/>
								<p id="student-email-locked" className="text-xs text-ink-faint">
									{t("booking.school.emailLocked")}
								</p>
							</>
						) : (
							<input
								id="student-email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={inputBase}
								autoComplete="off"
							/>
						)}
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
				</form>

				<SheetFooter className="gap-2 px-4">
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={handleRemove}
						disabled={saving || removing}
						className="sm:mr-auto"
					>
						{t("booking.school.removeStudent")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={saving || removing}
					>
						{t("booking.school.cancel")}
					</Button>
					<Button
						type="submit"
						size="sm"
						disabled={saving || removing}
						onClick={handleSave}
					>
						{saving
							? t("booking.school.savingStudent")
							: t("booking.school.saveStudent")}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
