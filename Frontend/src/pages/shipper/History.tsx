import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Package, Calendar, LayoutGrid, List, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DRY_GOODS_CATEGORIES, normalizeDryGoodsCargo, normalizeDryGoodsCategory } from "@/lib/dry-goods";
import { LoadMindLoader } from "@/components/LoadMindLoader";

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
  pickup_time: string;
  dropoff_time: string;
  completed_at: string | null;
  created_at: string;
};

const PAGE = 6;
type DateFilter = "all" | "7_days" | "30_days" | "this_month";

export default function ShipmentHistory() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(0);
  const [routeQuery, setRouteQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setShipments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let completionTimer: number | undefined;
    setLoading(true);

    supabase
      .from("loads")
      .select("*")
      .eq("shipper_id", user.id)
      .eq("status", "delivered")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setShipments((data ?? []) as Shipment[]);
      })
      .finally(() => {
        if (cancelled) return;
        completionTimer = window.setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 360);
      });

    return () => {
      cancelled = true;
      if (completionTimer) window.clearTimeout(completionTimer);
    };
  }, [user]);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter, dateFilter, routeQuery]);

  const filteredShipments = useMemo(() => {
    const query = routeQuery.trim().toLowerCase();
    const minDate = getDateFilterStart(dateFilter);

    return shipments.filter((shipment) => {
      if (query) {
        const routeText = `${shipment.origin} ${shipment.destination}`.toLowerCase();
        if (!routeText.includes(query)) return false;
      }

      if (categoryFilter !== "all" && normalizeDryGoodsCategory(shipment.load_type) !== categoryFilter) {
        return false;
      }

      if (minDate) {
        const timestamp = getShipmentDate(shipment).getTime();
        if (Number.isNaN(timestamp) || timestamp < minDate.getTime()) return false;
      }

      return true;
    });
  }, [categoryFilter, dateFilter, routeQuery, shipments]);

  const slice = filteredShipments.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filteredShipments.length / PAGE));
  const stats = useMemo(() => getHistoryStats(shipments), [shipments]);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · ARCHIVE</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Shipment History</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Shipment records, committed costs, and delivery performance.</p>
      </div>

      {loading && (
        <div className="surface-2 rounded-xl p-8 ghost-shadow">
          <LoadMindLoader
            label="Loading shipment history"
            detail="Collecting archived loads and delivery records"
          />
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <HistoryStat label="Fulfilled Loads" value={stats.total.toLocaleString("en-AU")} />
            <HistoryStat label="Total Shipping Cost" value={formatCurrency(stats.totalCost)} />
            <HistoryStat label="Avg Delivery Time" value={stats.averageDeliveryHours == null ? "--" : `${stats.averageDeliveryHours.toFixed(1)} h`} />
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[80px_minmax(220px,1fr)_170px_145px_auto]">
            <div
              className="relative grid h-9 w-20 grid-cols-2 rounded-md surface-2 p-1"
              role="tablist"
              aria-label="Shipment history view"
            >
              <div
                className={`absolute left-1 top-1 h-7 w-[calc(50%-0.25rem)] rounded-[4px] bg-white lift-shadow transition-transform duration-200 ease-out ${
                  view === "grid" ? "translate-x-full" : "translate-x-0"
                }`}
                aria-hidden="true"
              />
              <button
                type="button"
                role="tab"
                aria-selected={view === "list"}
                onClick={() => setView("list")}
                className={`relative z-10 grid h-7 w-9 place-items-center rounded-[4px] transition-colors duration-200 ${
                  view === "list" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "grid"}
                onClick={() => setView("grid")}
                className={`relative z-10 grid h-7 w-9 place-items-center rounded-[4px] transition-colors duration-200 ${
                  view === "grid" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <div className="flex h-9 min-w-0 items-center gap-2 rounded-md surface-2 px-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={routeQuery}
                onChange={(event) => setRouteQuery(event.target.value)}
                placeholder="Filter route..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-9 w-full rounded-md surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {DRY_GOODS_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="flex h-9 min-w-0 items-center gap-2 rounded-md surface-2 px-3">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Filter by date range"
              >
                <option value="all">All dates</option>
                <option value="7_days">Last 7 days</option>
                <option value="30_days">Last 30 days</option>
                <option value="this_month">This month</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setRouteQuery("");
                setCategoryFilter("all");
                setDateFilter("all");
              }}
              className="h-9 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-background/60 hover:text-foreground"
            >
              Reset
            </button>
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
                      {formatShipmentDate(s)}
                    </span>
                    <span className="pill pill-on-time">{formatStatus(s.status)}</span>
                  </div>
                  <div className="font-display text-base font-semibold mt-1.5 truncate">
                    {s.origin} → {s.destination}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {normalizeDryGoodsCargo(s.cargo, s.load_type)} · {s.assigned_carrier_name ?? "Carrier pending"} · {(Number(s.weight_kg) / 1000).toFixed(1)} t
                  </div>
                </div>
                <div className="text-right">
                  <div className="label-eyebrow">NET MARGIN</div>
                  <span className="pill pill-on-time mt-1 font-display text-base font-bold">${Number(s.net_margin || 0).toLocaleString()}</span>
                </div>
              </article>
            ))}
            {slice.length === 0 && (
              <div className="surface-2 rounded-xl p-10 text-center text-sm text-muted-foreground">
                {shipments.length === 0 ? "No fulfilled shipments yet." : "No fulfilled shipments match the current filters."}
              </div>
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
        </>
      )}
    </div>
  );
}

function getHistoryStats(shipments: Shipment[]) {
  const totalCost = shipments
    .reduce((sum, shipment) => sum + Number(shipment.net_margin ?? 0), 0);
  const deliveryDurations = shipments
    .map((shipment) => {
      const pickup = new Date(shipment.pickup_time).getTime();
      const delivered = new Date(shipment.completed_at ?? shipment.dropoff_time).getTime();
      if (Number.isNaN(pickup) || Number.isNaN(delivered) || delivered <= pickup) return null;
      return (delivered - pickup) / 36e5;
    })
    .filter((hours): hours is number => hours != null);
  const averageDeliveryHours =
    deliveryDurations.length === 0
      ? null
      : deliveryDurations.reduce((sum, hours) => sum + hours, 0) / deliveryDurations.length;

  return {
    total: shipments.length,
    totalCost,
    averageDeliveryHours,
  };
}

function formatCurrency(value: number) {
  return `AUD ${Math.round(value).toLocaleString("en-AU")}`;
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-2 rounded-xl ghost-shadow p-4">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold font-mono-data">{value}</div>
    </div>
  );
}

function getShipmentDate(shipment: Shipment) {
  return new Date(shipment.completed_at ?? shipment.dropoff_time ?? shipment.created_at);
}

function getDateFilterStart(filter: DateFilter) {
  const now = new Date();
  if (filter === "7_days") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  }
  if (filter === "30_days") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }
  if (filter === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function formatShipmentDate(shipment: Shipment) {
  const date = getShipmentDate(shipment);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" });
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
