import { useEffect, useRef } from "react";
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
  /** Mobile stacked mode: renders flat list instead of virtualised panel */
  stacked?: boolean;
}

export function ResultsList({
  schools,
  selected,
  onSelect,
  loading,
  error,
  stacked = false,
}: ResultsListProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: schools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  useEffect(() => {
    if (!selected) return;
    const idx = schools.findIndex((s) => s.id === selected.id);
    if (idx !== -1) virtualizer.scrollToIndex(idx, { align: "center" });
    // idx === -1 means selected school is not in current filtered results — don't scroll
  }, [selected?.id, schools]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center font-sans text-sm text-ink-faint">
        {t("cerca.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center font-sans text-sm text-accent-ink">
        {t("cerca.error")}
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center font-sans text-sm text-ink-faint">
        {t("cerca.noResults")}
      </div>
    );
  }

  if (stacked) {
    const visible = schools.slice(0, 50);
    return (
      <div className="flex flex-col gap-2">
        {visible.map((school) => (
          <SchoolCard
            key={school.id}
            school={school}
            isSelected={selected?.id === school.id}
            onClick={() => onSelect(school)}
          />
        ))}
        {schools.length > 50 && (
          <p className="py-2 text-center font-sans text-xs text-ink-faint">
            {t("cerca.mobileMore", { count: schools.length - 50 })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-3">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const school = schools[virtualItem.index];
          return (
            <div
              key={school.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: "8px",
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
  );
}
