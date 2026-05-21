import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { confirmLoadDelivery, confirmLoadPickup } from "@/lib/loads-api";
import { toast } from "@/hooks/use-toast";

type Shipment = {
  id: string;
  shipment_code: string | null;
  cargo: string | null;
  load_type: string;
  origin: string;
  destination: string;
  assigned_carrier_name: string | null;
  status: string;
  pickup_time: string;
  dropoff_time: string;
  pickup_confirmed_by_shipper_at: string | null;
  delivered_confirmed_by_shipper_at: string | null;
  value: number;
};

type MarketplaceLoad = {
  id: string;
  origin: string;
  destination: string;
  load_type: string;
  pickup_time: string;
  dropoff_time: string;
  status: string;
  value: number;
  created_at: string;
  assigned_vehicle_unit?: string | null;
  assigned_carrier_name?: string | null;
  assigned_at?: string | null;
};

type ActiveRow = {
  id: string;
  title: string;
  route: string;
  carrier: string | null;
  status: "in_transit" | "scheduled";
  eta: string | null;
  value: number;
  shipperPickupConfirmedAt: string | null;
  shipperDeliveredConfirmedAt: string | null;
};

export default function ShipperDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [postedLoads, setPostedLoads] = useState<MarketplaceLoad[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const refreshActive = useCallback(() => {
    if (!user) {
      setShipments([]);
      return;
    }

    supabase
      .from("loads")
      .select("id, shipment_code, cargo, load_type, origin, destination, assigned_carrier_name, status, pickup_time, dropoff_time, pickup_confirmed_by_shipper_at, delivered_confirmed_by_shipper_at, value")
      .eq("shipper_id", user.id)
      .in("status", ["scheduled", "in_transit"])
      .order("pickup_time", { ascending: true })
      .then(({ data }) => setShipments((data ?? []) as Shipment[]));
  }, [user]);

  useEffect(() => {
    refreshActive();
  }, [refreshActive]);

  useEffect(() => {
    if (!user) {
      setPostedLoads([]);
      return;
    }

    supabase
      .from("loads")
      .select("id, origin, destination, load_type, pickup_time, dropoff_time, status, value, created_at")
      .eq("shipper_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPostedLoads((data ?? []) as MarketplaceLoad[]));
  }, [user]);

  const active = useMemo<ActiveRow[]>(() => {
    return shipments
      .filter((s) => s.status === "scheduled" || s.status === "in_transit")
      .map((s) => ({
        id: s.id,
        title: `${s.shipment_code ?? `LM-${s.id.slice(0, 8).toUpperCase()}`} · ${s.cargo ?? s.load_type}`,
        route: `${s.origin} → ${s.destination}`,
        carrier: s.assigned_carrier_name ?? "Carrier pending",
        status: (s.status === "in_transit" ? "in_transit" : "scheduled") as "in_transit" | "scheduled",
        eta: s.status === "in_transit" ? s.dropoff_time : s.pickup_time,
        value: s.value,
        shipperPickupConfirmedAt: s.pickup_confirmed_by_shipper_at,
        shipperDeliveredConfirmedAt: s.delivered_confirmed_by_shipper_at,
      }))
      .slice(0, 10);
  }, [shipments]);

  const handleConfirm = async (row: ActiveRow) => {
    setActingId(row.id);
    try {
      if (row.status === "scheduled") {
        await confirmLoadPickup(row.id);
        toast({
          title: "Pickup confirmation sent",
          description: "Status will move to In Transit once the carrier also confirms.",
        });
      } else {
        await confirmLoadDelivery(row.id);
        toast({
          title: "Delivery confirmation sent",
          description: "Load moves to history once the carrier also confirms.",
        });
      }
      refreshActive();
    } catch (err: unknown) {
      toast({
        title: "Could not update lifecycle",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · MARKETPLACE</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Welcome back to LoadMind</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Your freight, optimized through verified Australian carriers.</p>
      </div>

      {/* Active shipments */}
      <section className="surface-2 rounded-xl ghost-shadow overflow-hidden">
        <div className="p-6 flex items-end justify-between">
          <div>
            <div className="label-eyebrow">ACTIVE SHIPMENTS</div>
            <h2 className="font-display text-xl font-bold mt-0.5">In transit & scheduled</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="surface-3">
              <tr className="text-left">
                {["Shipment & Route", "Carrier", "Status", "ETA", "Value", "Action"].map((h, i) => (
                  <th key={h} className={`label-eyebrow font-semibold text-muted-foreground py-3 px-6 ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((s, idx) => (
                <tr key={s.id} className={idx % 2 === 0 ? "bg-surface-lowest" : ""}>
                  <td className="px-6 py-4">
                    <div className="font-display font-semibold">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.route}</div>
                  </td>
                  <td className="px-6 py-4">{s.carrier}</td>
                  <td className="px-6 py-4">
                    <span className={`pill ${s.status === "in_transit" ? "pill-active" : "pill-on-time"}`}>
                      {s.status === "in_transit" ? "In Transit" : "Scheduled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {s.eta ? new Date(s.eta).toLocaleDateString("en-AU", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-display font-semibold font-mono-data">${Number(s.value).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      disabled={
                        actingId === s.id ||
                        (s.status === "scheduled" && !!s.shipperPickupConfirmedAt) ||
                        (s.status === "in_transit" && !!s.shipperDeliveredConfirmedAt)
                      }
                      onClick={() => handleConfirm(s)}
                      className="h-9 px-3 rounded-md surface-2 text-xs font-semibold disabled:opacity-50"
                    >
                      {s.status === "scheduled"
                        ? (s.shipperPickupConfirmedAt ? "Pickup Confirmed" : "Confirm Pickup")
                        : (s.shipperDeliveredConfirmedAt ? "Delivery Confirmed" : "Confirm Delivery")}
                    </button>
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No active shipments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Posted marketplace loads (not scheduled/in transit yet) */}
      <section className="surface-2 rounded-xl ghost-shadow overflow-hidden">
        <div className="p-6 flex items-end justify-between">
          <div>
            <div className="label-eyebrow">MARKETPLACE POSTED LOADS</div>
            <h2 className="font-display text-xl font-bold mt-0.5">Waiting for Carrier</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="surface-3">
              <tr className="text-left">
                {[
                  "Route",
                  "Type",
                  "Pickup",
                  "Dropoff",
                  "Status",
                  "Value",
                ].map((h, i) => (
                  <th key={h} className={`label-eyebrow font-semibold text-muted-foreground py-3 px-6 ${i === 5 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {postedLoads.map((l, idx) => (
                <tr key={l.id} className={idx % 2 === 0 ? "bg-surface-lowest" : ""}>
                  <td className="px-6 py-4 font-medium">{l.origin} → {l.destination}</td>
                  <td className="px-6 py-4">{l.load_type}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(l.pickup_time).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(l.dropoff_time).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="pill pill-on-time">Open</span>
                  </td>
                  <td className="px-6 py-4 text-right font-display font-semibold font-mono-data">
                    ${Number(l.value).toLocaleString()}
                  </td>
                </tr>
              ))}
              {postedLoads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No posted marketplace loads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
