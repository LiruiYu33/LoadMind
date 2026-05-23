import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (we'll use custom ones below anyway)
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
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

export type RouteStopPoint = {
  lat: number;
  lng: number;
  label: string;
  order: number;
};

const stopIcon = (order: number) => {
  const html = `
    <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#69ff87;color:#0a0a0a;font:600 12px/1 system-ui;box-shadow:0 0 0 4px #69ff8733,0 0 16px #69ff8788;">
      ${order}
    </div>`;
  return L.divIcon({
    html,
    className: "loadmind-stop-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

export function FleetMap({
  trucks,
  onSelect,
  height = "100%",
  routeFromIdle,
  stops,
  routePath,
  fitToBounds,
}: {
  trucks: TruckPoint[];
  onSelect?: (t: TruckPoint) => void;
  height?: string;
  routeFromIdle?: { from: [number, number]; to: [number, number] } | null;
  stops?: RouteStopPoint[];
  routePath?: [number, number][];
  fitToBounds?: boolean;
}) {
  const all: [number, number][] = [
    ...trucks.map((t) => [t.lat, t.lng] as [number, number]),
    ...(stops ?? []).map((s) => [s.lat, s.lng] as [number, number]),
  ];
  const center: [number, number] =
    all.length > 0
      ? [
          all.reduce((s, p) => s + p[0], 0) / all.length,
          all.reduce((s, p) => s + p[1], 0) / all.length,
        ]
      : [-37.5, 144.5];

  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={fitToBounds && all.length > 1 ? 5 : 6}
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
        {(stops ?? []).map((s) => (
          <Marker key={`stop-${s.order}`} position={[s.lat, s.lng]} icon={stopIcon(s.order)}>
            <Popup className="loadmind-popup">
              <div className="font-display text-xs font-semibold">Stop {s.order}</div>
              <div className="text-[11px] opacity-70">{s.label}</div>
            </Popup>
          </Marker>
        ))}
        {routePath && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: "#69ff87", weight: 3, opacity: 0.9 }}
          />
        )}
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