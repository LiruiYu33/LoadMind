import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Coordinates, AUSTRALIA_CENTER, geocodeLocation } from "@/lib/geo";

const routePointIcon = (label: string) =>
  L.divIcon({
    className: "loadmind-route-point",
    iconAnchor: [9, 9],
    iconSize: [18, 18],
    html: `<div class="loadmind-route-dot"><span>${label}</span></div>`,
  });

const pickupIcon = routePointIcon("P");
const deliveryIcon = routePointIcon("D");

export function LoadRouteMap({
  origin,
  destination,
  height = 180,
}: {
  origin: string;
  destination: string;
  height?: number;
}) {
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [delivery, setDelivery] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPickup(null);
    setDelivery(null);

    Promise.all([geocodeLocation(origin), geocodeLocation(destination)])
      .then(([nextPickup, nextDelivery]) => {
        if (cancelled) return;
        setPickup(nextPickup);
        setDelivery(nextDelivery);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  const center = useMemo<[number, number]>(() => {
    if (pickup && delivery) return [(pickup.lat + delivery.lat) / 2, (pickup.lng + delivery.lng) / 2];
    if (pickup) return [pickup.lat, pickup.lng];
    if (delivery) return [delivery.lat, delivery.lng];
    return [AUSTRALIA_CENTER.lat, AUSTRALIA_CENTER.lng];
  }, [pickup, delivery]);

  const hasRoute = pickup && delivery;

  return (
    <div className="overflow-hidden rounded-md surface-3 relative" style={{ height }}>
      <MapContainer
        center={center}
        zoom={hasRoute ? 6 : 4}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup && <Marker icon={pickupIcon} position={[pickup.lat, pickup.lng]} />}
        {delivery && <Marker icon={deliveryIcon} position={[delivery.lat, delivery.lng]} />}
        {pickup && delivery && (
          <Polyline
            positions={[
              [pickup.lat, pickup.lng],
              [delivery.lat, delivery.lng],
            ]}
            pathOptions={{ color: "#1fa34a", weight: 3, opacity: 0.85 }}
          />
        )}
        <FitRoute pickup={pickup} delivery={delivery} />
      </MapContainer>

      <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
        <span className="text-action-deep">P</span> {origin}
        <span className="mx-1.5 text-muted-foreground">→</span>
        <span className="text-action-deep">D</span> {destination}
      </div>

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-background/45 text-xs text-muted-foreground">
          Loading map...
        </div>
      )}

      {!loading && !hasRoute && (
        <div className="absolute bottom-3 left-3 right-3 rounded-md bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          Map location unavailable for this lane.
        </div>
      )}
    </div>
  );
}

function FitRoute({
  pickup,
  delivery,
}: {
  pickup: Coordinates | null;
  delivery: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (pickup && delivery) {
        map.fitBounds(
          [
            [pickup.lat, pickup.lng],
            [delivery.lat, delivery.lng],
          ],
          { padding: [28, 28], maxZoom: 9 },
        );
      } else if (pickup || delivery) {
        const point = pickup ?? delivery!;
        map.setView([point.lat, point.lng], 8);
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [map, pickup, delivery]);

  return null;
}
