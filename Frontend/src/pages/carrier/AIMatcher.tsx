import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignLoad, listOpenLoads } from "@/lib/loads-api";
import { CheckCircle2, ArrowRight, Filter, Search, MapPin, Gauge, Truck, ChevronDown, type LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadRouteMap } from "@/components/LoadRouteMap";
import { LoadMindLoader } from "@/components/LoadMindLoader";
import { DRY_GOODS_CATEGORIES, normalizeDryGoodsCategory } from "@/lib/dry-goods";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Load = {
  id: string;
  cargo?: string | null;
  origin: string;
  destination: string;
  route_origin?: string | null;
  route_destination?: string | null;
  weight_kg: number;
  load_type: string;
  value: number;
  predicted_margin: number;
  empty_miles_saved: number | null;
  match_score: number | null;
  ai_reasoning: string | null;
  pickup_time: string;
  dropoff_time: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
};

type Vehicle = {
  id: string;
  unit_id: string;
  model: string;
  status: string;
  location: string | null;
  capacity_t: number;
  trailers?: Trailer[] | null;
};

type Trailer = {
  length_m?: number | null;
  width_m?: number | null;
  height_m?: number | null;
  capacity_t?: number | null;
};

type AssignedLoad = {
  id: string;
  assigned_vehicle_id: string | null;
  pickup_time: string;
  dropoff_time: string;
  status: string;
};

type WeightFilter = "all" | "under_5" | "5_to_15" | "15_plus";

export default function AIMatcher() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignedLoads, setAssignedLoads] = useState<AssignedLoad[]>([]);
  const [loadsLoading, setLoadsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [weightFilter, setWeightFilter] = useState<WeightFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let completionTimer: number | undefined;

    setLoadsLoading(true);

    listOpenLoads()
      .then((data) => {
        if (cancelled) return;
        setLoads(data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast({
          title: "Could not load marketplace loads",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (cancelled) return;
        completionTimer = window.setTimeout(() => {
          if (!cancelled) setLoadsLoading(false);
        }, 360);
      });
    supabase.from("vehicles").select("id, unit_id, model, status, location, capacity_t, trailers").order("unit_id")
      .then(({ data }) => setVehicles((data ?? []) as unknown as Vehicle[]));

    return () => {
      cancelled = true;
      if (completionTimer) window.clearTimeout(completionTimer);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAssignedLoads([]);
      return;
    }

    supabase
      .from("loads")
      .select("id, assigned_vehicle_id, pickup_time, dropoff_time, status")
      .eq("assigned_carrier_id", user.id)
      .in("status", ["scheduled", "in_transit"])
      .then(({ data }) => setAssignedLoads((data ?? []) as AssignedLoad[]));
  }, [user]);

  const assignedLoadsByVehicle = useMemo(() => {
    return assignedLoads.reduce<Record<string, AssignedLoad[]>>((acc, load) => {
      if (!load.assigned_vehicle_id) return acc;
      acc[load.assigned_vehicle_id] = [...(acc[load.assigned_vehicle_id] ?? []), load];
      return acc;
    }, {});
  }, [assignedLoads]);
  const activeFilterCount = [
    categoryFilter !== "all",
    weightFilter !== "all",
    onlyAvailable,
  ].filter(Boolean).length;
  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return loads.filter((load) => {
      const displayCategory = normalizeDryGoodsCategory(load.load_type);
      const weightT = Number(load.weight_kg) / 1000;

      if (query) {
        const searchable = [
          load.cargo,
          load.origin,
          load.destination,
          load.route_origin,
          load.route_destination,
          load.load_type,
          displayCategory,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (categoryFilter !== "all" && displayCategory !== categoryFilter) {
        return false;
      }

      if (weightFilter === "under_5" && weightT >= 5) return false;
      if (weightFilter === "5_to_15" && (weightT < 5 || weightT > 15)) return false;
      if (weightFilter === "15_plus" && weightT < 15) return false;

      if (onlyAvailable) {
        return vehicles.some((vehicle) =>
          isVehicleEligibleForLoad(vehicle, load, assignedLoadsByVehicle[vehicle.id] ?? []),
        );
      }

      return true;
    });
  }, [assignedLoadsByVehicle, categoryFilter, loads, onlyAvailable, searchTerm, vehicles, weightFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setWeightFilter("all");
    setOnlyAvailable(false);
  };

  const handleAssign = async (load: Load, vehicle: Vehicle) => {
    try {
      await assignLoad(load.id, { vehicle_id: vehicle.id });
      setLoads((current) => current.filter((x) => x.id !== load.id));
      setAssignedLoads((current) => [
        ...current,
        {
          id: load.id,
          assigned_vehicle_id: vehicle.id,
          pickup_time: load.pickup_time,
          dropoff_time: load.dropoff_time,
          status: "scheduled",
        },
      ]);
      toast({
        title: "Load assigned",
        description: `${formatLoadLocation(load.origin)} → ${formatLoadLocation(load.destination)} dispatched to ${vehicle.unit_id} (${vehicle.model}).`,
      });
    } catch (err: unknown) {
      toast({
        title: "Could not assign load",
        description: err instanceof Error ? err.message : "Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">AI LOGIC ENGINE</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">AI Load Matcher</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Continuously scoring marketplace loads against your fleet.</p>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 surface-2 h-9 px-3 rounded-md flex-1 min-w-[180px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search lane, type, item…"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            className="h-9 px-3 rounded-md surface-2 text-sm flex items-center gap-2 hover:surface-3"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="surface-2 rounded-xl p-4 ghost-shadow">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
              <label className="block">
                <div className="label-eyebrow mb-2">Category</div>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 w-full rounded-md surface-3 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All dry goods</option>
                  {DRY_GOODS_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="label-eyebrow mb-2">Weight</div>
                <select
                  value={weightFilter}
                  onChange={(event) => setWeightFilter(event.target.value as WeightFilter)}
                  className="h-10 w-full rounded-md surface-3 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All weights</option>
                  <option value="under_5">Under 5 t</option>
                  <option value="5_to_15">5-15 t</option>
                  <option value="15_plus">15 t+</option>
                </select>
              </label>
              <label className="flex h-10 items-center gap-2 rounded-md surface-3 px-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(event) => setOnlyAvailable(event.target.checked)}
                />
                Has available truck
              </label>
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-background/60 hover:text-foreground"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {loadsLoading && (
          <div className="surface-2 rounded-xl p-4 ghost-shadow">
            <LoadMindLoader
              compact
              label="Scanning marketplace"
              detail="Loading AI-matched loads"
            />
          </div>
        )}

        {/* Match cards */}
        <div className="space-y-3">
          {!loadsLoading && filtered.length === 0 && (
            <div className="surface-2 rounded-xl p-10 text-center text-sm text-muted-foreground">
              {loads.length === 0
                ? "No matches yet — AI Engine is rescanning the marketplace."
                : "No loads match the current search and filters."}
            </div>
          )}
          {filtered.map((l) => {
            const displayOrigin = formatLoadLocation(l.origin);
            const displayDestination = formatLoadLocation(l.destination);
            const mapOrigin = formatLoadLocation(l.route_origin || l.origin);
            const mapDestination = formatLoadLocation(l.route_destination || l.destination);
            const displayCategory = normalizeDryGoodsCategory(l.load_type);
            const itemDescription = formatCargoDescription(l.cargo, displayCategory);
            const eligibleVehicles = vehicles.filter((v) => isVehicleEligibleForLoad(v, l, assignedLoadsByVehicle[v.id] ?? []));

            return (
            <article key={l.id} className="surface-2 rounded-xl p-6 ghost-shadow flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="pill pill-active">{displayCategory}</span>
                    <span>·</span>
                    <span>{(Number(l.weight_kg) / 1000).toFixed(1)} t</span>
                  </div>
                  <h3 className="font-display text-xl font-bold mt-2 break-words">
                    {itemDescription}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground break-words">
                    {displayOrigin} <ArrowRight className="inline h-3.5 w-3.5 mx-1 shrink-0" /> {displayDestination}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="label-eyebrow">LOAD VALUE</div>
                  <div className="font-display text-2xl font-extrabold text-action-deep font-mono-data">
                    ${Number(l.value).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Sub-well */}
              <div className="surface-3 rounded-md p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat k="Weight" v={`${(Number(l.weight_kg) / 1000).toFixed(1)} t`} accent />
                <Stat k="Length" v={l.length_cm != null ? `${l.length_cm} cm` : "—"} />
                <Stat k="Width" v={l.width_cm != null ? `${l.width_cm} cm` : "—"} />
                <Stat k="Height" v={l.height_cm != null ? `${l.height_cm} cm` : "—"} />
              </div>

              {/* Full load details */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <Detail icon={MapPin} label="Pickup" value={displayOrigin} />
                <Detail
                  icon={Gauge}
                  label="Pickup Time"
                  value={formatDateTime(l.pickup_time)}
                />
                <Detail icon={MapPin} label="Delivery" value={displayDestination} />
                <Detail
                  icon={Gauge}
                  label="Dropoff Time"
                  value={formatDateTime(l.dropoff_time)}
                />
              </div>

              <LoadRouteMap
                origin={mapOrigin}
                destination={mapDestination}
                originLabel={displayOrigin}
                destinationLabel={displayDestination}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="btn-action h-10 px-5 rounded-md text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Assign Load <ChevronDown className="h-4 w-4 opacity-80" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>Select a vehicle</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {vehicles.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground">
                        No vehicles registered yet.
                      </div>
                    )}
                    {vehicles.length > 0 && eligibleVehicles.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground">
                        No theoretically available trucks for this load.
                      </div>
                    )}
                    {eligibleVehicles.map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() => handleAssign(l, v)}
                        className="flex items-start gap-2.5 py-2"
                      >
                        <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {v.unit_id} <span className="text-muted-foreground font-normal">· {v.model}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {v.location ?? "Unknown location"} · {v.status}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLoadLocation(value: string) {
  const key = value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\baustralia\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (key === "clayton" || key === "clayton vic" || key === "clayton victoria") {
    return "Clayton, Victoria, 3168, Australia";
  }

  if (key === "cbd" || key === "melbourne cbd" || key === "cbd melbourne") {
    return "Melbourne, Victoria, 3000, Australia";
  }

  return value;
}

function formatCargoDescription(value: string | null | undefined, fallbackCategory: string) {
  const raw = (value ?? "").trim();
  return raw || fallbackCategory;
}

function isVehicleEligibleForLoad(vehicle: Vehicle, load: Load, vehicleLoads: AssignedLoad[]) {
  if (isVehicleUnavailableByStatus(vehicle.status)) return false;
  if (vehicleHasTimeConflict(load, vehicleLoads)) return false;
  if (!vehicleHasCapacity(vehicle, load)) return false;
  if (!vehicleHasDimensionalFit(vehicle, load)) return false;
  return true;
}

function isVehicleUnavailableByStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return ["maintenance", "offline", "retired", "unavailable", "decommissioned"].includes(normalized);
}

function vehicleHasTimeConflict(load: Load, vehicleLoads: AssignedLoad[]) {
  const loadStart = Date.parse(load.pickup_time);
  const loadEnd = Date.parse(load.dropoff_time);
  if (!Number.isFinite(loadStart) || !Number.isFinite(loadEnd)) return true;

  return vehicleLoads.some((scheduled) => {
    const scheduledStart = Date.parse(scheduled.pickup_time);
    const scheduledEnd = Date.parse(scheduled.dropoff_time);
    if (!Number.isFinite(scheduledStart) || !Number.isFinite(scheduledEnd)) return true;
    return loadStart < scheduledEnd && scheduledStart < loadEnd;
  });
}

function vehicleHasCapacity(vehicle: Vehicle, load: Load) {
  const vehicleCapacityKg = Number(vehicle.capacity_t) * 1000;
  return Number.isFinite(vehicleCapacityKg) && vehicleCapacityKg >= Number(load.weight_kg);
}

function vehicleHasDimensionalFit(vehicle: Vehicle, load: Load) {
  const required = {
    length_cm: numericDimension(load.length_cm),
    width_cm: numericDimension(load.width_cm),
    height_cm: numericDimension(load.height_cm),
  };
  const hasRequiredDimensions = Object.values(required).some((value) => value != null);
  if (!hasRequiredDimensions) return true;

  const trailers = Array.isArray(vehicle.trailers) ? vehicle.trailers : [];
  const trailersWithDimensions = trailers.filter((trailer) =>
    numericDimension(trailer.length_m) != null ||
    numericDimension(trailer.width_m) != null ||
    numericDimension(trailer.height_m) != null
  );

  if (trailersWithDimensions.length === 0) return true;

  return trailersWithDimensions.some((trailer) => {
    const available = {
      length_cm: metersToCentimeters(trailer.length_m),
      width_cm: metersToCentimeters(trailer.width_m),
      height_cm: metersToCentimeters(trailer.height_m),
    };

    return dimensionFits(required.length_cm, available.length_cm) &&
      dimensionFits(required.width_cm, available.width_cm) &&
      dimensionFits(required.height_cm, available.height_cm);
  });
}

function numericDimension(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function metersToCentimeters(value: number | string | null | undefined) {
  const meters = numericDimension(value);
  return meters == null ? null : meters * 100;
}

function dimensionFits(required: number | null, available: number | null) {
  if (required == null) return true;
  if (available == null) return true;
  return available >= required;
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="label-eyebrow">{k}</div>
      <div className={`font-display font-semibold mt-1 font-mono-data ${accent ? "text-primary" : ""}`}>{v}</div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      title={value}
      className="flex w-full items-start gap-2.5 rounded-md text-left transition hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="h-8 w-8 rounded-md surface-3 grid place-items-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="label-eyebrow">{label}</div>
        <div className={`text-sm font-medium mt-0.5 ${expanded ? "whitespace-normal break-words" : "truncate"}`}>
          {value}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {expanded ? "Show less" : "Show full"}
        </div>
      </div>
    </button>
  );
}
