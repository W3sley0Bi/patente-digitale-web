import { MapPin, Phone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EnrollButton } from "@/components/booking/EnrollButton";
import type { NormalizedSchool } from "@/lib/geojson";

interface AppSchoolDetailPanelProps {
	school: NormalizedSchool | null;
	onClose: () => void;
}

/**
 * Student-facing detail panel for the in-app school finder. Deliberately not
 * a reuse of cerca/SchoolDetailPanel: that file renders the owner-claim CTA
 * and marketing links, which must never appear in the app-scoped finder.
 */
export function AppSchoolDetailPanel({
	school,
	onClose,
}: AppSchoolDetailPanelProps) {
	const { t } = useTranslation();

	if (!school) return null;

	return (
		<div className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[70%] flex-col overflow-y-auto rounded-t-2xl border border-line bg-bg-raised shadow-2xl md:inset-y-0 md:left-0 md:right-auto md:w-72 md:max-h-none md:rounded-t-none md:rounded-r-2xl">
			<div className="relative shrink-0 px-5 pt-5 pb-4">
				<button
					type="button"
					onClick={onClose}
					aria-label={t("booking.student.schoolFinder.closeModal")}
					className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink"
				>
					<X size={16} />
				</button>
				<h2 className="pe-8 font-sans text-base font-black leading-snug text-ink">
					{school.name}
				</h2>
			</div>

			<div className="mx-5 shrink-0 border-t border-line" />

			<div className="flex flex-col gap-3 px-5 py-4">
				{(school.address || school.city) && (
					<div className="flex items-start gap-2.5">
						<MapPin size={14} className="mt-0.5 shrink-0 text-ink-faint" />
						<span className="font-sans text-sm text-ink-muted leading-snug">
							{[school.address, school.city, school.zip]
								.filter(Boolean)
								.join(", ")}
						</span>
					</div>
				)}

				{school.phone && (
					<div className="flex items-start gap-2.5">
						<Phone size={14} className="shrink-0 text-brand" />
						<a
							href={`tel:${school.phone}`}
							className="font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
						>
							{school.phone}
						</a>
					</div>
				)}
			</div>

			{school._placeId && (
				<div className="mt-auto shrink-0 border-t border-line px-5 pb-5 pt-4">
					<EnrollButton placeId={school._placeId} />
				</div>
			)}
		</div>
	);
}
