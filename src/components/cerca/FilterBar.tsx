import { ChevronDown, Locate, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { REGIONS } from "@/lib/italyGeo";

interface FilterBarProps {
  city: string;
  region: string;
  zip: string;
  cityOptions: string[];
  onCityChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onZipChange: (v: string) => void;
  onClear: () => void;
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`;
  const res = await fetch(url, { headers: { "User-Agent": "patentedigitale.it/1.0" } });
  if (!res.ok) throw new Error("geocode failed");
  const data = await res.json();
  return (
    data.address?.city ??
    data.address?.town ??
    data.address?.municipality ??
    data.address?.village ??
    ""
  );
}

export function FilterBar({
  city, region, zip, cityOptions,
  onCityChange, onRegionChange, onZipChange, onClear,
}: FilterBarProps) {
  const { t } = useTranslation();
  const cityListId = useId();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const hasFilters = city || region || zip;

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const found = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
          if (found) {
            onCityChange(found);
            cityInputRef.current?.focus();
          }
        } catch {
          setLocError(true);
        } finally {
          setLocating(false);
        }
      },
      () => { setLocating(false); setLocError(true); },
      { timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: location + city + region */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Location button */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-bg-raised px-3 py-2.5 font-sans text-sm font-medium text-ink-muted shadow-sm transition-all hover:border-line-strong hover:text-ink disabled:opacity-60"
          title={locError ? t("cerca.filters.locationError") : t("cerca.filters.locationBtn")}
        >
          {locating
            ? <Loader2 size={15} className="animate-spin text-brand" />
            : <Locate size={15} className={locError ? "text-accent" : "text-brand"} />
          }
          <span className="hidden sm:inline">{t("cerca.filters.locationBtn")}</span>
        </button>

        {/* City autocomplete */}
        <div className="relative flex-1">
          <input
            ref={cityInputRef}
            type="text"
            list={cityListId}
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder={t("cerca.filters.cityPlaceholder")}
            className="w-full rounded-xl border border-line bg-bg-raised px-4 py-2.5 pe-8 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
            autoComplete="off"
          />
          <datalist id={cityListId}>
            {cityOptions.map((c) => <option key={c} value={c} />)}
          </datalist>
          {city && (
            <button
              type="button"
              onClick={() => onCityChange("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ZIP input */}
        <div className="relative shrink-0 sm:w-32">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            value={zip}
            onChange={(e) => onZipChange(e.target.value.replace(/\D/g, ""))}
            placeholder={t("cerca.filters.zipPlaceholder")}
            className="w-full rounded-xl border border-line bg-bg-raised px-4 py-2.5 pe-8 font-sans text-sm text-ink placeholder:text-ink-faint shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
            autoComplete="off"
          />
          {zip && (
            <button
              type="button"
              onClick={() => onZipChange("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Region select */}
        <div className="relative shrink-0 sm:w-48">
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-line bg-bg-raised px-4 py-2.5 pe-8 font-sans text-sm text-ink shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-[--color-focus-ring]"
          >
            <option value="">{t("cerca.filters.regionPlaceholder")}</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        </div>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="self-start font-sans text-xs text-ink-faint underline-offset-2 hover:text-accent hover:underline transition-colors"
        >
          {t("cerca.filters.clearAll")}
        </button>
      )}
    </div>
  );
}
