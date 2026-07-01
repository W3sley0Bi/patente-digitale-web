import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudentLayout } from "@/components/student/StudentLayout";
import {
	getMyEmailConfirmations,
	setMyEmailConfirmations,
} from "@/lib/booking/api";

export default function StudentSettings() {
	const { t } = useTranslation();

	return (
		<StudentLayout>
			<header className="mb-8">
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink">
					{t("student.nav.settings")}
				</p>
				<h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
					{t("student.settings.heading")}
				</h1>
				<p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
					{t("student.settings.subtitle")}
				</p>
			</header>

			<EmailSettings />
		</StudentLayout>
	);
}

function EmailSettings() {
	const { t } = useTranslation();
	const [emailConfirm, setEmailConfirm] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		getMyEmailConfirmations()
			.then((value) => {
				if (!active) return;
				setEmailConfirm(value);
				setLoading(false);
			})
			.catch((e) => {
				if (!active) return;
				setErr((e as Error).message);
				setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const toggle = async () => {
		const next = !emailConfirm;
		setEmailConfirm(next);
		setSaving(true);
		setSaved(false);
		setErr(null);
		try {
			await setMyEmailConfirmations(next);
			setSaved(true);
		} catch {
			setEmailConfirm(!next); // revert optimistic state on failure
			setErr(t("student.settings.error"));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
				<div className="h-6 w-32 animate-pulse rounded bg-brand/10" />
			</div>
		);
	}

	return (
		<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
			<h3 className="text-base font-bold tracking-tight text-ink">
				{t("student.settings.heading")}
			</h3>

			<div className="mt-5 border-t border-line pt-4">
				<div className="flex items-start gap-3">
					<label className="relative mt-0.5 inline-block h-[25px] w-[50px] shrink-0">
						<input
							type="checkbox"
							checked={emailConfirm}
							onChange={toggle}
							disabled={saving}
							className="peer sr-only"
						/>
						<span
							aria-hidden
							className="absolute inset-0 rounded-full bg-gradient-to-b from-[#b3b3b3] to-[#e6e6e6] transition-colors peer-checked:from-[#4cd964] peer-checked:to-[#5de24e]"
						/>
						<span
							aria-hidden
							className="absolute top-px left-px h-[23px] w-[23px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform peer-checked:translate-x-[25px]"
						/>
					</label>
					<div className="flex flex-col gap-0.5">
						<span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
							<BellRing
								size={14}
								aria-hidden="true"
								className="text-ink-muted"
							/>
							{t("student.profile.emailConfirmLabel")}
						</span>
						<span className="text-xs text-ink-muted">
							{t("student.profile.emailConfirmHint")}
						</span>
					</div>
				</div>
			</div>

			{err && <p className="mt-4 text-sm text-red-600">{err}</p>}
			{!err && saved && (
				<p className="mt-4 text-sm text-brand-ink">
					{t("student.settings.saved")}
				</p>
			)}
		</div>
	);
}
