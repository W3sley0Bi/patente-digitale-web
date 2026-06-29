import { Apple, CalendarCheck, CalendarSync } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

/**
 * Dashboard widget that lets a student auto-sync every confirmed lesson to their
 * own calendar via a personal secret .ics subscription feed.
 *
 * - A toggle persists `profiles.calendar_auto`.
 * - When on, two subscribe affordances appear (Apple/iCloud via webcal:// and
 *   Google via the add-by-URL screen). Subscribing once keeps every future
 *   lesson in sync, no per-lesson action needed.
 */
export function CalendarPreference() {
	const { t } = useTranslation();
	const { profile, refresh } = useProfile();
	const [saving, setSaving] = useState(false);
	const switchId = useId();

	const token = profile?.calendar_feed_token;
	const auto = profile?.calendar_auto ?? false;

	if (!profile || !token) return null;

	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
	const feedUrl = `${supabaseUrl}/functions/v1/calendar-feed?token=${token}`;
	const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
	const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
		webcalUrl,
	)}`;

	const handleToggle = async (checked: boolean) => {
		setSaving(true);
		const { error } = await supabase
			.from("profiles")
			.update({ calendar_auto: checked })
			.eq("id", profile.id);
		setSaving(false);
		if (!error) await refresh();
	};

	return (
		<section className="mt-6 rounded-2xl border border-line bg-bg-raised p-5">
			<div className="flex items-start gap-3">
				<span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
					<CalendarSync size={18} aria-hidden="true" />
				</span>
				<div className="min-w-0 flex-1">
					<h2 className="text-base font-bold text-ink">
						{t("calendar.preference.title")}
					</h2>
					<p className="mt-1 text-sm text-ink-muted">
						{t("calendar.preference.description")}
					</p>
				</div>
			</div>

			<label
				htmlFor={switchId}
				className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-bg-sunken px-4 py-3 transition-colors"
			>
				<Checkbox
					id={switchId}
					checked={auto}
					disabled={saving}
					onCheckedChange={(checked) => void handleToggle(checked)}
				/>
				<span className="text-sm font-medium text-ink">
					{t("calendar.preference.autoToggle")}
				</span>
			</label>

			<div className="mt-4">
				<p className="text-sm font-medium text-ink">
					{t("calendar.preference.subscribeTitle")}
				</p>
				<p className="mt-1 text-sm text-ink-muted">
					{t("calendar.preference.subscribeHelp")}
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					<a
						href={webcalUrl}
						className="inline-flex items-center gap-2 rounded-pill border border-line bg-bg px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-focus-ring]"
					>
						<Apple size={16} aria-hidden="true" />
						{t("calendar.preference.subscribeApple")}
					</a>
					<a
						href={googleUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 rounded-pill border border-line bg-bg px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-focus-ring]"
					>
						<CalendarCheck size={16} aria-hidden="true" />
						{t("calendar.preference.subscribeGoogle")}
					</a>
				</div>
				<p className="mt-3 text-xs text-ink-faint">
					{t("calendar.preference.secretNote")}
				</p>
			</div>
		</section>
	);
}
