import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { useAuth } from "@/hooks/useAuth";
import { getEmailSettings, setEmailSettings } from "@/lib/booking/api";
import { supabase } from "@/lib/supabase";

interface SchoolRow {
	id: string;
	name: string | null;
}

export default function DrivingSchoolSettings() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [school, setSchool] = useState<SchoolRow | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select("id, name")
			.eq("user_id", user.id)
			.eq("status", "accepted")
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(({ data }) => {
				setSchool((data as SchoolRow) ?? null);
				setLoading(false);
			});
	}, [user]);

	if (loading) {
		return (
			<DrivingSchoolLayout>
				<div className="flex min-h-[40vh] items-center justify-center">
					<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
				</div>
			</DrivingSchoolLayout>
		);
	}

	if (!school) {
		return (
			<DrivingSchoolLayout>
				<h1 className="text-2xl font-bold">
					{t("school.dashboard.nav.settings")}
				</h1>
				<p className="mt-2 text-sm text-ink-muted">
					{t("landing.placeholders.subtitle")}
				</p>
			</DrivingSchoolLayout>
		);
	}

	return (
		<DrivingSchoolLayout schoolName={school.name ?? undefined}>
			<header className="mb-8">
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink">
					{t("school.dashboard.nav.settings")}
				</p>
				<h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
					{t("booking.school.emailSettings")}
				</h1>
				<p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
					{t("booking.school.emailSettingsSubtitle")}
				</p>
			</header>

			<EmailSettings schoolId={school.id} />
		</DrivingSchoolLayout>
	);
}

function EmailSettings({ schoolId }: { schoolId: string }) {
	const { t } = useTranslation();
	const [schoolRequest, setSchoolRequest] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		getEmailSettings(schoolId)
			.then((flags) => {
				if (!active) return;
				setSchoolRequest(flags.schoolRequest);
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
	}, [schoolId]);

	const persist = async (nextSchool: boolean) => {
		setSaving(true);
		setSaved(false);
		setErr(null);
		try {
			await setEmailSettings(schoolId, nextSchool);
			setSaved(true);
		} catch (e) {
			// revert optimistic state on failure
			setSchoolRequest((prev) => (prev === nextSchool ? !prev : prev));
			setErr(t("booking.school.emailSettingsError"));
		} finally {
			setSaving(false);
		}
	};

	const toggleSchool = () => {
		const next = !schoolRequest;
		setSchoolRequest(next);
		void persist(next);
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
				{t("booking.school.emailSettings")}
			</h3>

			<Toggle
				checked={schoolRequest}
				onChange={toggleSchool}
				disabled={saving}
				label={t("booking.school.emailSchoolRequestLabel")}
				hint={t("booking.school.emailSchoolRequestHint")}
			/>

			{err && <p className="mt-4 text-sm text-red-600">{err}</p>}
			{!err && saved && (
				<p className="mt-4 text-sm text-brand-ink">
					{t("booking.school.emailSettingsSaved")}
				</p>
			)}
		</div>
	);
}

function Toggle({
	checked,
	onChange,
	disabled,
	label,
	hint,
}: {
	checked: boolean;
	onChange: () => void;
	disabled: boolean;
	label: string;
	hint: string;
}) {
	return (
		<div className="mt-5 border-t border-line pt-4">
			<div className="flex items-center gap-3">
				<label className="relative inline-block h-[25px] w-[50px] shrink-0">
					<input
						type="checkbox"
						checked={checked}
						onChange={onChange}
						disabled={disabled}
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
				<span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
					{label}
					<span className="group relative inline-flex">
						<button
							type="button"
							aria-label={hint}
							className="grid h-4 w-4 place-items-center rounded-full text-ink-faint transition-colors hover:text-brand"
						>
							<Info size={14} aria-hidden />
						</button>
						<span
							role="tooltip"
							className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink px-2.5 py-2 text-xs leading-snug font-normal text-bg opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
						>
							{hint}
						</span>
					</span>
				</span>
			</div>
		</div>
	);
}
