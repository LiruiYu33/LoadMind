import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FleetMap, type RouteStopPoint, type TruckPoint } from "@/components/FleetMap";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { geocode, type LatLng } from "@/lib/geocode";
import { geocodeLocation } from "@/lib/geo";
import { haversineKm } from "@/lib/optimizeRoute";
import {
  optimizeRoute,
  type RouteOptimizationJob,
  type RouteOptimizationShipment,
} from "@/lib/loads-api";
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
const DEFAULT_CUSTOM_SERVICE_MINUTES = 10;
const DEFAULT_TRUCK_END_HOURS = 72;

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
  pickup_time: string;
  dropoff_time: string;
  predicted_margin: number;
};

type Stop = {
  key: string;
  label: string;
  source: "marketplace" | "custom";
  loadId?: string;
  time?: string;
};

type OptimizedResult = {
  ordered: (ResolvedStop & { stopKey: string })[];
  totalKm: number;
  baselineKm: number;
  legsKm: number[];
  truckPos: LatLng;
  roadPath: [number, number][];
};

type ResolvedStop = {
  label: string;
  lat: number;
  lng: number;
  source: Stop["source"];
  stopType: "job" | "pickup" | "delivery" | "end";
  time?: string;
  serviceMinutes?: number;
  loadId?: string;
};

type OrsOptimizationResponse = {
  routes?: Array<{
    steps?: Array<{
      type: string;
      id?: number;
      arrival?: number;
    }>;
  }>;
  unassigned?: Array<{ id?: number }>;
};

const hasGps = (vehicle: Pick<Vehicle, "lat" | "lng"> | null | undefined) => (
  !!vehicle
  && vehicle.lat != null
  && vehicle.lng != null
  && Number.isFinite(Number(vehicle.lat))
  && Number.isFinite(Number(vehicle.lng))
);

export default function RouteOptimization() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [endStop, setEndStop] = useState<string>("");
  const [endStopTime, setEndStopTime] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [locationPicker, setLocationPicker] = useState<"custom" | "end" | null>(null);
  const [loadPickerId, setLoadPickerId] = useState<string>("");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizedResult | null>(null);

  useEffect(() => {
    const loadVehicles = async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .order("unit_id");

      const list = (data ?? []) as Vehicle[];
      const updates: Array<{ id: string; lat: number; lng: number }> = [];

      const enriched = await Promise.all(
        list.map(async (vehicle) => {
          if (hasGps(vehicle)) return vehicle;
          const address = vehicle.location?.trim();
          if (!address) return vehicle;

          const coords = await geocodeLocation(address);
          if (!coords) return vehicle;

          updates.push({ id: vehicle.id, lat: coords.lat, lng: coords.lng });
          return { ...vehicle, lat: coords.lat, lng: coords.lng };
        }),
      );

      setVehicles(enriched);
      setSelectedTruckId((prev) => prev ?? enriched[0]?.id ?? null);

      if (updates.length > 0) {
        await Promise.all(
          updates.map((u) =>
            supabase
              .from("vehicles")
              .update({ lat: u.lat, lng: u.lng })
              .eq("id", u.id),
          ),
        );
      }
    };

    loadVehicles();

    supabase
      .from("loads")
      .select("id,origin,destination,load_type,pickup_time,dropoff_time,predicted_margin")
      .eq("status", "open")
      .order("match_score", { ascending: false })
      .then(({ data }) => setLoads((data ?? []) as Load[]));
  }, []);

  const selectedTruck = vehicles.find((v) => v.id === selectedTruckId) ?? null;
  const selectedLoad = loads.find((load) => load.id === loadPickerId) ?? null;
  const selectedLoadAlreadyAdded = selectedLoad
    ? stops.some((stop) => stop.source === "marketplace" && stop.loadId === selectedLoad.id)
    : false;

  const addCustomStop = () => {
    const name = customInput.trim();
    if (!name) return;
    if (!customTime.trim()) {
      toast({ title: "Add a time", description: "Custom stops need a scheduled arrival time." });
      return;
    }
    if (stops.length >= MAX_STOPS) {
      toast({ title: "Stop limit reached", description: `Max ${MAX_STOPS} stops.` });
      return;
    }
    setStops((s) => [
      ...s,
      { key: `c-${Date.now()}`, label: name, source: "custom", time: customTime },
    ]);
    setCustomInput("");
    setCustomTime("");
    setResult(null);
  };

  const addLoadStops = () => {
    const load = loads.find((l) => l.id === loadPickerId);
    if (!load) return;
    if (stops.some((stop) => stop.source === "marketplace" && stop.loadId === load.id)) {
      toast({
        title: "Load already added",
        description: "You can only add each marketplace load once.",
        variant: "destructive",
      });
      return;
    }
    if (stops.length + 2 > MAX_STOPS) {
      toast({
        title: "Not enough room",
        description: `Adding this load needs 2 stops. You have ${MAX_STOPS - stops.length} left.`,
      });
      return;
    }
    setStops((s) => [
      ...s,
      { key: `m-${load.id}-o-${Date.now()}`, label: load.origin, source: "marketplace", loadId: load.id, time: load.pickup_time },
      { key: `m-${load.id}-d-${Date.now()}`, label: load.destination, source: "marketplace", loadId: load.id, time: load.dropoff_time },
    ]);
    setLoadPickerId("");
    setResult(null);
  };

  const removeStop = (key: string) => {
    setStops((s) => s.filter((x) => x.key !== key));
    setResult(null);
  };

  const truckPoint: TruckPoint | null =
    hasGps(selectedTruck)
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
    if (stops.length < 1 && !endStop.trim()) {
      toast({ title: "Add at least one stop" });
      return;
    }
    setOptimizing(true);
    try {
      const resolvedStops: ResolvedStop[] = [];
      for (const s of stops) {
        const pt = await geocode(s.label);
        if (!pt) {
          toast({
            title: "Couldn't locate stop",
            description: `Try a more specific name for "${s.label}".`,
          });
          return;
        }
        resolvedStops.push({
          label: s.label,
          lat: pt.lat,
          lng: pt.lng,
          source: s.source,
          stopType: "job",
          time: s.time,
          serviceMinutes: s.source === "custom" ? DEFAULT_CUSTOM_SERVICE_MINUTES : 0,
        });
      }

      let endResolved: ResolvedStop | null = null;
      if (endStop.trim()) {
        if (!endStopTime.trim()) {
          toast({ title: "Add an end stop time", description: "The fixed end stop needs a scheduled arrival time." });
          return;
        }
        const pt = await geocode(endStop.trim());
        if (!pt) {
          toast({
            title: "Couldn't locate end stop",
            description: `Try a more specific name for "${endStop}".`,
          });
          return;
        }
        endResolved = {
          label: endStop.trim(),
          lat: pt.lat,
          lng: pt.lng,
          source: "custom",
          stopType: "end",
          time: endStopTime,
          serviceMinutes: 0,
        };
      }

      const start: LatLng = { lat: truckPoint.lat, lng: truckPoint.lng };
      const planningBase = getPlanningBaseTime([...resolvedStops, ...(endResolved ? [endResolved] : [])]);
      const jobs: RouteOptimizationJob[] = [];
      const shipments: RouteOptimizationShipment[] = [];
      const taskById = new Map<number, ResolvedStop>();
      const inputOrderedStops: ResolvedStop[] = [];
      const handledLoadIds = new Set<string>();

      let nextJobId = 1;
      let nextShipmentId = 1;

      for (const stop of stops) {
        if (stop.source === "marketplace") {
          if (!stop.loadId || handledLoadIds.has(stop.loadId)) continue;
          const load = loads.find((entry) => entry.id === stop.loadId);
          const pairedStops = stops.filter((entry) => entry.loadId === stop.loadId && entry.source === "marketplace");
          const pickupStop = pairedStops[0];
          const deliveryStop = pairedStops[1];

          if (!load || !pickupStop || !deliveryStop) {
            toast({
              title: "Could not prepare marketplace load",
              description: "One of the selected loads is missing a pickup or delivery stop.",
              variant: "destructive",
            });
            return;
          }

          handledLoadIds.add(stop.loadId);

          const pickupPoint = await geocode(pickupStop.label);
          const deliveryPoint = await geocode(deliveryStop.label);
          if (!pickupPoint || !deliveryPoint) {
            toast({
              title: "Couldn't locate marketplace load",
              description: `Try a more specific address for ${load.origin} → ${load.destination}.`,
            });
            return;
          }

          const pickupDeadlineSeconds = pickupStop.time ? toOrsDeadlineSeconds(pickupStop.time, planningBase) : null;
          const deliveryDeadlineSeconds = deliveryStop.time ? toOrsDeadlineSeconds(deliveryStop.time, planningBase) : null;
          const pickupTimeWindows = buildTimeWindows({
            deadlineSeconds: pickupDeadlineSeconds,
            serviceSeconds: 0,
            deadlineMode: "latest-arrival",
          });
          const deliveryTimeWindows = buildTimeWindows({
            deadlineSeconds: deliveryDeadlineSeconds,
            serviceSeconds: 0,
            deadlineMode: "latest-arrival",
          });

          if ((pickupStop.time && !pickupTimeWindows) || (deliveryStop.time && !deliveryTimeWindows)) {
            toast({
              title: "Invalid marketplace deadlines",
              description: `${load.origin} → ${load.destination} needs a later pickup or delivery deadline.`,
            });
            return;
          }

          const shipmentId = nextShipmentId;
          const pickupId = 100000 + (shipmentId * 2) - 1;
          const deliveryId = pickupId + 1;
          nextShipmentId += 1;

          shipments.push({
            id: shipmentId,
            amount: [1] as [number],
            pickup: {
              id: pickupId,
              description: load.origin,
              location: [pickupPoint.lng, pickupPoint.lat] as [number, number],
              service: 0,
              ...(pickupTimeWindows ? { time_windows: pickupTimeWindows } : {}),
            },
            delivery: {
              id: deliveryId,
              description: load.destination,
              location: [deliveryPoint.lng, deliveryPoint.lat] as [number, number],
              service: 0,
              ...(deliveryTimeWindows ? { time_windows: deliveryTimeWindows } : {}),
            },
          });

          const pickupResolved: ResolvedStop = {
            label: load.origin,
            lat: pickupPoint.lat,
            lng: pickupPoint.lng,
            source: "marketplace",
            stopType: "pickup",
            time: pickupStop.time,
            serviceMinutes: 0,
            loadId: load.id,
          };
          const deliveryResolved: ResolvedStop = {
            label: load.destination,
            lat: deliveryPoint.lat,
            lng: deliveryPoint.lng,
            source: "marketplace",
            stopType: "delivery",
            time: deliveryStop.time,
            serviceMinutes: 0,
            loadId: load.id,
          };

          taskById.set(pickupId, pickupResolved);
          taskById.set(deliveryId, deliveryResolved);
          inputOrderedStops.push(pickupResolved, deliveryResolved);
          continue;
        }

        const pt = await geocode(stop.label);
        if (!pt) {
          toast({
            title: "Couldn't locate stop",
            description: `Try a more specific name for "${stop.label}".`,
          });
          return;
        }

        const serviceMinutes = stop.source === "custom" ? DEFAULT_CUSTOM_SERVICE_MINUTES : 0;
        const serviceSeconds = serviceMinutes * 60;
        const deadlineSeconds = stop.time ? toOrsDeadlineSeconds(stop.time, planningBase) : null;
        const timeWindows = buildTimeWindows({
          deadlineSeconds,
          serviceSeconds,
          deadlineMode: "latest-arrival",
        });

        if (stop.time && !timeWindows) {
          toast({
            title: "Invalid stop deadline",
            description: `${stop.label} needs more time. The deadline must be greater than zero.`,
          });
          return;
        }

        const jobId = nextJobId;
        nextJobId += 1;

        jobs.push({
          id: jobId,
          description: stop.label,
          location: [pt.lng, pt.lat] as [number, number],
          service: serviceSeconds,
          ...(timeWindows ? { time_windows: timeWindows } : {}),
        });

        const resolvedJob: ResolvedStop = {
          label: stop.label,
          lat: pt.lat,
          lng: pt.lng,
          source: stop.source,
          stopType: "job",
          time: stop.time,
          serviceMinutes,
        };
        taskById.set(jobId, resolvedJob);
        inputOrderedStops.push(resolvedJob);
      }

      const vehicleStart = [start.lng, start.lat] as [number, number];
      const vehicleEnd = endResolved ? [endResolved.lng, endResolved.lat] as [number, number] : vehicleStart;
      const vehicleDeadlineSeconds = endResolved?.time
        ? toOrsDeadlineSeconds(endResolved.time, planningBase)
        : DEFAULT_TRUCK_END_HOURS * 3600;
      const vehicleWindow = buildSingleTimeWindow({
        deadlineSeconds: vehicleDeadlineSeconds,
        serviceSeconds: 0,
        deadlineMode: "latest-arrival",
      });

      if (!vehicleWindow) {
        toast({
          title: "Invalid end stop deadline",
          description: "The end stop deadline must be greater than zero.",
        });
        return;
      }

      const body = {
        jobs,
        shipments: shipments.length > 0 ? shipments : undefined,
        vehicles: [
          {
            id: 1,
            profile: "driving-hgv",
            description: selectedTruck?.unit_id ?? "Truck 1",
            start: vehicleStart,
            end: vehicleEnd,
            time_window: vehicleWindow,
            capacity: [1] as [number],
          },
        ],
      };

      const data = await optimizeRoute(body);
      const route = data.routes?.[0];
      const orderedStepIds = route?.steps
        ?.filter((step) => (step.type === "job" || step.type === "pickup" || step.type === "delivery") && typeof step.id === "number")
        .map((step) => step.id as number) ?? [];

      const orderedStops = orderedStepIds
        .map((taskId) => taskById.get(taskId))
        .filter(Boolean) as ResolvedStop[];

      if (!orderedStops.length && inputOrderedStops.length > 0) {
        toast({
          title: "Route cannot be fulfilled in time",
          description: "The optimization service returned no feasible job order.",
        });
        return;
      }

      if (data.unassigned?.length) {
        toast({
          title: "Route cannot be fulfilled in time",
          description: "The selected stop times are too restrictive. Relax one or more times and try again.",
        });
        return;
      }

      const finalOrdered = endResolved ? [...orderedStops, endResolved] : orderedStops;
      const baselineStops = endResolved ? [...inputOrderedStops, endResolved] : inputOrderedStops;

      const baselineKm = computeSequenceKm(start, baselineStops);

      let roadPath: [number, number][] = [
        [start.lat, start.lng],
        ...finalOrdered.map((p) => [p.lat, p.lng] as [number, number]),
      ];
      let roadTotalKm = baselineKm;
      const roadLegsKm = computeLegsKm(start, finalOrdered);
      try {
        const coords = [start, ...finalOrdered]
          .map((p) => `${p.lng},${p.lat}`)
          .join(";");
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&annotations=false`,
        );
        if (res.ok) {
          const json = await res.json();
          const route = json.routes?.[0];
          if (route?.geometry?.coordinates) {
            roadPath = route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
            );
            roadTotalKm = route.distance / 1000;
          }
        }
      } catch {
        toast({
          title: "Using straight-line estimate",
          description: "Road routing service unreachable.",
        });
      }

      setResult({
        ordered: finalOrdered.map((stop, index) => ({
          ...stop,
          stopKey: index < orderedStops.length ? String(index + 1) : "end",
        })),
        legsKm: roadLegsKm,
        totalKm: roadTotalKm,
        baselineKm,
        truckPos: start,
        roadPath,
      });
    } catch (error) {
      toast({
        title: "Route cannot be fulfilled in time",
        description: error instanceof Error ? error.message : "The selected stop times are too restrictive.",
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

  const routePath: [number, number][] | undefined = useMemo(
    () => result?.roadPath,
    [result],
  );

  const timeMin = toDateTimeLocalValue(new Date());

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
          disabled={optimizing || !truckPoint || (stops.length === 0 && !endStop.trim())}
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
                      {!hasGps(v) && (
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
                    <option key={l.id} value={l.id} disabled={stops.some((stop) => stop.source === "marketplace" && stop.loadId === l.id)}>
                      {l.origin} → {l.destination} · {l.load_type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addLoadStops}
                  disabled={!loadPickerId || stops.length + 2 > MAX_STOPS || selectedLoadAlreadyAdded}
                  className="h-9 w-[68px] shrink-0 rounded-md btn-action text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Custom stop</div>
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_72px_68px] gap-2">
                  <AddressAutocompleteInput
                    value={customInput}
                    onChange={setCustomInput}
                    onKeyDown={(e) => e.key === "Enter" && addCustomStop()}
                    placeholder="City, State"
                    showSuggestionIcon={false}
                    className="surface-3 h-9 px-3 rounded-md text-sm min-w-0 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLocationPicker("custom")}
                    className="h-9 w-[72px] shrink-0 rounded-md surface-3 text-sm font-semibold flex items-center justify-center gap-1.5 hover:lift-shadow"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Map
                  </button>
                  <button
                    onClick={addCustomStop}
                    disabled={!customInput.trim() || !customTime.trim() || stops.length >= MAX_STOPS}
                    className="h-9 w-[68px] shrink-0 rounded-md btn-action text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  min={timeMin}
                  className="surface-3 h-9 px-3 rounded-md text-sm min-w-0 outline-none"
                  aria-label="Custom stop time"
                />
              </div>
            </div>

            <ul className="space-y-2 pt-1">
              {stops.map((s, i) => (
                <li key={s.key} className="flex items-center gap-2 surface-3 rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground font-mono-data w-5">{i + 1}</span>
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{s.label}</div>
                    {s.time && <div className="text-[10px] text-muted-foreground">{s.time.replace("T", " ")}</div>}
                  </div>
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

            <p className="text-xs text-muted-foreground">
              Custom stops must include a scheduled time. Marketplace stops stay flexible unless the ORS optimizer cannot fit them into the selected window.
            </p>
          </section>

          <section className="surface-2 rounded-xl p-5 ghost-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">3 · END STOP (FIXED)</div>
              {endStop && (
                <button
                  onClick={() => { setEndStop(""); setResult(null); }}
                  className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/20"
                  aria-label="Clear end stop"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Locked as the final destination. Order of other stops will be optimized between truck and this end point.
            </p>
            <div className="relative">
              <AddressAutocompleteInput
                value={endStop}
                onChange={(value) => { setEndStop(value); setResult(null); }}
                placeholder="City, State (e.g. Sydney, NSW)"
                showSuggestionIcon={false}
                className="surface-3 h-9 w-full rounded-md px-3 pr-[5.25rem] text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setLocationPicker("end")}
                className="absolute right-1 top-1 h-7 rounded-[4px] px-2.5 text-xs font-semibold flex items-center gap-1.5 transition hover:bg-primary/10 hover:text-primary"
              >
                <MapPin className="h-3.5 w-3.5" /> Map
              </button>
            </div>
            <input
              type="datetime-local"
              value={endStopTime}
              onChange={(e) => setEndStopTime(e.target.value)}
              min={timeMin}
              className="surface-3 h-9 w-full rounded-md px-3 text-sm outline-none"
              aria-label="End stop time"
            />
            <p className="text-xs text-muted-foreground">
              The end stop also needs a future arrival time so ORS can check the route against the deadline.
            </p>
          </section>

          <LocationPickerDialog
            open={locationPicker === "custom"}
            onOpenChange={(open) => !open && setLocationPicker(null)}
            value={customInput}
            onConfirm={(location) => {
              setCustomInput(location);
              setLocationPicker(null);
              setResult(null);
            }}
          />
          <LocationPickerDialog
            open={locationPicker === "end"}
            onOpenChange={(open) => !open && setLocationPicker(null)}
            value={endStop}
            onConfirm={(location) => {
              setEndStop(location);
              setLocationPicker(null);
              setResult(null);
            }}
          />
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
                {result.ordered.map((p, i) => {
                  const isEnd = p.stopKey === "end";
                  return (
                    <li key={p.stopKey} className="flex items-center gap-3 text-sm">
                      <span className={`h-6 w-6 rounded-full grid place-items-center text-xs font-semibold ${isEnd ? "bg-primary text-primary-foreground" : "bg-action text-action-foreground"}`}>
                        {isEnd ? "■" : i + 1}
                      </span>
                      <span className="flex-1 truncate">
                        {p.label}
                        {isEnd && <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">End</span>}
                      </span>
                      <span className="font-mono-data text-xs text-muted-foreground">
                        {result.legsKm[i]?.toFixed(0)} km
                      </span>
                    </li>
                  );
                })}
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

function getPlanningBaseTime(stops: Array<{ time?: string }>): Date {
  const customTimes = stops
    .filter((stop) => stop.time)
    .map((stop) => new Date(stop.time as string));

  if (customTimes.length === 0) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const earliest = customTimes.reduce((current, next) => (next < current ? next : current));
  return new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
}

function toOrsDeadlineSeconds(value: string, base: Date): number {
  return Math.floor((new Date(value).getTime() - base.getTime()) / 1000);
}

function buildTimeWindows({
  deadlineSeconds,
  serviceSeconds,
  deadlineMode,
}: {
  deadlineSeconds: number | null;
  serviceSeconds: number;
  deadlineMode: "latest-arrival" | "service-complete";
}): [number, number][] | undefined {
  if (deadlineSeconds == null || !Number.isFinite(deadlineSeconds)) return undefined;

  const end = deadlineMode === "service-complete"
    ? deadlineSeconds - serviceSeconds
    : deadlineSeconds;

  if (!Number.isFinite(end) || end <= 0) return undefined;
  if (end <= 0) return undefined;

  return [[0, Math.floor(end)]];
}

function buildSingleTimeWindow({
  deadlineSeconds,
  serviceSeconds,
  deadlineMode,
}: {
  deadlineSeconds: number | null;
  serviceSeconds: number;
  deadlineMode: "latest-arrival" | "service-complete";
}): [number, number] | undefined {
  const windows = buildTimeWindows({ deadlineSeconds, serviceSeconds, deadlineMode });
  return windows?.[0];
}

async function readOrsErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error?.message === "string") {
      return body.error.message;
    }
    if (typeof body?.message === "string") {
      return body.message;
    }
  } catch {
    // Fall back to status text below.
  }

  return response.statusText || `OpenRouteService request failed with status ${response.status}`;
}

function computeLegsKm(start: LatLng, stops: Array<{ lat: number; lng: number }>): number[] {
  const legs: number[] = [];
  let previous = start;

  for (const stop of stops) {
    legs.push(haversineKm(previous, stop));
    previous = stop;
  }

  return legs;
}

function computeSequenceKm(start: LatLng, stops: Array<{ lat: number; lng: number }>): number {
  return computeLegsKm(start, stops).reduce((total, legKm) => total + legKm, 0);
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
