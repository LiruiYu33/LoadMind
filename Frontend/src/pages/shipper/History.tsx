import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Package, Filter, Calendar, LayoutGrid, List, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

type Shipment = {
  id: string;
  shipment_code: string | null;
  cargo: string | null;
  load_type: string;
  origin: string;
  destination: string;
  assigned_carrier_name: string | null;
  status: string;
  weight_kg: number;
  net_margin: number | null;
  completed_at: string | null;
  created_at: string;
};

const PAGE = 6;

export default function ShipmentHistory() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) {
      setShipments([]);
      return;
    }

    supabase
      .from("loads")
      .select("*")
      .eq("shipper_id", user.id)
      .eq("status", "delivered")
      .order("completed_at", { ascending: false })
      .then(({ data }) => setShipments((data ?? []) as Shipment[]));
  }, [user]);

  const slice = shipments.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(shipments.length / PAGE));

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · ARCHIVE</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Shipment History</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Completed deliveries and their margin performance.</p>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterPill icon={Filter} label="Route" />
        <FilterPill icon={Filter} label="Status" />
        <FilterPill icon={Calendar} label="Date range" />
        <div className="flex-1" />
        <div className="surface-2 rounded-md p-1 inline-flex">
          <button onClick={() => setView("list")} className={`h-8 w-8 grid place-items-center rounded-sm ${view === "list" ? "surface-3 text-primary" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button>
          <button onClick={() => setView("grid")} className={`h-8 w-8 grid place-items-center rounded-sm ${view === "grid" ? "surface-3 text-primary" : "text-muted-foreground"}`}><LayoutGrid className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Items */}
      <div className={view === "list" ? "space-y-3" : "grid sm:grid-cols-2 gap-3"}>
        {slice.map((s) => (
          <article key={s.id} className="surface-2 rounded-xl ghost-shadow p-5 flex flex-wrap items-center gap-5">
            <div className="h-12 w-12 rounded-md surface-3 grid place-items-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="pill pill-active">{s.shipment_code ?? `LM-${s.id.slice(0, 8).toUpperCase()}`}</span>
                <span className="text-xs text-muted-foreground">
                  {s.completed_at ? new Date(s.completed_at).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </span>
              </div>
              <div className="font-display text-base font-semibold mt-1.5 truncate">
                {s.origin} → {s.destination}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {s.cargo ?? s.load_type} · {s.assigned_carrier_name ?? "Carrier pending"} · {(Number(s.weight_kg) / 1000).toFixed(1)} t
              </div>
            </div>
            <div className="text-right">
              <div className="label-eyebrow">NET MARGIN</div>
              <span className="pill pill-on-time mt-1 font-display text-base font-bold">${Number(s.net_margin || 0).toLocaleString()}</span>
            </div>
          </article>
        ))}
        {slice.length === 0 && (
          <div className="surface-2 rounded-xl p-10 text-center text-sm text-muted-foreground">No completed shipments yet.</div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-9 w-9 rounded-md surface-2 grid place-items-center disabled:opacity-40" disabled={page === 0}><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="h-9 w-9 rounded-md surface-2 grid place-items-center disabled:opacity-40" disabled={page >= pages - 1}><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

function FilterPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="h-9 px-4 rounded-md surface-2 text-sm flex items-center gap-2 hover:lift-shadow transition">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </button>
  );
}
