import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Check, Loader2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coordinates,
  MELBOURNE_CENTER,
  geocodeLocation,
  parseCoordinates,
  reverseGeocodeLocation,
} from "@/lib/geo";

const pickerIcon = L.divIcon({
  className: "loadmind-location-pin",
  iconAnchor: [14, 34],
  iconSize: [28, 34],
  html: `
    <div class="loadmind-pin">
      <div class="loadmind-pin-head"></div>
      <div class="loadmind-pin-tip"></div>
    </div>
  `,
});

export function LocationPickerDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (value: string) => void;
}) {
  const [position, setPosition] = useState<Coordinates>(() => parseCoordinates(value) ?? MELBOURNE_CENTER);
  const [resolving, setResolving] = useState(false);
  const [addressPreview, setAddressPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const parsed = parseCoordinates(value);
    if (parsed) {
      setPosition(parsed);
      return;
    }

    if (!value.trim()) {
      setPosition(MELBOURNE_CENTER);
      return;
    }

    let cancelled = false;
    setResolving(true);
    geocodeLocation(value)
      .then((coords) => {
        if (!cancelled && coords) setPosition(coords);
      })
      .finally(() => {
      if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setResolving(true);
    const timer = window.setTimeout(() => {
      reverseGeocodeLocation(position)
        .then((address) => {
          if (!cancelled) setAddressPreview(address);
        })
        .finally(() => {
          if (!cancelled) setResolving(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, position]);

  const markerPosition = useMemo<[number, number]>(() => [position.lat, position.lng], [position]);

  const handleConfirm = async () => {
    setSaving(true);
    const label = addressPreview || (await reverseGeocodeLocation(position));
    setSaving(false);
    onConfirm(label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-2 max-w-2xl p-0 overflow-hidden border-0">
        <div className="p-6 pb-3">
          <DialogHeader>
            <div className="label-eyebrow mb-2">OPENSTREETMAP LOCATION</div>
            <DialogTitle className="font-display text-2xl font-bold">Select Current Location</DialogTitle>
            <DialogDescription>
              Drag the pin or click the map, then confirm the selected position.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="h-[360px] overflow-hidden rounded-md surface-3">
            <MapContainer
              center={markerPosition}
              zoom={12}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <PickerMap position={position} onChange={setPosition} />
              <ResizeMap open={open} position={position} />
            </MapContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label-eyebrow">RESOLVED ADDRESS</div>
              <div className="text-sm font-medium mt-1 max-w-md">
                {resolving ? "Resolving street address..." : addressPreview || "Move the pin to resolve an address."}
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="btn-primary-gradient h-10 px-4 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Location
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PickerMap({
  position,
  onChange,
}: {
  position: Coordinates;
  onChange: (position: Coordinates) => void;
}) {
  useMapEvents({
    click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });

  return (
    <Marker
      draggable
      icon={pickerIcon}
      position={[position.lat, position.lng]}
      eventHandlers={{
        dragend: (event) => {
          const next = event.target.getLatLng();
          onChange({ lat: next.lat, lng: next.lng });
        },
      }}
    />
  );
}

function ResizeMap({ open, position }: { open: boolean; position: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      map.setView([position.lat, position.lng], map.getZoom());
    }, 120);

    return () => window.clearTimeout(timer);
  }, [map, open, position]);

  return null;
}
