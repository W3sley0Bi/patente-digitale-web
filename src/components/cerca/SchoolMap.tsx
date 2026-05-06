import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { NormalizedSchool } from "@/lib/geojson";

const ITALY_CENTER: [number, number] = [41.87, 12.57];
const ITALY_ZOOM = 6;

interface FitBoundsProps {
  schools: NormalizedSchool[];
}

function FitBounds({ schools }: FitBoundsProps) {
  const map = useMap();
  const prevCount = useRef(schools.length);

  useEffect(() => {
    if (schools.length === 0) return;
    if (schools.length === prevCount.current && schools.length > 50) return;
    prevCount.current = schools.length;

    const bounds: LatLngBoundsExpression = schools.map((s) => s.latlng);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [schools, map]);

  return null;
}

interface PanToSelectedProps {
  selected: NormalizedSchool | null;
}

function PanToSelected({ selected }: PanToSelectedProps) {
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
  selected: NormalizedSchool | null;
  onSelect: (school: NormalizedSchool) => void;
}

export function SchoolMap({ schools, selected, onSelect }: SchoolMapProps) {
  return (
    <MapContainer
      center={ITALY_CENTER}
      zoom={ITALY_ZOOM}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds schools={schools} />
      <PanToSelected selected={selected} />
      {schools.map((school) => (
        <CircleMarker
          key={school.id}
          center={school.latlng}
          radius={selected?.id === school.id ? 9 : 6}
          pathOptions={{
            color: selected?.id === school.id ? "#f97316" : "#2563eb",
            fillColor: selected?.id === school.id ? "#f97316" : "#3b82f6",
            fillOpacity: 0.85,
            weight: 2,
          }}
          eventHandlers={{ click: () => onSelect(school) }}
        >
          <Popup>
            <strong>{school.name}</strong>
            <br />
            {[school.address, school.city].filter(Boolean).join(", ")}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
