import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignLoad, listOpenLoads } from "@/lib/loads-api";
import { CheckCircle2, ArrowRight, Search, MapPin, Gauge, Truck, ChevronDown, Loader2, Navigation, type LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadRouteMap } from "@/components/LoadRouteMap";
import { LoadMindLoader } from "@/components/LoadMindLoader";
import { DRY_GOODS_CATEGORIES, normalizeDryGoodsCategory } from "@/lib/dry-goods";
import { useAuth } from "@/lib/auth";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { Coordinates, geocodeLocation, reverseGeocodeLocation } from "@/lib/geo";
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
  ai_reasoning: string | null;
  pickup_time: string;
  dropoff_time: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  created_at?: string | null;
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
type SortMode = "value" | "nearest_pickup" | "earliest_pickup";
type PickupSortLocation = {
  address: string;
  coords: Coordinates;
};

export default function AIMatcher() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignedLoads, setAssignedLoads] = useState<AssignedLoad[]>([]);
  const [loadsLoading, setLoadsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [weightFilter, setWeightFilter] = useState<WeightFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("value");
  const [pickupSortLocation, setPickupSortLocation] = useState<PickupSortLocation | null>(null);
  const [pickupSortPickerOpen, setPickupSortPickerOpen] = useState(false);
  const [browserLocationLoading, setBrowserLocationLoading] = useState(false);
  const [pickupCoordsByLoad, setPickupCoordsByLoad] = useState<Record<string, Coordinates | null>>({});

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

  useEffect(() => {
    if (sortMode !== "nearest_pickup" || !pickupSortLocation) return;

    const missingLoads = loads.filter((load) => pickupCoordsByLoad[load.id] === undefined);
    if (missingLoads.length === 0) return;

    let cancelled = false;

    Promise.all(
      missingLoads.map(async (load) => {
        const pickup = formatLoadLocation(load.route_origin || load.origin);
        const coords = await geocodeLocation(pickup);
        return [load.id, coords] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPickupCoordsByLoad((current) => {
        const next = { ...current };
        for (const [loadId, coords] of entries) next[loadId] = coords;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loads, pickupCoordsByLoad, pickupSortLocation, sortMode]);

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
    }).sort((a, b) => compareLoads(a, b, sortMode, pickupSortLocation?.coords, pickupCoordsByLoad));
  }, [assignedLoadsByVehicle, categoryFilter, loads, onlyAvailable, pickupCoordsByLoad, pickupSortLocation, searchTerm, sortMode, vehicles, weightFilter]);

  const pickupDistanceLoading = sortMode === "nearest_pickup" &&
    Boolean(pickupSortLocation) &&
    filtered.some((load) => pickupCoordsByLoad[load.id] === undefined);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setWeightFilter("all");
    setOnlyAvailable(false);
  };

  const handlePickupSortMapConfirm = async (address: string, coords?: Coordinates) => {
    const resolvedCoords = coords ?? await geocodeLocation(address);
    if (!resolvedCoords) {
      toast({
        title: "Could not use selected location",
        description: "Please choose a more specific address or try browser location.",
        variant: "destructive",
      });
      return;
    }

    setPickupSortLocation({ address, coords: resolvedCoords });
  };

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Browser location is unavailable",
        description: "Use the map pin to choose your current position instead.",
        variant: "destructive",
      });
      return;
    }

    setBrowserLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const address = await reverseGeocodeLocation(coords);
        setPickupSortLocation({ address, coords });
        setBrowserLocationLoading(false);
        toast({
          title: "Current location captured",
          description: "Nearest Pickup sorting now uses this browser location snapshot.",
        });
      },
      () => {
        setBrowserLocationLoading(false);
        toast({
          title: "Could not access browser location",
          description: "Allow location access or use the map pin option.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
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
        <div className="label-eyebrow mb-2">LOAD MATCHER</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">AI Load Matcher</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Filter eligible marketplace loads and sort them by operational fields.</p>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex h-9 min-w-[130px] flex-1 items-center gap-2 rounded-md surface-2 px-3 lg:max-w-[220px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search lane, type, item…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-9 w-[136px] shrink-0 rounded-md surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by category"
          >
            <option value="all">All dry goods</option>
            {DRY_GOODS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={weightFilter}
            onChange={(event) => setWeightFilter(event.target.value as WeightFilter)}
            className="h-9 w-[105px] shrink-0 rounded-md surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by weight"
          >
            <option value="all">All weights</option>
            <option value="under_5">Under 5 t</option>
            <option value="5_to_15">5-15 t</option>
            <option value="15_plus">15 t+</option>
          </select>
          <label className="flex h-9 w-[152px] shrink-0 items-center gap-2 rounded-md surface-2 px-3 text-sm font-semibold whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(event) => setOnlyAvailable(event.target.checked)}
            />
            Available truck
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="h-9 shrink-0 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-background/60 hover:text-foreground"
          >
            Reset{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="ml-auto h-9 w-[160px] shrink-0 rounded-md surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sort loads"
          >
            <option value="value">Sort: Load Value</option>
            <option value="nearest_pickup">Sort: Nearest Pickup</option>
            <option value="earliest_pickup">Sort: Earliest Pickup</option>
          </select>
        </div>

        {sortMode === "nearest_pickup" && (
          <div className="surface-2 rounded-md px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[180px] flex-1">
                <div className="label-eyebrow">PICKUP DISTANCE ORIGIN</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">
                  {pickupSortLocation?.address ?? "Choose your current location to sort nearest pickup loads."}
                </div>
                {pickupDistanceLoading && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Resolving pickup distances...
                  </div>
                )}
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickupSortPickerOpen(true)}
                  className="h-9 rounded-md surface-3 px-3 text-sm font-semibold text-foreground transition hover:bg-background/60 flex items-center gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Map pin
                </button>
                <button
                  type="button"
                  onClick={handleUseBrowserLocation}
                  disabled={browserLocationLoading}
                  className="h-9 rounded-md surface-3 px-3 text-sm font-semibold text-foreground transition hover:bg-background/60 disabled:opacity-60 flex items-center gap-2"
                >
                  {browserLocationLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                  )}
                  Browser location
                </button>
              </div>
            </div>
          </div>
        )}

        <LocationPickerDialog
          open={pickupSortPickerOpen}
          onOpenChange={setPickupSortPickerOpen}
          value={pickupSortLocation?.address ?? ""}
          onConfirm={handlePickupSortMapConfirm}
        />

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

function compareLoads(
  a: Load,
  b: Load,
  sortMode: SortMode,
  pickupOrigin?: Coordinates,
  pickupCoordsByLoad: Record<string, Coordinates | null> = {},
) {
  if (sortMode === "nearest_pickup" && pickupOrigin) {
    return compareNumberAsc(
      distanceKm(pickupOrigin, pickupCoordsByLoad[a.id]),
      distanceKm(pickupOrigin, pickupCoordsByLoad[b.id]),
    ) ||
      compareDateAsc(a.pickup_time, b.pickup_time) ||
      compareDateDesc(a.created_at, b.created_at);
  }

  if (sortMode === "value") {
    return compareNumberDesc(a.value, b.value) ||
      compareDateAsc(a.pickup_time, b.pickup_time) ||
      compareDateDesc(a.created_at, b.created_at);
  }

  if (sortMode === "earliest_pickup") {
    return compareDateAsc(a.pickup_time, b.pickup_time) ||
      compareNumberDesc(a.value, b.value) ||
      compareDateDesc(a.created_at, b.created_at);
  }

  return compareDateDesc(a.created_at, b.created_at);
}

function compareNumberAsc(a: number | null | undefined, b: number | null | undefined) {
  const left = numberForSort(a);
  const right = numberForSort(b);

  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

function compareNumberDesc(a: number | null | undefined, b: number | null | undefined) {
  const left = numberForSort(a);
  const right = numberForSort(b);

  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

function compareDateDesc(a: string | null | undefined, b: string | null | undefined) {
  const left = Date.parse(a ?? "");
  const right = Date.parse(b ?? "");
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (!leftValid && !rightValid) return 0;
  if (!leftValid) return 1;
  if (!rightValid) return -1;
  return right - left;
}

function compareDateAsc(a: string | null | undefined, b: string | null | undefined) {
  const left = Date.parse(a ?? "");
  const right = Date.parse(b ?? "");
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (!leftValid && !rightValid) return 0;
  if (!leftValid) return 1;
  if (!rightValid) return -1;
  return left - right;
}

function numberForSort(value: number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distanceKm(a: Coordinates, b: Coordinates | null | undefined) {
  if (!b) return null;

  const earthRadiusKm = 6371;
  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);
  const deltaLat = degreesToRadians(b.lat - a.lat);
  const deltaLng = degreesToRadians(b.lng - a.lng);
  const haversine = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(value: number) {
  return value * (Math.PI / 180);
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
