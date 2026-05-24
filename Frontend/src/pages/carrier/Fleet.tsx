import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Truck, Edit3, X, Loader2, Trash2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { confirmLoadDelivery, confirmLoadPickup } from "@/lib/loads-api";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { geocodeLocation } from "@/lib/geo";
import { normalizeDryGoodsCategory } from "@/lib/dry-goods";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Trailer = {
  length_m: number;
  width_m: number;
  height_m: number;
  capacity_t: number;
};

type Vehicle = {
  id: string;
  unit_id: string;
  driver_name: string;
  model: string;
  year: number;
  capacity_t: number;
  fuel_efficiency: number;
  status: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  preferred_routes: string[] | null;
  trailers?: Trailer[] | null;
};

type AssignedLoad = {
  id: string;
  origin: string;
  destination: string;
  load_type: string;
  pickup_time: string;
  dropoff_time: string;
  status: string;
  pickup_confirmed_by_carrier_at: string | null;
  delivered_confirmed_by_carrier_at: string | null;
  assigned_vehicle_unit: string | null;
  assigned_at: string | null;
  value: number;
};

const lastJourneyByUnit: Record<string, string> = {
  UNIT_BAL_12: "MEL → ADL · 2d ago",
  UNIT_GEE_04: "GEE → MEL · 6h ago",
  UNIT_MEL_01: "MEL → BNE · 1d ago",
  UNIT_ALB_22: "ALB → SYD · in transit",
};

export default function FleetManagement() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignedLoads, setAssignedLoads] = useState<AssignedLoad[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [actingLoadId, setActingLoadId] = useState<string | null>(null);

  const refreshAssignedLoads = useCallback(() => {
    if (!user) {
      setAssignedLoads([]);
      return;
    }

    supabase
      .from("loads")
      .select("id, origin, destination, load_type, pickup_time, dropoff_time, status, pickup_confirmed_by_carrier_at, delivered_confirmed_by_carrier_at, assigned_vehicle_unit, assigned_at, value")
      .eq("assigned_carrier_id", user.id)
      .in("status", ["scheduled", "in_transit"])
      .order("assigned_at", { ascending: false })
      .then(({ data }) => setAssignedLoads((data ?? []) as AssignedLoad[]));
  }, [user]);

  const refresh = () =>
    supabase.from("vehicles").select("*").order("unit_id").then(({ data }) => {
      const list = (data ?? []) as unknown as Vehicle[];
      setVehicles(list);
      if (!selected && list[0]) setSelected(list[0]);
    });

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  useEffect(() => {
    refreshAssignedLoads();
  }, [refreshAssignedLoads]);

  const handleConfirm = async (load: AssignedLoad) => {
    setActingLoadId(load.id);
    try {
      if (load.status === "scheduled") {
        await confirmLoadPickup(load.id);
        toast({
          title: "Pickup confirmation sent",
          description: "Load moves to in transit once the shipper also confirms.",
        });
      } else {
        await confirmLoadDelivery(load.id);
        toast({
          title: "Delivery confirmation sent",
          description: "Load closes when shipper confirmation is also in.",
        });
      }
      refreshAssignedLoads();
      refresh();
    } catch (err: unknown) {
      toast({
        title: "Could not update lifecycle",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActingLoadId(null);
    }
  };

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-2">FLEET COMMAND</div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">Asset Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Register, configure, and decommission prime movers.</p>
        </div>
        <button
          onClick={() => setRegisterOpen(true)}
          className="btn-primary-gradient h-11 px-5 rounded-md text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Register New Vehicle
        </button>
      </div>

      <RegisterVehicleDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSaved={refresh}
      />

      <RegisterVehicleDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={(updated) => {
          refresh();
          if (updated) setSelected(updated);
        }}
        vehicle={editing}
      />

      <section className="surface-2 rounded-xl ghost-shadow overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="label-eyebrow">ACTIVE ASSETS</div>
            <h2 className="font-display text-lg font-bold mt-0.5">{vehicles.length} prime movers</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="surface-3">
              <tr className="text-left">
                {["Vehicle", "Unit ID", "Model / Year", "Driver", "Last Journey", ""].map((h) => (
                  <th key={h} className="label-eyebrow font-semibold text-muted-foreground py-3 px-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => {
                const isSel = selected?.id === v.id;
                return (
                  <tr
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={`cursor-pointer transition ${isSel ? "bg-accent" : idx % 2 === 0 ? "bg-surface-lowest" : ""} hover:bg-accent/60`}
                  >
                    <td className="px-5 py-4">
                      <div className="h-12 w-16 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
                        <Truck className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </td>
                    <td className="px-5 py-4 font-display font-semibold">{v.unit_id}</td>
                    <td className="px-5 py-4">
                      <div>{v.model}</div>
                      <div className="text-xs text-muted-foreground">{v.year}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div>{v.driver_name}</div>
                      <span className="pill mt-1 pill-on-time">Assigned</span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{lastJourneyByUnit[v.unit_id] ?? "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(v);
                        }}
                        className="h-8 w-8 rounded-md grid place-items-center hover:surface-3"
                        aria-label={`Edit ${v.unit_id}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-2 rounded-xl ghost-shadow overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="label-eyebrow">ASSIGNED LOADS</div>
            <h2 className="font-display text-lg font-bold mt-0.5">Scheduled on your fleet</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="surface-3">
              <tr className="text-left">
                {[
                  "Route",
                  "Type",
                  "Status",
                  "Truck",
                  "Pickup",
                  "Dropoff",
                  "Value",
                  "Action",
                ].map((h, i) => (
                  <th key={h} className={`label-eyebrow font-semibold text-muted-foreground py-3 px-5 ${i === 6 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignedLoads.map((l, idx) => (
                <tr key={l.id} className={idx % 2 === 0 ? "bg-surface-lowest" : ""}>
                  <td className="px-5 py-4 font-medium">{l.origin} → {l.destination}</td>
                  <td className="px-5 py-4">{normalizeDryGoodsCategory(l.load_type)}</td>
                  <td className="px-5 py-4">
                    <span className={`pill ${l.status === "in_transit" ? "pill-active" : "pill-on-time"}`}>
                      {l.status === "in_transit" ? "In Transit" : "Scheduled"}
                    </span>
                  </td>
                  <td className="px-5 py-4">{l.assigned_vehicle_unit ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(l.pickup_time).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(l.dropoff_time).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-4 text-right font-display font-semibold font-mono-data">${Number(l.value).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      disabled={
                        actingLoadId === l.id ||
                        (l.status === "scheduled" && !!l.pickup_confirmed_by_carrier_at) ||
                        (l.status === "in_transit" && !!l.delivered_confirmed_by_carrier_at)
                      }
                      onClick={() => handleConfirm(l)}
                      className="h-9 px-3 rounded-md surface-2 text-xs font-semibold disabled:opacity-50"
                    >
                      {l.status === "scheduled"
                        ? (l.pickup_confirmed_by_carrier_at ? "Pickup Confirmed" : "Confirm Pickup")
                        : (l.delivered_confirmed_by_carrier_at ? "Delivery Confirmed" : "Confirm Delivery")}
                    </button>
                  </td>
                </tr>
              ))}
              {assignedLoads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No loads assigned yet.
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

const trailerSchema = z.object({
  length_m: z.coerce.number().positive("Must be > 0").max(50, "Max 50 m"),
  width_m: z.coerce.number().positive("Must be > 0").max(10, "Max 10 m"),
  height_m: z.coerce.number().positive("Must be > 0").max(10, "Max 10 m"),
  capacity_t: z.coerce.number().positive("Must be > 0").max(200, "Max 200 t"),
});

const vehicleSchema = z.object({
  unit_id: z.string().trim().min(2, "Unit ID is required").max(40, "Max 40 chars")
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, _ and - only"),
  driver_name: z.string().trim().min(2, "Driver name is required").max(80, "Max 80 chars"),
  model: z.string().trim().min(2, "Model is required").max(80, "Max 80 chars"),
  fuel_efficiency: z.coerce.number().positive("Must be > 0").max(100, "Max 100 km/L"),
  location: z.string().trim().max(240, "Max 240 chars").optional(),
  preferred_routes: z.string().trim().max(200, "Max 200 chars").optional(),
  trailers: z.array(trailerSchema).min(1, "Add at least 1 trailer").max(2, "Max 2 trailers"),
});

type TrailerForm = { length_m: string; width_m: string; height_m: string; capacity_t: string };

const emptyTrailer = (): TrailerForm => ({ length_m: "", width_m: "", height_m: "", capacity_t: "" });

function RegisterVehicleDialog({
  open,
  onOpenChange,
  onSaved,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (updated?: Vehicle) => void;
  vehicle?: Vehicle | null;
}) {
  const { user } = useAuth();
  const isEdit = !!vehicle;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [form, setForm] = useState({
    unit_id: "",
    driver_name: "",
    model: "",
    fuel_efficiency: "",
    location: "",
    preferred_routes: "",
  });
  const [trailers, setTrailers] = useState<TrailerForm[]>([emptyTrailer()]);

  const reset = () => {
    setForm({
      unit_id: "",
      driver_name: "",
      model: "",
      fuel_efficiency: "",
      location: "",
      preferred_routes: "",
    });
    setTrailers([emptyTrailer()]);
    setErrors({});
  };

  // Hydrate when opening in edit mode (or reset for create)
  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      setForm({
        unit_id: vehicle.unit_id ?? "",
        driver_name: vehicle.driver_name ?? "",
        model: vehicle.model ?? "",
        fuel_efficiency: vehicle.fuel_efficiency != null ? String(vehicle.fuel_efficiency) : "",
        location: vehicle.location ?? "",
        preferred_routes: (vehicle.preferred_routes ?? []).join(", "),
      });
      const tr = (vehicle.trailers ?? []) as Trailer[];
      setTrailers(
        tr.length > 0
          ? tr.slice(0, 2).map((t) => ({
              length_m: String(t.length_m ?? ""),
              width_m: String(t.width_m ?? ""),
              height_m: String(t.height_m ?? ""),
              capacity_t: String(t.capacity_t ?? ""),
            }))
          : [emptyTrailer()],
      );
      setErrors({});
    } else {
      reset();
    }
  }, [open, vehicle]);

  const updateTrailer = (idx: number, key: keyof TrailerForm, value: string) => {
    setTrailers((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };

  const addTrailer = () => {
    if (trailers.length >= 2) return;
    setTrailers((prev) => [...prev, emptyTrailer()]);
  };

  const removeTrailer = (idx: number) => {
    if (trailers.length <= 1) return;
    setTrailers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = vehicleSchema.safeParse({ ...form, trailers });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path.join(".");
        if (!fieldErrors[k]) fieldErrors[k] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const routes = parsed.data.preferred_routes
      ? parsed.data.preferred_routes.split(",").map((r) => r.trim()).filter(Boolean)
      : [];
    const locationText = parsed.data.location?.trim() || "";
    const geocodedLocation = locationText ? await geocodeLocation(locationText) : null;

    if (locationText && !geocodedLocation) {
      toast({
        title: "Could not resolve GPS from location",
        description: "Address saved, but lat/lng could not be derived for this vehicle.",
      });
    }

    const totalCapacity = parsed.data.trailers.reduce((sum, t) => sum + t.capacity_t, 0);

    const payload = {
      unit_id: parsed.data.unit_id,
      driver_name: parsed.data.driver_name,
      model: parsed.data.model,
      capacity_t: totalCapacity,
      fuel_efficiency: parsed.data.fuel_efficiency,
      location: locationText || null,
      lat: geocodedLocation?.lat ?? null,
      lng: geocodedLocation?.lng ?? null,
      preferred_routes: routes,
      trailers: parsed.data.trailers,
    };

    let savedVehicle: Vehicle | undefined;
    let error: { message: string } | null = null;

    if (isEdit && vehicle) {
      const res = await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", vehicle.id)
        .select()
        .maybeSingle();
      error = res.error;
      if (res.data) savedVehicle = res.data as unknown as Vehicle;
    } else {
      const res = await supabase
        .from("vehicles")
        .insert({
          ...payload,
          owner_id: user.id,
          year: new Date().getFullYear(),
          status: "idle",
        })
        .select()
        .maybeSingle();
      error = res.error;
      if (res.data) savedVehicle = res.data as unknown as Vehicle;
    }

    setSubmitting(false);

    if (error) {
      toast({
        title: isEdit ? "Could not update vehicle" : "Could not register vehicle",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isEdit ? "Vehicle updated" : "Vehicle registered",
      description: `${parsed.data.unit_id} ${isEdit ? "saved" : "added to your fleet"}.`,
    });
    if (!isEdit) reset();
    onOpenChange(false);
    onSaved(savedVehicle);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-2 max-w-xl p-0 overflow-hidden border-0 max-h-[90vh] overflow-y-auto">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="label-eyebrow mb-2">FLEET COMMAND</div>
            <DialogTitle className="font-display text-2xl font-bold">
              {isEdit ? "Edit Vehicle" : "Register New Vehicle"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEdit
                ? `Update specs and trailer configuration for ${vehicle?.unit_id}.`
                : "Add a prime mover to your fleet. It will become eligible for AI matching immediately."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Unit ID"
              placeholder="UNIT_MEL_07"
              value={form.unit_id}
              onChange={(v) => setForm({ ...form, unit_id: v })}
              error={errors.unit_id}
              maxLength={40}
            />
            <Field
              label="Model"
              placeholder="Kenworth T610"
              value={form.model}
              onChange={(v) => setForm({ ...form, model: v })}
              error={errors.model}
              maxLength={80}
            />
            <Field
              label="Driver"
              placeholder="M. O'Connor"
              value={form.driver_name}
              onChange={(v) => setForm({ ...form, driver_name: v })}
              error={errors.driver_name}
              maxLength={80}
            />
            <Field
              label="Fuel Efficiency (km/L)"
              type="number"
              placeholder="3.4"
              value={form.fuel_efficiency}
              onChange={(v) => setForm({ ...form, fuel_efficiency: v })}
              error={errors.fuel_efficiency}
            />
            <Field
              label="Current Location"
              placeholder="Melbourne, VIC"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              error={errors.location}
              maxLength={240}
              action={
                <button
                  type="button"
                  onClick={() => setLocationPickerOpen(true)}
                  className="absolute right-1 top-1 h-8 rounded-[4px] px-2.5 text-xs font-semibold flex items-center gap-1.5 transition hover:bg-primary/10 hover:text-primary"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map
                </button>
              }
              addressAutocomplete
            />
          </div>

          <LocationPickerDialog
            open={locationPickerOpen}
            onOpenChange={setLocationPickerOpen}
            value={form.location}
            onConfirm={(location) => setForm((current) => ({ ...current, location }))}
          />

          <Field
            label="Preferred Routes"
            placeholder="MEL → SYD, MEL → ADL"
            value={form.preferred_routes}
            onChange={(v) => setForm({ ...form, preferred_routes: v })}
            error={errors.preferred_routes}
            hint="Comma separated lanes (optional)"
            maxLength={200}
          />

          {/* Trailers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="label-eyebrow">TRAILERS</div>
                <p className="text-xs text-muted-foreground mt-0.5">Add 1 or 2 trailers attached to this prime mover.</p>
              </div>
              <button
                type="button"
                onClick={addTrailer}
                disabled={trailers.length >= 2}
                className="h-8 px-3 rounded-md surface-3 text-xs font-semibold flex items-center gap-1.5 hover:lift-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" /> Add trailer
              </button>
            </div>

            {errors["trailers"] && (
              <p className="text-xs text-destructive">{errors["trailers"]}</p>
            )}

            {trailers.map((t, idx) => (
              <div key={idx} className="surface-3 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-display text-sm font-semibold">Trailer {idx + 1}</div>
                  {trailers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTrailer(idx)}
                      className="h-7 w-7 rounded-md grid place-items-center hover:bg-destructive/10 text-destructive"
                      aria-label="Remove trailer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field
                    label="Length (m)"
                    type="number"
                    placeholder="13.6"
                    value={t.length_m}
                    onChange={(v) => updateTrailer(idx, "length_m", v)}
                    error={errors[`trailers.${idx}.length_m`]}
                  />
                  <Field
                    label="Width (m)"
                    type="number"
                    placeholder="2.5"
                    value={t.width_m}
                    onChange={(v) => updateTrailer(idx, "width_m", v)}
                    error={errors[`trailers.${idx}.width_m`]}
                  />
                  <Field
                    label="Height (m)"
                    type="number"
                    placeholder="2.7"
                    value={t.height_m}
                    onChange={(v) => updateTrailer(idx, "height_m", v)}
                    error={errors[`trailers.${idx}.height_m`]}
                  />
                  <Field
                    label="Capacity (t)"
                    type="number"
                    placeholder="24"
                    value={t.capacity_t}
                    onChange={(v) => updateTrailer(idx, "capacity_t", v)}
                    error={errors[`trailers.${idx}.capacity_t`]}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-md surface-3 text-sm font-medium hover:lift-shadow flex items-center gap-2"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-gradient h-10 px-5 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Register Vehicle"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  hint,
  maxLength,
  action,
  addressAutocomplete = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  action?: ReactNode;
  addressAutocomplete?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="label-eyebrow block">{label}</label>
        {!addressAutocomplete && action}
      </div>
      {addressAutocomplete ? (
        <div className="relative">
          <AddressAutocompleteInput
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={onChange}
            className={`w-full h-10 px-3 rounded-md surface-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary transition ${
              action ? "pr-[5.25rem]" : ""
            } ${error ? "ring-destructive focus:ring-destructive" : ""}`}
          />
          {action}
        </div>
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 px-3 rounded-md surface-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary transition ${
            error ? "ring-destructive focus:ring-destructive" : ""
          }`}
        />
      )}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
