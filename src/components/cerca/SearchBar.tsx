import { X } from "lucide-react";
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
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("cerca.searchPlaceholder")}
        className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-10 text-base text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-brand"
        aria-label={t("cerca.searchPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
