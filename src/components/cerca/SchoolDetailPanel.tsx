import { X, MapPin, Phone, Globe, ExternalLink, Clock, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";
import verifiedBadge from "@/assets/verified-autoscuola.png";

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
            <img
              src={verifiedBadge}
              alt="Autoscuola verificata"
              className="h-5 w-5 object-contain"
              draggable={false}
            />
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
        {/* Rating */}
        {school.rating != null && (
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
            <span className="font-sans text-sm text-ink-muted leading-snug">
              {[school.address, school.city, school.zip].filter(Boolean).join(", ")}
            </span>
          </InfoRow>
        )}

        {school.phone && (
          <InfoRow icon={<Phone size={14} className="shrink-0 text-brand" />}>
            <a
              href={`tel:${school.phone}`}
              className="font-sans text-sm font-medium text-brand transition-colors hover:text-brand-hover"
            >
              {school.phone}
            </a>
          </InfoRow>
        )}

        {school.website && (
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

        {/* Opening hours */}
        {school.openingHours && school.openingHours.length > 0 && (
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

        {/* Licenses */}
        {school.licenses && school.licenses.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-faint">
              {t("cerca.detail.licensesTitle")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {school.licenses.map((license) => (
                <span
                  key={license}
                  className="rounded-md bg-line px-2 py-0.5 font-sans text-[11px] font-bold text-ink-muted"
                >
                  {license.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Prices */}
        {(school.prices || school.licenses) && (
          <div className="flex flex-col gap-2">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-ink-faint">
              {t("cerca.detail.pricesTitle")}
            </h3>
            {school.prices ? (
              <div className="flex flex-col gap-1.5">
                {Object.entries(school.prices).map(([license, price]) => (
                  <div key={license} className="flex items-center justify-between gap-2 border-b border-line pb-1.5 last:border-0 last:pb-0">
                    <span className="font-sans text-sm font-medium text-ink-muted">{license.replace("_", " ")}</span>
                    <span className="font-sans text-sm font-bold text-brand">{price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-xs italic text-ink-faint">
                {t("cerca.detail.noPrices")}
              </p>
            )}
          </div>
        )}

        {/* Google Maps link */}
        {school.googleMapsUri && (
          <a
            href={school.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-sans text-xs text-ink-faint transition-colors hover:text-brand"
          >
            <ExternalLink size={11} />
            Apri su Google Maps
          </a>
        )}
      </div>

      {/* Partner CTA */}
      {isVerified && (
        <div className="mt-auto shrink-0 px-5 pb-5">
          <div className="border-t border-emerald-200 pt-4">
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-sans text-sm font-bold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-300 active:scale-95"
            >
              {t("cerca.detail.enroll")}
            </button>
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
