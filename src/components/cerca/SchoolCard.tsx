import { BadgeCheck, Phone, X, Zap } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";

interface PhoneModalProps {
	phone: string;
	schoolName: string;
	onClose: () => void;
}

function PhoneModal({ phone, schoolName, onClose }: PhoneModalProps) {
	const { t } = useTranslation();

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
			onClick={onClose}
		>
			<div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
			<div
				className="relative z-10 w-full max-w-sm rounded-2xl bg-bg-raised p-6 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute end-4 top-4 text-ink-faint transition-colors hover:text-ink"
					aria-label={t("cerca.card.closeModal")}
				>
					<X size={20} />
				</button>
				<p className="mb-1 font-sans text-xs font-medium uppercase tracking-widest text-ink-faint">
					{schoolName}
				</p>
				<p className="mb-6 font-sans text-3xl font-bold tracking-tight text-ink">
					{phone}
				</p>
				<a
					href={`tel:${phone}`}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-sans text-base font-semibold text-white shadow-cta transition-colors hover:bg-brand-hover"
				>
					<Phone size={18} />
					{t("cerca.card.callNow")}
				</a>
			</div>
		</div>
	);
}

interface SchoolCardProps {
	school: NormalizedSchool;
	isSelected: boolean;
	onClick: () => void;
}

export function SchoolCard({ school, isSelected, onClick }: SchoolCardProps) {
	const { t } = useTranslation();
	const [showPhone, setShowPhone] = useState(false);
	const isVerified = school.partner === true;

	let cardClass =
		"relative flex w-full flex-col rounded-xl border text-left shadow-sm transition-all overflow-hidden";

	if (isVerified) {
		cardClass += " p-5 min-h-[8rem]";
		if (!isSelected) {
			cardClass +=
				" border-emerald-400 bg-gradient-to-br from-white to-emerald-50 shadow-[0_0_0_1px_theme(colors.emerald.300)] hover:shadow-md";
		} else {
			cardClass += " border-emerald-500 bg-emerald-50 shadow-md";
		}
	} else {
		cardClass += " p-4 min-h-[5.5rem]";
		if (isSelected) {
			cardClass += " border-brand bg-brand-soft shadow-md";
		} else {
			cardClass +=
				" border-line bg-bg-raised hover:border-line-strong hover:shadow-md";
		}
	}

	return (
		<>
			<button type="button" onClick={onClick} className={cardClass}>
				{/* Verified: green top accent bar */}
				{isVerified && (
					<span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300" />
				)}

				{/* Top: name + address + badges */}
				<div className="flex-1 overflow-hidden">
					<div className="flex items-start gap-2">
						{/* Left: name + address + rating */}
						<div className="min-w-0 flex-1">
							<p className="font-sans text-sm font-semibold leading-snug text-ink line-clamp-1">
								{school.name}
							</p>
							<p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted line-clamp-1">
								{[school.city, school.zip, school.region]
									.filter(Boolean)
									.join(", ")}
							</p>
							{isVerified && school.rating != null && (
								<p className="mt-0.5 flex items-center gap-1 font-sans text-xs text-ink-muted">
									<span className="text-amber-400">★</span>
									<span className="font-semibold text-ink">
										{school.rating.toFixed(1)}
									</span>
									{school.userRatingCount != null && (
										<span className="text-ink-faint">
											({school.userRatingCount})
										</span>
									)}
								</p>
							)}
						</div>

						{/* Right: badges stacked */}
						{isVerified && (
							<div className="flex shrink-0 flex-col items-end gap-1">
								<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-emerald-700">
									{t("cerca.detail.partnerVerified")}
								</span>
								{school.enrollment_enabled && (
									<span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-amber-700">
										{t("cerca.card.enrollBadge")}
									</span>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Bottom: verified / enrolment indicators */}
				{isVerified && (
					<div className="mt-3 flex items-center justify-end">
						<div className="flex items-center gap-1">
							{school.enrollment_enabled && (
								<Zap
									size={15}
									className="fill-amber-400 text-amber-400"
									strokeWidth={0}
								/>
							)}
							<BadgeCheck
								className="h-5 w-5 text-emerald-600 drop-shadow-sm"
								strokeWidth={3}
							/>
						</div>
					</div>
				)}
			</button>

			{showPhone &&
				createPortal(
					<PhoneModal
						phone={school.phone}
						schoolName={school.name}
						onClose={() => setShowPhone(false)}
					/>,
					document.body,
				)}
		</>
	);
}
