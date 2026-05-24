import type { LatLng } from "./geocode";

export type RoutePoint = LatLng & { label: string };

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function pathDistanceKm(start: LatLng, ordered: LatLng[]): number {
  let total = 0;
  let prev = start;
  for (const p of ordered) {
    total += haversineKm(prev, p);
    prev = p;
  }
  return total;
}

export function nearestNeighbor(
  start: LatLng,
  points: RoutePoint[],
): { ordered: RoutePoint[]; totalKm: number; legsKm: number[] } {
  const remaining = [...points];
  const ordered: RoutePoint[] = [];
  const legsKm: number[] = [];
  let current: LatLng = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    legsKm.push(bestDist);
    current = next;
  }
  const totalKm = legsKm.reduce((a, b) => a + b, 0);
  return { ordered, totalKm, legsKm };
}