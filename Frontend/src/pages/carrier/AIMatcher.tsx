import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignLoad, listOpenLoads } from "@/lib/loads-api";
import { CheckCircle2, ArrowRight, Filter, Search, MapPin, Gauge, Truck, ChevronDown, type LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadRouteMap } from "@/components/LoadRouteMap";
import { normalizeDryGoodsCategory } from "@/lib/dry-goods";
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
};

export default function AIMatcher() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    listOpenLoads()
      .then((data) => setLoads(data ?? []))
      .catch((err: unknown) => {
        toast({
          title: "Could not load marketplace loads",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      });
    supabase.from("vehicles").select("id, unit_id, model, status, location").order("unit_id")
      .then(({ data }) => setVehicles((data ?? []) as Vehicle[]));
  }, []);

  const filtered = loads;

  const handleAssign = async (load: Load, vehicle: Vehicle) => {
    try {
      await assignLoad(load.id, { vehicle_id: vehicle.id });
      setLoads((current) => current.filter((x) => x.id !== load.id));
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
            <input placeholder="Search lane, type…" className="bg-transparent outline-none text-sm w-full" />
          </div>
          <button className="h-9 px-3 rounded-md surface-2 text-sm flex items-center gap-2 hover:surface-3"><Filter className="h-3.5 w-3.5" /> Filters</button>
        </div>

        {/* Match cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="surface-2 rounded-xl p-10 text-center text-sm text-muted-foreground">
              No matches yet — AI Engine is rescanning the marketplace.
            </div>
          )}
          {filtered.map((l) => {
            const displayOrigin = formatLoadLocation(l.origin);
            const displayDestination = formatLoadLocation(l.destination);
            const mapOrigin = formatLoadLocation(l.route_origin || l.origin);
            const mapDestination = formatLoadLocation(l.route_destination || l.destination);
            const displayCategory = normalizeDryGoodsCategory(l.load_type);

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
                    {displayOrigin} <ArrowRight className="inline h-4 w-4 mx-1 shrink-0 text-muted-foreground" /> {displayDestination}
                  </h3>
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
                    {vehicles.map((v) => (
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
