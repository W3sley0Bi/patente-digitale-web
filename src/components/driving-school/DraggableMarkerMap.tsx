import "leaflet/dist/leaflet.css";
import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite doesn't bundle Leaflet's default icon URLs automatically
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const ITALY_CENTER: [number, number] = [41.87, 12.57];

interface Props {
  position: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 14, { duration: 0.8 });
  }, [position, map]);
  return null;
}

export function DraggableMarkerMap({ position, onChange }: Props) {
  const { t } = useTranslation();
  const markerRef = useRef<L.Marker>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-xl overflow-hidden border border-ink/10 shadow-sm" style={{ height: 240 }}>
        <style>{`
          .leaflet-container { background: #f8f9fa !important; font-family: Satoshi, sans-serif !important; }
          .leaflet-bar {
            border: 1px solid oklch(0.92 0.008 160) !important;
            box-shadow: 0 4px 12px oklch(0.55 0.05 160 / 0.08) !important;
            border-radius: 12px !important;
            overflow: hidden;
            margin-top: 12px !important;
            margin-right: 12px !important;
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
          .leaflet-control-attribution {
            background: rgba(255,255,255,0.7) !important;
            backdrop-filter: blur(4px);
            font-size: 9px !important;
            border-top-left-radius: 4px;
          }
        `}</style>
        <MapContainer
          center={position ?? ITALY_CENTER}
          zoom={position ? 14 : 6}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <ZoomControl position="topright" />
          <ClickHandler onClick={onChange} />
          <FlyTo position={position} />
          {position && (
            <Marker
              position={position}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend: () => {
                  const pos = markerRef.current?.getLatLng();
                  if (pos) onChange(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-ink-faint">
        {position
          ? t("school.claimForm.mapCoords", {
              lat: position[0].toFixed(5),
              lng: position[1].toFixed(5),
            })
          : t("school.claimForm.mapHint")}
      </p>
    </div>
  );
}
