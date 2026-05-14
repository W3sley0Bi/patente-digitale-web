import {
  X,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { NormalizedSchool } from "@/lib/geojson";
import { buildIscrizioneUrl } from "@/lib/buildIscrizioneUrl";

interface SchoolDetailPanelProps {
  school: NormalizedSchool | null;
  onClose: () => void;
}

export function SchoolDetailPanel({ school, onClose }: SchoolDetailPanelProps) {
  const { t } = useTranslation();
  const isVerified = school?.partner === true;
  const visible = school !== null;

  return (
    <>
      {/* Desktop: slides in from left over the map */}
      <div
        className={[
          "absolute left-0 top-0 z-[1000] hidden h-full w-72 flex-col bg-bg-raised shadow-2xl transition-transform duration-300 ease-out md:flex",
          visible ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {school && <PanelContent school={school} isVerified={isVerified} onClose={onClose} t={t} />}
      </div>

      {/* Mobile: slides up from bottom */}
      <div
        className={[
          "fixed inset-x-0 bottom-0 z-[2000] flex flex-col rounded-t-2xl bg-bg-raised shadow-2xl transition-transform duration-300 ease-out md:hidden",
          visible ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ maxHeight: "60vh" }}
      >
        {school && <PanelContent school={school} isVerified={isVerified} onClose={onClose} t={t} />}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function PanelContent({ school, isVerified, onClose, t }: PanelContentProps) {
  const [hoursExpanded, setHoursExpanded] = useState(false);

  // Get current day of week (0-6, Sunday-Saturday)
  // Our data uses: Lunedì, Martedì, Mercoledì, Giovedì, Venerdì, Sabato, Domenica
  // OR: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  const todayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  
  // Map JS getDay() to our typical data order (Monday-indexed for Italy usually)
  // If data starts with Lunedì/Monday, index 1 is Monday.
  const mappedIndex = todayIndex === 0 ? 6 : todayIndex - 1;

  const getTodayHours = () => {
    if (!school.openingHours) return null;
    // Basic heuristic: check if line starts with today's day name in IT or EN
    const dayNames = [
      ["Lunedì", "Monday"],
      ["Martedì", "Tuesday"],
      ["Mercoledì", "Wednesday"],
      ["Giovedì", "Thursday"],
      ["Venerdì", "Friday"],
      ["Sabato", "Saturday"],
      ["Domenica", "Sunday"]
    ];
    
    const [it, en] = dayNames[mappedIndex];
    return school.openingHours.find(h => h.startsWith(it) || h.startsWith(en)) || school.openingHours[mappedIndex];
  };

  const todayHours = getTodayHours();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Verified green top bar */}
      {isVerified && (
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300" />
      )}

      {/* Header */}
      <div className={["relative shrink-0 px-5 pt-5 pb-4", isVerified ? "bg-gradient-to-b from-emerald-50 to-transparent" : ""].join(" ")}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink"
          aria-label={t("cerca.card.closeModal")}
        >
          <X size={16} />
        </button>

        {isVerified && (
          <div className="mb-2 flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-emerald-600" strokeWidth={3} />
            <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-emerald-600">
              {t("cerca.detail.partnerVerified")}
            </span>
          </div>
        )}

        <h2 className="pe-8 font-sans text-base font-black leading-snug text-ink">
          {school.name}
        </h2>
      </div>

      {/* Divider */}
      <div className="mx-5 shrink-0 border-t border-line" />

      {/* Info rows */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {/* Rating — verified only */}
        {isVerified && school.rating != null && (
          <div className="flex items-center gap-1.5">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="font-sans text-sm font-bold text-ink">{school.rating.toFixed(1)}</span>
            {school.userRatingCount != null && (
              <span className="font-sans text-xs text-ink-faint">({school.userRatingCount} recensioni)</span>
            )}
          </div>
        )}

        {/* Business status — only show if not operational */}
        {school.businessStatus && school.businessStatus !== "OPERATIONAL" && (
          <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 font-sans text-xs font-semibold text-accent">
            {school.businessStatus === "CLOSED_TEMPORARILY" ? "Temporaneamente chiusa" : "Chiusa definitivamente"}
          </span>
        )}

        {(school.address || school.city) && (
          <InfoRow icon={<MapPin size={14} className="mt-0.5 shrink-0 text-ink-faint" />}>
            {isVerified && school.googleMapsUri ? (
              <a
                href={school.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm text-brand leading-snug hover:text-brand-hover inline-flex items-start gap-1"
              >
                <span>{[school.address, school.city, school.zip].filter(Boolean).join(", ")}</span>
                <ExternalLink size={10} className="mt-0.5 shrink-0 opacity-60" />
              </a>
            ) : (
              <span className="font-sans text-sm text-ink-muted leading-snug">
                {[school.address, school.city, school.zip].filter(Boolean).join(", ")}
              </span>
            )}
          </InfoRow>
        )}

        {/* Claim CTA — for non-verified schools, right after address */}
        {!isVerified && school._placeId && (
          <div className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/30 px-3 py-2.5">
            <p className="font-sans text-xs text-ink-muted leading-relaxed">
              {t("cerca.detail.claimHint")}
            </p>
            <Link
              to={`/signup/driving-school?placeId=${encodeURIComponent(school._placeId)}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 inline-flex items-center gap-1 font-sans text-xs font-black text-brand hover:text-brand-hover"
            >
              {t("cerca.detail.claimCta")}
              <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* Phone — verified only */}
        {isVerified && school.phone && (
          <InfoRow icon={<Phone size={14} className="shrink-0 text-brand" />}>
            <a
              href={`tel:${school.phone}`}
              className="font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
            >
              {school.phone}
            </a>
          </InfoRow>
        )}

        {/* Website — verified only */}
        {isVerified && school.website && (
          <InfoRow icon={<Globe size={14} className="shrink-0 text-brand" />}>
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
            >
              {new URL(school.website).hostname.replace(/^www\./, "")}
              <ExternalLink size={11} className="opacity-60" />
            </a>
          </InfoRow>
        )}

        {/* Opening hours — verified only */}
        {isVerified && school.openingHours && school.openingHours.length > 0 && (
          <InfoRow icon={<Clock size={14} className="mt-0.5 shrink-0 text-ink-faint" />}>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setHoursExpanded(!hoursExpanded)}
                className="flex items-center gap-1.5 text-left transition-colors hover:text-ink"
              >
                <span className="font-sans text-sm font-bold text-ink">
                  {todayHours || school.openingHours[0]}
                </span>
                {hoursExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                          isToday ? "font-bold text-ink" : "text-ink-muted"
                        ].join(" ")}
                      >
                        {line}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </InfoRow>
        )}
      </div>

      {/* Partner CTA — verified */}
      {isVerified && (
        <div className="mt-auto shrink-0 px-5 pb-5">
          <div className="border-t border-emerald-200 pt-4">
            <Link
              to={buildIscrizioneUrl(school)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-center font-sans text-sm font-bold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-300 active:scale-95"
            >
              {t("cerca.detail.enroll")}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      {icon}
      <div>{children}</div>
    </div>
  );
}
