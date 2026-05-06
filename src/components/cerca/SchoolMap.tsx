import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { NormalizedSchool } from "@/lib/geojson";

const ITALY_CENTER: [number, number] = [41.87, 12.57];
const ITALY_ZOOM = 6;

// Brand colours as hex (Leaflet can't use OKLCH/CSS vars)
const COLOR_DEFAULT = "#2a9e6a";
const COLOR_SELECTED = "#e85d26";

function FitBounds({ schools, filterKey }: { schools: NormalizedSchool[], filterKey: string }) {
  const map = useMap();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (schools.length === 0 || lastKey.current === filterKey) return;
    lastKey.current = filterKey;
    const bounds: LatLngBoundsExpression = schools.map((s) => s.latlng);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: filterKey ? 13 : 7 });
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

interface SchoolMapProps {
  schools: NormalizedSchool[];
  filterKey: string;
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
}

export function SchoolMap({ schools, filterKey, selected, onSelect }: SchoolMapProps) {
  return (
    <MapContainer
      center={ITALY_CENTER}
      zoom={ITALY_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds schools={schools} filterKey={filterKey} />
      <PanToSelected selected={selected} />
      {schools.map((school) => {
        const isSelected = selected?.id === school.id;
        return (
          <CircleMarker
            key={school.id}
            center={school.latlng}
            radius={isSelected ? 9 : 6}
            pathOptions={{
              color: isSelected ? COLOR_SELECTED : COLOR_DEFAULT,
              fillColor: isSelected ? COLOR_SELECTED : COLOR_DEFAULT,
              fillOpacity: isSelected ? 1 : 0.75,
              weight: isSelected ? 2.5 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(school) }}
          >
            <Popup>
              <strong>{school.name}</strong>
              {[school.address, school.city].filter(Boolean).length > 0 && (
                <>
                  <br />
                  {[school.address, school.city].filter(Boolean).join(", ")}
                  {school.zip && <> — {school.zip}</>}
                </>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
