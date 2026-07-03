import {
	BadgeCheck,
	ChevronDown,
	ChevronUp,
	Clock,
	ExternalLink,
	Globe,
	MapPin,
	Phone,
	Star,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EnrollButton } from "@/components/booking/EnrollButton";
import type { NormalizedSchool } from "@/lib/geojson";

interface AppSchoolDetailPanelProps {
	school: NormalizedSchool | null;
	onClose: () => void;
	/**
	 * The initial ?placeId= deep link (from useCerca). When it matches the shown
	 * school, EnrollButton auto-opens its dialog. Must be the mount-captured
	 * value, never the live URL param — selection sync also writes placeId=.
	 */
	deepLinkPlaceId?: string | null;
}

/**
 * Student-facing detail panel for the in-app school finder. Deliberately not
 * a reuse of cerca/SchoolDetailPanel: that file renders the owner-claim CTA
 * and marketing links, which must never appear in the app-scoped finder. It
 * does mirror the same info display (verified badge, rating, hours, website)
 * since students need the same details to decide where to enroll.
 *
 * Renders both a desktop slide-in and a mobile bottom sheet + backdrop, same
 * as cerca/SchoolDetailPanel. The mobile sheet uses fixed positioning so it
 * shows full screen from the bottom regardless of where this component is
 * mounted in the tree — callers must mount it somewhere that isn't itself
 * hidden (e.g. behind a display:none toggle) on mobile.
 */
export function AppSchoolDetailPanel({
	school,
	onClose,
	deepLinkPlaceId,
}: AppSchoolDetailPanelProps) {
	const { t } = useTranslation();
	const isVerified = school?.partner === true;
	const visible = school !== null;

	return (
		<>
			{/* Desktop: slides in from the left over the map */}
			<div
				className={[
					"absolute left-0 top-0 z-[1000] hidden h-full w-72 flex-col bg-bg-raised shadow-2xl transition-transform duration-300 ease-out md:flex",
					visible ? "translate-x-0" : "-translate-x-full",
				].join(" ")}
			>
				{school && (
					<PanelContent
						school={school}
						isVerified={isVerified}
						onClose={onClose}
						deepLinkPlaceId={deepLinkPlaceId}
						t={t}
					/>
				)}
			</div>

			{/* Mobile: slides up from the bottom, full screen */}
			<div
				className={[
					"fixed inset-x-0 bottom-0 z-[2000] flex flex-col rounded-t-2xl bg-bg-raised shadow-2xl transition-transform duration-300 ease-out md:hidden",
					visible ? "translate-y-0" : "translate-y-full",
				].join(" ")}
				style={{ maxHeight: "80vh" }}
			>
				{school && (
					<PanelContent
						school={school}
						isVerified={isVerified}
						onClose={onClose}
						deepLinkPlaceId={deepLinkPlaceId}
						t={t}
					/>
				)}
			</div>

			{/* Mobile backdrop */}
			{visible && (
				<div
					className="fixed inset-0 z-[1999] bg-ink/10 md:hidden"
					onClick={onClose}
				/>
			)}
		</>
	);
}

interface PanelContentProps {
	school: NormalizedSchool;
	isVerified: boolean;
	onClose: () => void;
	deepLinkPlaceId?: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	t: any;
}

function PanelContent({
	school,
	isVerified,
	onClose,
	deepLinkPlaceId,
	t,
}: PanelContentProps) {
	const [hoursExpanded, setHoursExpanded] = useState(false);

	// Map JS getDay() (0=Sunday) to our typical Monday-indexed data order.
	const todayIndex = new Date().getDay();
	const mappedIndex = todayIndex === 0 ? 6 : todayIndex - 1;

	const getTodayHours = () => {
		if (!school.openingHours) return null;
		const dayNames = [
			["Lunedì", "Monday"],
			["Martedì", "Tuesday"],
			["Mercoledì", "Wednesday"],
			["Giovedì", "Thursday"],
			["Venerdì", "Friday"],
			["Sabato", "Saturday"],
			["Domenica", "Sunday"],
		];
		const [it, en] = dayNames[mappedIndex];
		return (
			school.openingHours.find((h) => h.startsWith(it) || h.startsWith(en)) ||
			school.openingHours[mappedIndex]
		);
	};

	const todayHours = getTodayHours();

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			{isVerified && (
				<div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300" />
			)}

			<div
				className={[
					"relative shrink-0 px-5 pt-5 pb-4",
					isVerified ? "bg-gradient-to-b from-emerald-50 to-transparent" : "",
				].join(" ")}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("booking.student.schoolFinder.closeModal")}
					className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink"
				>
					<X size={16} />
				</button>

				{isVerified && (
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-1.5">
							<BadgeCheck
								className="h-4 w-4 text-emerald-600"
								strokeWidth={3}
							/>
							<span className="font-sans text-[11px] font-bold uppercase tracking-wide text-emerald-600">
								{t("cerca.detail.partnerVerified")}
							</span>
						</div>
						{school.enrollment_enabled && (
							<div className="flex items-center gap-1">
								<Zap
									size={12}
									className="fill-amber-400 text-amber-400"
									strokeWidth={0}
								/>
								<span className="font-sans text-[11px] font-bold uppercase tracking-wide text-amber-600">
									{t("cerca.card.enrollBadge")}
								</span>
							</div>
						)}
					</div>
				)}

				<h2 className="pe-8 font-sans text-base font-black leading-snug text-ink">
					{school.name}
				</h2>
			</div>

			<div className="mx-5 shrink-0 border-t border-line" />

			<div className="flex flex-col gap-3 px-5 py-4">
				{isVerified && school.rating != null && (
					<div className="flex items-center gap-1.5">
						<Star size={13} className="fill-amber-400 text-amber-400" />
						<span className="font-sans text-sm font-bold text-ink">
							{school.rating.toFixed(1)}
						</span>
						{school.userRatingCount != null && (
							<span className="font-sans text-xs text-ink-faint">
								({school.userRatingCount})
							</span>
						)}
					</div>
				)}

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

				{isVerified && school.website && (
					<div className="flex items-start gap-2.5">
						<Globe size={14} className="shrink-0 text-brand" />
						<a
							href={school.website}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
						>
							{new URL(school.website).hostname.replace(/^www\./, "")}
							<ExternalLink size={11} className="opacity-60" />
						</a>
					</div>
				)}

				{isVerified &&
					school.openingHours &&
					school.openingHours.length > 0 && (
						<div className="flex items-start gap-2.5">
							<Clock size={14} className="mt-0.5 shrink-0 text-ink-faint" />
							<div className="flex flex-col gap-1">
								<button
									type="button"
									onClick={() => setHoursExpanded(!hoursExpanded)}
									className="flex items-center gap-1.5 text-left transition-colors hover:text-ink"
								>
									<span className="font-sans text-sm font-bold text-ink">
										{todayHours || school.openingHours[0]}
									</span>
									{hoursExpanded ? (
										<ChevronUp size={14} />
									) : (
										<ChevronDown size={14} />
									)}
								</button>

								{hoursExpanded && (
									<div className="mt-1 flex flex-col gap-1 rounded-lg bg-line/30 p-2">
										{school.openingHours.map((line) => {
											const isToday = todayHours === line;
											return (
												<span
													key={line}
													className={[
														"font-sans text-xs leading-snug",
														isToday ? "font-bold text-ink" : "text-ink-muted",
													].join(" ")}
												>
													{line}
												</span>
											);
										})}
									</div>
								)}
							</div>
						</div>
					)}
			</div>

			{school._placeId && (
				<div className="mt-auto shrink-0 border-t border-line px-5 pb-5 pt-4">
					<EnrollButton
						placeId={school._placeId}
						autoOpen={deepLinkPlaceId === school._placeId}
						schoolName={school.name}
						schoolAddress={[school.address, school.city, school.zip]
							.filter(Boolean)
							.join(", ")}
					/>
				</div>
			)}
		</div>
	);
}
