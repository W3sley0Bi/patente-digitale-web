import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { CircleMarker as LCircleMarker, LatLngBoundsExpression } from "leaflet";
import type { NormalizedSchool } from "@/lib/geojson";

const ITALY_CENTER: [number, number] = [41.87, 12.57];
const ITALY_ZOOM = 8;

// Brand colours as hex (Leaflet can't use OKLCH/CSS vars)
const COLOR_DEFAULT = "#94a3b8"; // Slate 400 (Grey)
const COLOR_SELECTED = "#334155"; // Slate 700 (Darker Grey for selected)
const COLOR_VERIFIED = "#10b981"; // Emerald 500 (Greenish)
const COLOR_VERIFIED_SELECTED = "#059669"; // Emerald 600 (Darker Green for selected)

function FitBounds({ schools, filterKey }: { schools: NormalizedSchool[], filterKey: string }) {
  const map = useMap();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (schools.length === 0 || lastKey.current === filterKey) return;
    lastKey.current = filterKey;
    const bounds: LatLngBoundsExpression = schools.map((s) => s.latlng);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: filterKey ? 13 : 9 });
  }, [schools, filterKey, map]);

  return null;
}

function PanToSelected({ selected }: { selected: NormalizedSchool | null }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!selected || selected.id === prevId.current) return;
    prevId.current = selected.id;
    map.setView(selected.latlng, Math.max(map.getZoom(), 14), { animate: true });
  }, [selected, map]);

  return null;
}

interface SchoolMarkerProps {
  school: NormalizedSchool;
  isSelected: boolean;
  onSelect: (school: NormalizedSchool) => void;
}

function SchoolMarker({ school, isSelected, onSelect }: SchoolMarkerProps) {
  const markerRef = useRef<LCircleMarker | null>(null);
  const isVerified = school.partner === true;

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const fillColor = isVerified
    ? (isSelected ? COLOR_VERIFIED_SELECTED : COLOR_VERIFIED)
    : (isSelected ? COLOR_SELECTED : COLOR_DEFAULT);

  return (
    <CircleMarker
      ref={markerRef}
      center={school.latlng}
      radius={isVerified ? (isSelected ? 10 : 8) : (isSelected ? 7 : 4.5)}
      pathOptions={{
        color: "white",
        fillColor,
        fillOpacity: 1,
        weight: isVerified ? 3 : 1.5,
      }}
      eventHandlers={{ click: () => onSelect(school) }}
    >
      <Popup closeButton={false} offset={[0, -5]} autoPan={false}>
        <div className="flex flex-col gap-1">
          <span className="font-bold text-ink text-sm leading-tight">{school.name}</span>
          <span className="text-ink-muted text-xs leading-snug">
            {[school.address, school.city].filter(Boolean).join(", ")}
          </span>
        </div>
      </Popup>
    </CircleMarker>
  );
}

interface SchoolMapProps {
  schools: NormalizedSchool[];
  filterKey: string;
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
}

export function SchoolMap({ schools, filterKey, selected, onSelect }: SchoolMapProps) {
  const sortedSchools = [...schools].sort((a, b) => {
    const aV = a.partner === true ? 1 : 0;
    const bV = b.partner === true ? 1 : 0;
    // Verified schools last so they are drawn on top
    return aV - bV;
  });

  return (
    <div className="h-full w-full relative overflow-hidden isolate">
      {/* Custom CSS to clean up Leaflet UI and refine map feel */}
      <style>{`
        .leaflet-container {
          background: #f8f9fa !important;
          font-family: Satoshi, sans-serif !important;
        }
        .leaflet-bar {
          border: 1px solid oklch(0.92 0.008 160) !important;
          box-shadow: 0 4px 12px oklch(0.55 0.05 160 / 0.08) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-top: 20px !important;
          margin-right: 20px !important;
        }
        .leaflet-bar a {
          background-color: white !important;
          color: oklch(0.22 0.015 160) !important;
          border: none !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
        }
        .leaflet-bar a:hover {
          background-color: oklch(0.985 0.005 160) !important;
          color: oklch(0.62 0.16 152) !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 4px !important;
          box-shadow: 0 10px 25px -5px oklch(0.55 0.05 160 / 0.15) !important;
          border: 1px solid oklch(0.92 0.008 160);
        }
        .leaflet-popup-tip {
          box-shadow: 0 10px 25px -5px oklch(0.55 0.05 160 / 0.15) !important;
          border: 1px solid oklch(0.92 0.008 160);
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
          font-family: Satoshi, sans-serif !important;
          line-height: 1.4 !important;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(4px);
          font-size: 9px !important;
          border-top-left-radius: 4px;
        }
      `}</style>
      
      <MapContainer
        center={ITALY_CENTER}
        zoom={ITALY_ZOOM}
        className="h-full w-full z-0"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <ZoomControl position="topright" />
        <FitBounds schools={schools} filterKey={filterKey} />
        <PanToSelected selected={selected} />
        {sortedSchools.map((school) => (
          <SchoolMarker
            key={school.id}
            school={school}
            isSelected={selected?.id === school.id}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
    </div>
  );
}
