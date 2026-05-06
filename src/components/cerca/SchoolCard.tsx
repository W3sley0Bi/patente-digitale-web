import { Globe, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";

interface SchoolCardProps {
  school: NormalizedSchool;
  isSelected: boolean;
  onClick: () => void;
}

export function SchoolCard({ school, isSelected, onClick }: SchoolCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border p-4 text-left transition-colors",
        isSelected
          ? "border-brand bg-brand/5 ring-2 ring-brand"
          : "border-border bg-surface hover:bg-surface/80",
      ].join(" ")}
    >
      <p className="font-semibold text-fg line-clamp-1">{school.name}</p>
      <p className="mt-0.5 text-sm text-fg/60">
        {[school.address, school.city, school.zip].filter(Boolean).join(", ")}
      </p>
      {school.region && (
        <p className="mt-0.5 text-xs text-fg/40">{school.region}</p>
      )}
      <div className="mt-2 flex gap-3">
        {school.phone && (
          <a
            href={`tel:${school.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Phone size={12} />
            {t("cerca.card.callLabel")}
          </a>
        )}
        {school.website && (
          <a
            href={school.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Globe size={12} />
            {t("cerca.card.websiteLabel")}
          </a>
        )}
      </div>
    </button>
  );
}
