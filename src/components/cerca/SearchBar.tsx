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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("cerca.searchPlaceholder")}
        className="w-full rounded-xl border border-line bg-bg-raised px-4 py-3 ps-4 pe-20 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring] transition-colors"
        aria-label={t("cerca.searchPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <div className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 text-ink-faint transition-colors hover:text-ink"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <div className="p-2 text-ink-faint border-s border-line ml-1">
          <Search size={16} />
        </div>
      </div>
    </div>
  );
}
