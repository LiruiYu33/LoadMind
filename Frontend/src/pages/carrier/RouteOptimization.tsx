import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FleetMap, type RouteStopPoint, type TruckPoint } from "@/components/FleetMap";
import { geocode, type LatLng } from "@/lib/geocode";
import {
  nearestNeighbor,
  pathDistanceKm,
  type RoutePoint,
} from "@/lib/optimizeRoute";
import {
  Truck,
  Plus,
  X,
  Sparkles,
  Activity,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MAX_STOPS = 5;
const AVG_SPEED_KMH = 80;

type Vehicle = {
  id: string;
  unit_id: string;
  status: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  model: string;
  fuel_efficiency: number | null;
};

type Load = {
  id: string;
  origin: string;
  destination: string;
  load_type: string;
  predicted_margin: number;
};

type Stop = {
  key: string;
  label: string;
  source: "marketplace" | "custom";
  loadId?: string;
};

type OptimizedResult = {
  ordered: (RoutePoint & { stopKey: string })[];
  totalKm: number;
  baselineKm: number;
  legsKm: number[];
  truckPos: LatLng;
};

export default function RouteOptimization() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [loadPickerId, setLoadPickerId] = useState<string>("");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizedResult | null>(null);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("*")
      .order("unit_id")
      .then(({ data }) => {
        const list = (data ?? []) as Vehicle[];
        setVehicles(list);
        setSelectedTruckId((prev) => prev ?? list[0]?.id ?? null);
      });
    supabase
      .from("loads")
      .select("id,origin,destination,load_type,predicted_margin")
      .eq("status", "open")
      .order("match_score", { ascending: false })
      .then(({ data }) => setLoads((data ?? []) as Load[]));
  }, []);

  const selectedTruck = vehicles.find((v) => v.id === selectedTruckId) ?? null;

  const addCustomStop = () => {
    const name = customInput.trim();
    if (!name) return;
    if (stops.length >= MAX_STOPS) {
      toast({ title: "Stop limit reached", description: `Max ${MAX_STOPS} stops.` });
      return;
    }
    setStops((s) => [
      ...s,
      { key: `c-${Date.now()}`, label: name, source: "custom" },
    ]);
    setCustomInput("");
    setResult(null);
  };

  const addLoadStops = () => {
    const load = loads.find((l) => l.id === loadPickerId);
    if (!load) return;
    if (stops.length + 2 > MAX_STOPS) {
      toast({
        title: "Not enough room",
        description: `Adding this load needs 2 stops. You have ${MAX_STOPS - stops.length} left.`,
      });
      return;
    }
    setStops((s) => [
      ...s,
      { key: `m-${load.id}-o-${Date.now()}`, label: load.origin, source: "marketplace", loadId: load.id },
      { key: `m-${load.id}-d-${Date.now()}`, label: load.destination, source: "marketplace", loadId: load.id },
    ]);
    setLoadPickerId("");
    setResult(null);
  };

  const removeStop = (key: string) => {
    setStops((s) => s.filter((x) => x.key !== key));
    setResult(null);
  };

  const truckPoint: TruckPoint | null =
    selectedTruck && selectedTruck.lat != null && selectedTruck.lng != null
      ? {
          id: selectedTruck.id,
          unit_id: selectedTruck.unit_id,
          lat: Number(selectedTruck.lat),
          lng: Number(selectedTruck.lng),
          status: selectedTruck.status,
          location: selectedTruck.location ?? "",
        }
      : null;

  const optimize = async () => {
    if (!truckPoint) {
      toast({ title: "Pick a truck", description: "Select a truck with a known position to start." });
      return;
    }
    if (stops.length < 1) {
      toast({ title: "Add at least one stop" });
      return;
    }
    setOptimizing(true);
    try {
      const resolved: (RoutePoint & { stopKey: string })[] = [];
      for (const s of stops) {
        const pt = await geocode(s.label);
        if (!pt) {
          toast({
            title: "Couldn't locate stop",
            description: `Try a more specific name for "${s.label}".`,
          });
          setOptimizing(false);
          return;
        }
        resolved.push({ ...pt, label: s.label, stopKey: s.key });
      }
      const start: LatLng = { lat: truckPoint.lat, lng: truckPoint.lng };
      const baselineKm = pathDistanceKm(start, resolved);
      const nn = nearestNeighbor(start, resolved);
      setResult({
        ordered: nn.ordered as (RoutePoint & { stopKey: string })[],
        legsKm: nn.legsKm,
        totalKm: nn.totalKm,
        baselineKm,
        truckPos: start,
      });
    } finally {
      setOptimizing(false);
    }
  };

  const stopMarkers: RouteStopPoint[] = useMemo(() => {
    if (!result) return [];
    return result.ordered.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      label: p.label,
      order: i + 1,
    }));
  }, [result]);

  const routePath: [number, number][] | undefined = useMemo(() => {
    if (!result) return undefined;
    return [
      [result.truckPos.lat, result.truckPos.lng],
      ...result.ordered.map((p) => [p.lat, p.lng] as [number, number]),
    ];
  }, [result]);

  const fuelEff = Number(selectedTruck?.fuel_efficiency ?? 35); // L/100km default
  const estHours = result ? result.totalKm / AVG_SPEED_KMH : 0;
  const estFuelL = result ? (result.totalKm * fuelEff) / 100 : 0;
  const savedKm = result ? Math.max(0, result.baselineKm - result.totalKm) : 0;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-2">FLEET COMMAND · ROUTE OPTIMIZER</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">Plan an Optimized Route</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Pick a truck, add up to {MAX_STOPS} stops from the marketplace or as custom destinations, then optimize.
          </p>
        </div>
        <button
          onClick={optimize}
          disabled={optimizing || !truckPoint || stops.length === 0}
          className="btn-action h-11 px-5 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Optimize Route
        </button>
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-6">
        {/* LEFT — Controls */}
        <div className="space-y-4">
          <section className="surface-2 rounded-xl p-5 ghost-shadow">
            <div className="label-eyebrow mb-3">1 · SELECT TRUCK</div>
            <ul className="space-y-2">
              {vehicles.map((v) => {
                const sel = v.id === selectedTruckId;
                return (
                  <li key={v.id}>
                    <button
                      onClick={() => {
                        setSelectedTruckId(v.id);
                        setResult(null);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition ${
                        sel ? "surface-3 ring-1 ring-primary" : "hover:surface-3"
                      }`}
                    >
                      <div
                        className="h-9 w-12 rounded-md grid place-items-center shrink-0"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        <Truck className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-semibold text-sm">{v.unit_id}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {v.location ?? "—"} · {v.status}
                        </div>
                      </div>
                      {v.lat == null && (
                        <span className="text-[10px] text-destructive">no GPS</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {vehicles.length === 0 && (
                <li className="text-sm text-muted-foreground">No vehicles registered yet.</li>
              )}
            </ul>
          </section>

          <section className="surface-2 rounded-xl p-5 ghost-shadow space-y-4">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">2 · ADD STOPS</div>
              <span className="text-xs text-muted-foreground font-mono-data">
                {stops.length}/{MAX_STOPS}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">From marketplace</div>
              <div className="flex gap-2">
                <select
                  value={loadPickerId}
                  onChange={(e) => setLoadPickerId(e.target.value)}
                  className="surface-3 h-9 px-3 rounded-md text-sm flex-1 min-w-0 outline-none"
                >
                  <option value="">Select a load…</option>
                  {loads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.origin} → {l.destination} · {l.load_type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addLoadStops}
                  disabled={!loadPickerId || stops.length + 2 > MAX_STOPS}
                  className="h-9 px-3 rounded-md btn-action text-sm font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Custom stop</div>
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomStop()}
                  placeholder="City, State"
                  className="surface-3 h-9 px-3 rounded-md text-sm flex-1 min-w-0 outline-none"
                />
                <button
                  onClick={addCustomStop}
                  disabled={!customInput.trim() || stops.length >= MAX_STOPS}
                  className="h-9 px-3 rounded-md btn-action text-sm font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <ul className="space-y-2 pt-1">
              {stops.map((s, i) => (
                <li key={s.key} className="flex items-center gap-2 surface-3 rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground font-mono-data w-5">{i + 1}</span>
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{s.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.source}
                  </span>
                  <button
                    onClick={() => removeStop(s.key)}
                    className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {stops.length === 0 && (
                <li className="text-xs text-muted-foreground italic">No stops added yet.</li>
              )}
            </ul>
          </section>
        </div>

        {/* RIGHT — Map + Result */}
        <div className="space-y-4">
          <div className="h-[480px]">
            <FleetMap
              trucks={truckPoint ? [truckPoint] : []}
              stops={stopMarkers}
              routePath={routePath}
              height="100%"
              fitToBounds
            />
          </div>

          {result ? (
            <section className="surface-2 rounded-xl p-6 ghost-shadow space-y-5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="label-eyebrow">OPTIMIZED ORDER</div>
                  <h2 className="font-display text-lg font-bold mt-0.5">
                    {selectedTruck?.unit_id} · {result.ordered.length} stops
                  </h2>
                </div>
              </div>

              <ol className="space-y-2">
                <li className="flex items-center gap-3 text-sm">
                  <span className="h-6 w-6 rounded-full grid place-items-center text-xs font-semibold bg-action text-action-foreground">
                    ◎
                  </span>
                  <span className="flex-1">
                    <span className="font-display font-semibold">Start</span> ·{" "}
                    {selectedTruck?.location ?? "Current position"}
                  </span>
                </li>
                {result.ordered.map((p, i) => (
                  <li key={p.stopKey} className="flex items-center gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full grid place-items-center text-xs font-semibold bg-action text-action-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="font-mono-data text-xs text-muted-foreground">
                      {result.legsKm[i].toFixed(0)} km
                    </span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <Metric label="TOTAL DISTANCE" value={`${result.totalKm.toFixed(0)} km`} />
                <Metric
                  label="EST. TIME"
                  value={`${Math.floor(estHours)}h ${Math.round((estHours % 1) * 60)}m`}
                />
                <Metric label="EST. FUEL" value={`${estFuelL.toFixed(0)} L`} />
                <Metric
                  label="SAVED vs INPUT"
                  value={`${savedKm.toFixed(0)} km`}
                  accent={savedKm > 0}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Assignment to truck will be wired to dispatch in a later release.
                </div>
                <button
                  disabled
                  className="h-10 px-5 rounded-md surface-3 text-sm font-semibold opacity-50 cursor-not-allowed"
                >
                  Assign to truck
                </button>
              </div>
            </section>
          ) : (
            <section className="surface-2 rounded-xl p-8 ghost-shadow text-center text-sm text-muted-foreground">
              Configure a truck and stops, then click{" "}
              <span className="text-primary font-semibold">Optimize Route</span> to see the best order.
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="surface-3 rounded-md p-3">
      <div className="label-eyebrow text-[10px]">{label}</div>
      <div
        className={`font-display text-lg font-extrabold mt-1 font-mono-data ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}