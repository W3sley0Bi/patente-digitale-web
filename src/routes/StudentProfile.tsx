import { Lock, Mail, Phone, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getMyEnrollment } from "@/lib/booking/api";
import { supabase } from "@/lib/supabase";

export default function StudentProfile() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { profile, refresh } = useProfile();

	const [fullName, setFullName] = useState(profile?.full_name ?? "");
	const [phone, setPhone] = useState(profile?.phone ?? "");
	const [nameError, setNameError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const [licenceCode, setLicenceCode] = useState<string | null | undefined>(
		undefined,
	);

	// Sync form fields when profile loads
	useEffect(() => {
		setFullName(profile?.full_name ?? "");
		setPhone(profile?.phone ?? "");
	}, [profile?.full_name, profile?.phone]);

	// Load enrollment for licence info
	useEffect(() => {
		getMyEnrollment()
			.then((e) => setLicenceCode(e?.licence_code ?? null))
			.catch(() => setLicenceCode(null));
	}, []);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!profile) return;
		// Name is compulsory; the DB also refuses to blank it, but stop here for
		// immediate feedback rather than a silent no-op save.
		if (!fullName.trim()) {
			setNameError(true);
			return;
		}
		setSaving(true);
		setSaved(false);
		const { error } = await supabase
			.from("profiles")
			.update({ full_name: fullName.trim(), phone: phone.trim() || null })
			.eq("id", profile.id);
		setSaving(false);
		if (!error) {
			await refresh();
			setSaved(true);
			const timer = setTimeout(() => setSaved(false), 2500);
			return () => clearTimeout(timer);
		}
	};

	return (
		<StudentLayout>
			<div className="max-w-xl">
				{/* Page header */}
				<p className="text-xs font-semibold uppercase tracking-widest text-brand-ink">
					{t("student.profile.title")}
				</p>
				<h1 className="mt-1 text-[length:var(--text-xl)] font-bold text-ink">
					{t("student.profile.heading")}
				</h1>
				<p className="mt-1 text-sm text-ink-muted">
					{t("student.profile.subtitle")}
				</p>

				{/* Editable fields */}
				<form
					onSubmit={handleSave}
					className="mt-8 rounded-xl border border-line bg-bg-raised p-6"
				>
					<div className="flex flex-col gap-5">
						{/* Full name */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="full-name"
								className="flex items-center gap-1.5 text-sm font-medium text-ink"
							>
								<UserRound
									size={14}
									aria-hidden="true"
									className="text-ink-muted"
								/>
								{t("auth.form.fullName")}
							</label>
							<input
								id="full-name"
								type="text"
								value={fullName}
								onChange={(e) => {
									setFullName(e.target.value);
									if (nameError) setNameError(false);
								}}
								autoComplete="name"
								aria-invalid={nameError}
								className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink transition-colors duration-150 ease-out placeholder:text-ink-faint hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
							/>
							{nameError && (
								<span className="text-xs text-accent-ink">
									{t("auth.errors.fullNameRequired")}
								</span>
							)}
						</div>

						{/* Phone */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="phone"
								className="flex items-center gap-1.5 text-sm font-medium text-ink"
							>
								<Phone
									size={14}
									aria-hidden="true"
									className="text-ink-muted"
								/>
								{t("student.profile.phone")}
							</label>
							<input
								id="phone"
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								autoComplete="tel"
								placeholder={t("student.profile.phonePlaceholder")}
								className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink transition-colors duration-150 ease-out placeholder:text-ink-faint hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
							/>
						</div>
					</div>

					<div className="mt-6 flex items-center gap-3">
						<Button type="submit" disabled={saving} size="default">
							<Save size={14} aria-hidden="true" />
							{saving
								? t("student.profile.saving")
								: saved
									? t("student.profile.saved")
									: t("student.profile.save")}
						</Button>
					</div>
				</form>

				{/* Read-only fields */}
				<div className="mt-4 rounded-xl border border-line bg-bg-sunken p-6">
					<div className="flex flex-col gap-5">
						{/* Email */}
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
								<Mail size={14} aria-hidden="true" />
								{t("student.profile.email")}
								<Lock
									size={12}
									aria-hidden="true"
									className="ml-1 text-ink-faint"
								/>
							</div>
							<p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink-faint select-all">
								{user?.email ?? ""}
							</p>
							<p className="text-xs text-ink-faint">
								{t("student.profile.emailLocked")}
							</p>
						</div>

						{/* Licence */}
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
								{t("student.profile.licence")}
								<Lock
									size={12}
									aria-hidden="true"
									className="ml-1 text-ink-faint"
								/>
							</div>
							{licenceCode === undefined ? (
								<div className="h-10 rounded-lg bg-bg-sunken animate-pulse" />
							) : licenceCode ? (
								<p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm font-medium text-ink">
									{licenceCode}
								</p>
							) : (
								<p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink-faint">
									{t("student.profile.notEnrolled")}
								</p>
							)}
							<p className="text-xs text-ink-faint">
								{t("student.profile.licenceManaged")}
							</p>
						</div>
					</div>
				</div>
			</div>
		</StudentLayout>
	);
}
