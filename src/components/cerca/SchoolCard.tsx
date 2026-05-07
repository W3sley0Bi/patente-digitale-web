import { Globe, Phone, X } from "lucide-react";
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
  const isPartner = school.partner === true;

  let cardClass = "relative flex min-h-[6.75rem] w-full flex-col rounded-xl border p-4 text-left shadow-sm transition-all overflow-hidden";
  if (isPartner && !isSelected) {
    cardClass += " border-amber-400 bg-gradient-to-br from-white to-amber-50 shadow-[0_0_0_1px_theme(colors.amber.300)] hover:shadow-md";
  } else if (isSelected) {
    cardClass += isPartner
      ? " border-amber-500 bg-amber-50 shadow-md"
      : " border-brand bg-brand-soft shadow-md";
  } else {
    cardClass += " border-line bg-bg-raised hover:border-line-strong hover:shadow-md";
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cardClass}
      >
        {/* Partner: gold top accent bar */}
        {isPartner && (
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300" />
        )}

        {/* Top: name + address + region */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <p className="font-sans text-sm font-semibold leading-snug text-ink line-clamp-1">
              {school.name}
            </p>
            {isPartner && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Partner
              </span>
            )}
          </div>
          <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted line-clamp-1">
            {[school.city, school.zip, school.region].filter(Boolean).join(", ")}
          </p>
          {school.rating != null && (
            <p className="mt-0.5 flex items-center gap-1 font-sans text-xs text-ink-muted">
              <span className="text-amber-400">★</span>
              <span className="font-semibold text-ink">{school.rating.toFixed(1)}</span>
              {school.userRatingCount != null && (
                <span className="text-ink-faint">({school.userRatingCount})</span>
              )}
            </p>
          )}
        </div>

        {/* Bottom: action links — always present to anchor card height */}
        <div className="mt-2 flex min-h-[1.25rem] flex-wrap gap-3">
          {school.phone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPhone(true);
              }}
              className="flex items-center gap-1 font-sans text-xs text-brand transition-colors hover:text-brand-hover"
            >
              <Phone size={12} />
              {t("cerca.card.callLabel")}
            </button>
          )}
          {school.website && (
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 font-sans text-xs text-brand transition-colors hover:text-brand-hover"
            >
              <Globe size={12} />
              {t("cerca.card.websiteLabel")}
            </a>
          )}
        </div>

        {/* Partner: verified badge — bottom-right */}
        {isPartner && (
          <img
            src="/verified-autoscuola.png"
            alt="Autoscuola verificata"
            className="absolute bottom-2 right-2 h-7 w-7 object-contain drop-shadow-sm"
            draggable={false}
          />
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
