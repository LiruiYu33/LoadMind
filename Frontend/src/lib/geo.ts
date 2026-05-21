export type Coordinates = {
  lat: number;
  lng: number;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  coords: Coordinates;
};

export const AUSTRALIA_CENTER: Coordinates = { lat: -25.2744, lng: 133.7751 };
export const MELBOURNE_CENTER: Coordinates = { lat: -37.8136, lng: 144.9631 };
export const MELBOURNE_CBD: Coordinates = { lat: -37.8136, lng: 144.9631 };

const KNOWN_LOCATIONS: Record<string, Coordinates> = {
  cbd: MELBOURNE_CBD,
  "melbourne cbd": MELBOURNE_CBD,
  "cbd melbourne": MELBOURNE_CBD,
  "melbourne central business district": MELBOURNE_CBD,
  mel: MELBOURNE_CENTER,
  melbourne: MELBOURNE_CENTER,
  "melbourne vic": MELBOURNE_CENTER,
  "melbourne victoria": MELBOURNE_CENTER,
  "sydney cbd": { lat: -33.8747, lng: 151.2054 },
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
  clayton: { lat: -37.9158025, lng: 145.1313859 },
  "clayton vic": { lat: -37.9158025, lng: 145.1313859 },
  "clayton victoria": { lat: -37.9158025, lng: 145.1313859 },
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
  "391 395 dynon road west melbourne victoria 3003": { lat: -37.8031708, lng: 144.9135627 },
  "9a butler street eumemmerring victoria 3177": { lat: -37.9985619, lng: 145.2447439 },
};

const GEOCODE_QUERY_ALIASES: Record<string, string> = {
  cbd: "Melbourne, Victoria, 3000, Australia",
  "melbourne cbd": "Melbourne, Victoria, 3000, Australia",
  "cbd melbourne": "Melbourne, Victoria, 3000, Australia",
  clayton: "Clayton, Victoria, 3168, Australia",
  "clayton vic": "Clayton, Victoria, 3168, Australia",
  "clayton victoria": "Clayton, Victoria, 3168, Australia",
};

const geocodeCache = new Map<string, Promise<Coordinates | null>>();
const suggestionCache = new Map<string, Promise<AddressSuggestion[]>>();

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

export async function searchAddressSuggestions(value: string): Promise<AddressSuggestion[]> {
  const raw = value.trim();
  if (raw.length < 3) return [];

  const key = normalizeLocation(raw);
  if (suggestionCache.has(key)) return suggestionCache.get(key)!;

  const promise = searchAddressSuggestionsRemote(raw);
  suggestionCache.set(key, promise);
  return promise;
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
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("dedupe", "1");
    url.searchParams.set("q", buildAustralianQuery(value));

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const best = Array.isArray(data) ? chooseBestGeocodeResult(value, data) : null;
    if (!best) return null;

    const lat = Number(best.lat);
    const lng = Number(best.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

function buildAustralianQuery(value: string) {
  const expanded = expandLocationQuery(value);
  return /\baustralia\b/i.test(expanded) ? expanded : `${expanded}, Australia`;
}

function expandLocationQuery(value: string) {
  return GEOCODE_QUERY_ALIASES[normalizeLocation(value)] ?? value;
}

function chooseBestGeocodeResult(value: string, entries: unknown[]): JsonRecord | null {
  const scored = entries
    .map((entry) => {
      const record = asRecord(entry);
      const lat = Number(record.lat);
      const lon = Number(record.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { record, score: scoreGeocodeResult(value, record) };
    })
    .filter((item): item is { record: JsonRecord; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.record ?? null;
}

function scoreGeocodeResult(value: string, record: JsonRecord) {
  const normalizedInput = normalizeLocation(value);
  const display = normalizeLocation(getString(record, "display_name"));
  const address = asRecord(record.address);
  const state = normalizeLocation(getString(address, "state"));
  const postcode = getString(address, "postcode");
  const addresstype = getString(record, "addresstype");
  const category = getString(record, "category");
  const type = getString(record, "type");

  let score = 0;

  if (getString(address, "country_code") === "au") score += 25;
  if (hasLocationToken(normalizedInput, "victoria") || hasLocationToken(normalizedInput, "vic")) {
    score += state.includes("victoria") || display.includes("victoria") ? 60 : -80;
  }
  if (normalizedInput.includes("new south wales") || hasLocationToken(normalizedInput, "nsw")) {
    score += state.includes("new south wales") || display.includes("new south wales") ? 60 : -80;
  }
  if (hasLocationToken(normalizedInput, "queensland") || hasLocationToken(normalizedInput, "qld")) {
    score += state.includes("queensland") || display.includes("queensland") ? 60 : -80;
  }

  const inputPostcode = value.match(/\b\d{4}\b/)?.[0];
  if (inputPostcode) score += postcode === inputPostcode || display.includes(inputPostcode) ? 45 : -30;

  for (const token of importantLocationTokens(normalizedInput)) {
    if (display.includes(token)) score += token.length >= 5 ? 8 : 4;
  }

  if (addresstype === "place" || type === "house") score += 20;
  if (category === "amenity" || category === "building") score += 10;
  if (type === "road" && /\d/.test(value)) score -= 8;

  const importance = Number(record.importance);
  if (Number.isFinite(importance)) score += Math.min(importance * 10, 5);

  return score;
}

function importantLocationTokens(normalizedInput: string) {
  const ignored = new Set([
    "australia",
    "vic",
    "victoria",
    "nsw",
    "new",
    "south",
    "wales",
    "qld",
    "queensland",
  ]);

  return normalizedInput
    .split(" ")
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

function hasLocationToken(normalizedInput: string, token: string) {
  return normalizedInput.split(" ").includes(token);
}

async function searchAddressSuggestionsRemote(value: string): Promise<AddressSuggestion[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("q", buildAustralianQuery(value));

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((entry) => {
        const record = asRecord(entry);
        const lat = Number(record.lat);
        const lng = Number(record.lon);
        const label = buildDetailedAddress(record);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null;

        return {
          id: [
            getString(record, "osm_type"),
            getString(record, "osm_id"),
            label,
          ].filter(Boolean).join("-"),
          label,
          coords: { lat, lng },
        };
      })
      .filter((item): item is AddressSuggestion => Boolean(item));
  } catch {
    return [];
  }
}
