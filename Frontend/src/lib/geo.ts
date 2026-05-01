export type Coordinates = {
  lat: number;
  lng: number;
};

export const AUSTRALIA_CENTER: Coordinates = { lat: -25.2744, lng: 133.7751 };
export const MELBOURNE_CENTER: Coordinates = { lat: -37.8136, lng: 144.9631 };

const KNOWN_LOCATIONS: Record<string, Coordinates> = {
  mel: MELBOURNE_CENTER,
  melbourne: MELBOURNE_CENTER,
  "melbourne vic": MELBOURNE_CENTER,
  "melbourne victoria": MELBOURNE_CENTER,
  syd: { lat: -33.8688, lng: 151.2093 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  "sydney nsw": { lat: -33.8688, lng: 151.2093 },
  "sydney new south wales": { lat: -33.8688, lng: 151.2093 },
  bne: { lat: -27.4698, lng: 153.0251 },
  brisbane: { lat: -27.4698, lng: 153.0251 },
  "brisbane qld": { lat: -27.4698, lng: 153.0251 },
  "brisbane queensland": { lat: -27.4698, lng: 153.0251 },
  adl: { lat: -34.9285, lng: 138.6007 },
  adelaide: { lat: -34.9285, lng: 138.6007 },
  "adelaide sa": { lat: -34.9285, lng: 138.6007 },
  "adelaide south australia": { lat: -34.9285, lng: 138.6007 },
  per: { lat: -31.9523, lng: 115.8613 },
  perth: { lat: -31.9523, lng: 115.8613 },
  "perth wa": { lat: -31.9523, lng: 115.8613 },
  "perth western australia": { lat: -31.9523, lng: 115.8613 },
  cbr: { lat: -35.2802, lng: 149.131 },
  canberra: { lat: -35.2802, lng: 149.131 },
  darwin: { lat: -12.4634, lng: 130.8456 },
  hobart: { lat: -42.8821, lng: 147.3272 },
  geelong: { lat: -38.1499, lng: 144.3617 },
  gee: { lat: -38.1499, lng: 144.3617 },
  ballarat: { lat: -37.5622, lng: 143.8503 },
  bal: { lat: -37.5622, lng: 143.8503 },
  albury: { lat: -36.0737, lng: 146.9135 },
  alb: { lat: -36.0737, lng: 146.9135 },
  bendigo: { lat: -36.757, lng: 144.2794 },
  newcastle: { lat: -32.9283, lng: 151.7817 },
  wollongong: { lat: -34.4278, lng: 150.8931 },
  "gold coast": { lat: -28.0167, lng: 153.4 },
  cairns: { lat: -16.9186, lng: 145.7781 },
  townsville: { lat: -19.259, lng: 146.8169 },
};

const geocodeCache = new Map<string, Promise<Coordinates | null>>();

export function formatLatLng(coords: Coordinates, digits = 5) {
  return `${coords.lat.toFixed(digits)}, ${coords.lng.toFixed(digits)}`;
}

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export async function geocodeLocation(value: string): Promise<Coordinates | null> {
  const raw = value.trim();
  if (!raw) return null;

  const parsed = parseCoordinates(raw);
  if (parsed) return parsed;

  const known = getKnownCoordinates(raw);
  if (known) return known;

  const key = normalizeLocation(raw);
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const promise = geocodeLocationRemote(raw);
  geocodeCache.set(key, promise);
  return promise;
}

export async function reverseGeocodeLocation(coords: Coordinates): Promise<string> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coords.lat));
    url.searchParams.set("lon", String(coords.lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
    });
    if (!response.ok) return "Selected location";

    const data = await response.json();
    return buildDetailedAddress(data) || "Selected location";
  } catch {
    return "Selected location";
  }
}

type JsonRecord = Record<string, unknown>;

function buildDetailedAddress(data: unknown): string {
  const record = asRecord(data);
  const address = asRecord(record.address);
  const street = [
    getString(address, "house_number"),
    getString(address, "road") || getString(address, "pedestrian") || getString(address, "footway"),
  ]
    .filter(Boolean)
    .join(" ");
  const locality =
    getString(address, "suburb") ||
    getString(address, "neighbourhood") ||
    getString(address, "city") ||
    getString(address, "town") ||
    getString(address, "village") ||
    getString(address, "municipality");
  const state = getString(address, "state") || getString(address, "region");
  const postcode = getString(address, "postcode");
  const country = getString(address, "country");
  const structured = [street, locality, state, postcode, country]
    .filter(Boolean)
    .join(", ");

  return (structured || getString(record, "display_name")).replace(/\s+/g, " ").trim();
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function getString(record: JsonRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getKnownCoordinates(value: string): Coordinates | null {
  const key = normalizeLocation(value);
  return KNOWN_LOCATIONS[key] ?? null;
}

function normalizeLocation(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\baustralia\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function geocodeLocationRemote(value: string): Promise<Coordinates | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("q", `${value}, Australia`);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}
