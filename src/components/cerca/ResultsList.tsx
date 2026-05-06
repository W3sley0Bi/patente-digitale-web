import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import type { NormalizedSchool } from "@/lib/geojson";
import { SchoolCard } from "./SchoolCard";

interface ResultsListProps {
  schools: NormalizedSchool[];
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
  loading: boolean;
  error: string | null;
}

export function ResultsList({
  schools,
  selected,
  onSelect,
  loading,
  error,
}: ResultsListProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: schools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg/50">
        {t("cerca.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        {t("cerca.error")}
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg/50">
        {t("cerca.noResults")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <p className="px-1 pb-2 text-xs text-fg/40">
        {t("cerca.resultsCount", { count: schools.length })}
      </p>
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const school = schools[virtualItem.index];
            return (
              <div
                key={school.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                  padding: "4px 0",
                }}
              >
                <SchoolCard
                  school={school}
                  isSelected={selected?.id === school.id}
                  onClick={() => onSelect(school)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
