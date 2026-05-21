import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (we'll use custom ones below anyway)
const defaultIconPrototype = L.Icon.Default.prototype as L.Icon.Default & {
  _getIconUrl?: unknown;
};
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type TruckPoint = {
  id: string;
  unit_id: string;
  lat: number;
  lng: number;
  status: string;
  location: string;
};

const truckIcon = (status: string) => {
  const color =
    status === "active" ? "#69ff87" :
    status === "delayed" ? "#ba1a1a" :
    "#6f84ac";
  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33,0 0 16px ${color}88;"></div>
    </div>`;
  return L.divIcon({
    html,
    className: "loadmind-truck-icon",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

export function FleetMap({
  trucks,
  onSelect,
  height = "100%",
  routeFromIdle,
}: {
  trucks: TruckPoint[];
  onSelect?: (t: TruckPoint) => void;
  height?: string;
  routeFromIdle?: { from: [number, number]; to: [number, number] } | null;
}) {
  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden">
      <MapContainer
        center={[-37.5, 144.5]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {trucks.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat, t.lng]}
            icon={truckIcon(t.status)}
            eventHandlers={{ click: () => onSelect?.(t) }}
          >
            <Popup className="loadmind-popup">
              <div className="font-display text-xs font-semibold">{t.unit_id}</div>
              <div className="text-[11px] opacity-70">{t.location} · {t.status}</div>
            </Popup>
          </Marker>
        ))}
        {routeFromIdle && (
          <Polyline
            positions={[routeFromIdle.from, routeFromIdle.to]}
            pathOptions={{ color: "#69ff87", weight: 3, dashArray: "6 6", opacity: 0.85 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
