import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    postcode?: string;
    state?: string;
    countrycode?: string;
  };
  geometry: { coordinates: [number, number] };
}

export interface AddressResult {
  address: string;
  city: string;
  zip: string;
  region: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
}

function featureLabel(f: PhotonFeature): string {
  const p = f.properties;
  const street = p.street ?? p.name ?? "";
  const streetNum = p.housenumber ? `${street} ${p.housenumber}` : street;
  return [streetNum, p.city, p.postcode, p.state].filter(Boolean).join(", ");
}

export function AddressAutocomplete({ value, onChange, onSelect }: Props) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const search = (q: string) => {
    clearTimeout(timer.current);
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=it&bbox=6.75,36.62,18.48,47.09`
        );
        const data = await res.json();
        const features: PhotonFeature[] = (data.features ?? []).filter(
          (f: PhotonFeature) => f.properties.countrycode === "IT"
        );
        setSuggestions(features);
        setOpen(features.length > 0);
      } catch (e) {
        console.warn("[address-autocomplete] fetch failed", e);
      }
    }, 350);
  };

  const pick = (f: PhotonFeature) => {
    const p = f.properties;
    const street = p.street ?? p.name ?? "";
    const address = p.housenumber ? `${street} ${p.housenumber}` : street;
    onChange(address);
    onSelect({
      address,
      city: p.city ?? "",
      zip: p.postcode ?? "",
      region: p.state ?? "",
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); search(e.target.value); }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
          else if (value.length >= 3) search(value);
        }}
        placeholder={t("school.claimForm.addressPlaceholder")}
        autoComplete="off"
        className="border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-ink/20 transition w-full"
      />
      {open && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-ink/10 rounded-lg shadow-lg overflow-hidden text-sm">
          {suggestions.map((f, i) => (
            <li
              key={i}
              onMouseDown={() => pick(f)}
              className="px-3 py-2 cursor-pointer hover:bg-surface-muted text-ink leading-snug"
            >
              {featureLabel(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
