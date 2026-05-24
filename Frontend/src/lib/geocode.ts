// Lightweight geocoder for AU place names. Uses an in-memory dictionary first,
// then sessionStorage cache, then Nominatim (OpenStreetMap) as a fallback.

export type LatLng = { lat: number; lng: number };

const DICT: Record<string, LatLng> = {
  melbourne: { lat: -37.8136, lng: 144.9631 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  brisbane: { lat: -27.4698, lng: 153.0251 },
  adelaide: { lat: -34.9285, lng: 138.6007 },
  perth: { lat: -31.9523, lng: 115.8613 },
  canberra: { lat: -35.2809, lng: 149.13 },
  hobart: { lat: -42.8821, lng: 147.3272 },
  darwin: { lat: -12.4634, lng: 130.8456 },
  geelong: { lat: -38.1499, lng: 144.3617 },
  ballarat: { lat: -37.5622, lng: 143.8503 },
  bendigo: { lat: -36.7582, lng: 144.2802 },
  albury: { lat: -36.0737, lng: 146.9135 },
  shepparton: { lat: -36.3833, lng: 145.4 },
  mildura: { lat: -34.1855, lng: 142.1625 },
  newcastle: { lat: -32.9283, lng: 151.7817 },
  wollongong: { lat: -34.4278, lng: 150.8931 },
};

const normalize = (s: string) =>
  s.trim().toLowerCase().split(",")[0].trim();

const SESSION_KEY = "loadmind:geocode-cache";
const sessionCache: Record<string, LatLng> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
  } catch {
    return {};
  }
})();

const persist = () => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionCache));
  } catch {
    /* ignore */
  }
};

export async function geocode(name: string): Promise<LatLng | null> {
  const key = normalize(name);
  if (!key) return null;
  if (DICT[key]) return DICT[key];
  if (sessionCache[key]) return sessionCache[key];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      name,
    )}&countrycodes=au&limit=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.length) return null;
    const pt = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    sessionCache[key] = pt;
    persist();
    return pt;
  } catch {
    return null;
  }
}