import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <Search
        size={16}
        className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-faint"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("cerca.searchPlaceholder")}
        className="w-full rounded-xl border border-line bg-bg-raised px-4 py-3 ps-9 pe-10 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring] transition-colors"
        aria-label={t("cerca.searchPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
