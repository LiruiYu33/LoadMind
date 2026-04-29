import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignLoad, listOpenLoads } from "@/lib/loads-api";
import { CheckCircle2, ArrowRight, Filter, Search, MapPin, Gauge, Truck, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
      .then((data) => setLoads((data ?? []) as Load[]))
      .catch((err: any) => {
        toast({
          title: "Could not load marketplace loads",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      });
    supabase.from("vehicles").select("id, unit_id, model, status, location").order("unit_id")
      .then(({ data }) => setVehicles((data ?? []) as Vehicle[]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = loads;

  const handleAssign = async (load: Load, vehicle: Vehicle) => {
    try {
      await assignLoad(load.id, { vehicle_id: vehicle.id });
      setLoads((current) => current.filter((x) => x.id !== load.id));
      toast({
        title: "Load assigned",
        description: `${load.origin} → ${load.destination} dispatched to ${vehicle.unit_id} (${vehicle.model}).`,
      });
    } catch (err: any) {
      toast({
        title: "Could not assign load",
        description: err?.message ?? "Please refresh and try again.",
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
          {filtered.map((l) => (
            <article key={l.id} className="surface-2 rounded-xl p-6 ghost-shadow flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="pill pill-active">{l.load_type}</span>
                    <span>·</span>
                    <span>{(Number(l.weight_kg) / 1000).toFixed(1)} t</span>
                  </div>
                  <h3 className="font-display text-xl font-bold mt-2">
                    {l.origin} <ArrowRight className="inline h-4 w-4 mx-1 text-muted-foreground" /> {l.destination}
                  </h3>
                </div>
                <div className="text-right">
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
                <Detail icon={MapPin} label="Pickup" value={l.origin} />
                <Detail
                  icon={Gauge}
                  label="Pickup Time"
                  value={formatDateTime(l.pickup_time)}
                />
                <Detail icon={MapPin} label="Delivery" value={l.destination} />
                <Detail
                  icon={Gauge}
                  label="Dropoff Time"
                  value={formatDateTime(l.dropoff_time)}
                />
              </div>

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
          ))}
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
function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="label-eyebrow">{k}</div>
      <div className={`font-display font-semibold mt-1 font-mono-data ${accent ? "text-primary" : ""}`}>{v}</div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-md surface-3 grid place-items-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="label-eyebrow">{label}</div>
        <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}
