import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { createLoad, suggestPrice } from "@/lib/loads-api";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { Package, MapPin, FileImage, Upload, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DRY_GOODS_CATEGORIES } from "@/lib/dry-goods";

export default function PostShipment() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [locationPicker, setLocationPicker] = useState<"origin" | "destination" | null>(null);
  const [form, setForm] = useState({
    cargo: "",
    category: DRY_GOODS_CATEGORIES[0],
    weight: "",
    length: "",
    width: "",
    height: "",
    origin: "",
    destination: "",
    pickupTime: "",
    dropoffTime: "",
  });

  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [pureDrivingHours, setPureDrivingHours] = useState<number | null>(null);
  const [actualDurationHours, setActualDurationHours] = useState<number | null>(null);
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [editedPrice, setEditedPrice] = useState<string>("");
  const [priceAccepted, setPriceAccepted] = useState(false);

  const formatAudPrice = (value: number) => `AUD ${Math.round(value).toLocaleString("en-AU")}`;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setValue = (k: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [k]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!priceAccepted) {
      toast({ title: "Accept a price", description: "Please accept a suggested or modified price before posting.", variant: "destructive" });
      return;
    }
    const pickupTime = new Date(form.pickupTime);
    const dropoffTime = new Date(form.dropoffTime);

    if (
      Number.isNaN(pickupTime.getTime()) ||
      Number.isNaN(dropoffTime.getTime())
    ) {
      toast({ title: "Invalid times", description: "Please provide valid pickup and dropoff times.", variant: "destructive" });
      return;
    }

    if (dropoffTime <= pickupTime) {
      toast({ title: "Time sequence invalid", description: "Dropoff time must be after pickup time.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const weight = Number(form.weight) || 0;
      await createLoad({
        cargo: form.cargo,
        origin: form.origin,
        destination: form.destination,
        weight_kg: weight,
        load_type: form.category,
        value: editedPrice ? Number(editedPrice) : suggestedPrice ?? undefined,
        length_cm: form.length ? Number(form.length) : null,
        width_cm: form.width ? Number(form.width) : null,
        height_cm: form.height ? Number(form.height) : null,
        pickup_time: pickupTime.toISOString(),
        dropoff_time: dropoffTime.toISOString(),
        shipment_code: `SH-${Date.now().toString(36).toUpperCase()}`,
      });
      toast({ title: "Shipment posted", description: "Your load is now live in the carrier marketplace." });
      nav("/shipper");
    } catch (err: unknown) {
      toast({
        title: "Could not post",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const fetchPriceSuggestion = async () => {
    // basic validation
    if (!form.origin || !form.destination || !form.weight || !form.pickupTime || !form.dropoffTime) {
      toast({ title: "Incomplete data", description: "Please fill origin, destination, weight and times to get a price suggestion.", variant: "destructive" });
      return;
    }
    setSuggestionLoading(true);
    setSuggestionError(null);
    try {
      const resp = await suggestPrice({
        cargo: form.cargo,
        origin: form.origin,
        destination: form.destination,
        weight_kg: Number(form.weight) || 0,
        load_type: form.category,
        length_cm: form.length ? Number(form.length) : null,
        width_cm: form.width ? Number(form.width) : null,
        height_cm: form.height ? Number(form.height) : null,
        pickup_time: new Date(form.pickupTime).toISOString(),
        dropoff_time: new Date(form.dropoffTime).toISOString(),
      });
      setSuggestedPrice(resp.suggested_price);
      setDistanceMiles(resp.distance_miles ?? null);
      setPureDrivingHours(resp.pure_driving_hours ?? null);
      setActualDurationHours(resp.actual_duration_hours ?? null);
      setEditedPrice(String(Math.round(resp.suggested_price)));
      setSuggestionReason(resp.reasoning ?? null);
      setSuggestionError(null);
      setPriceAccepted(false);
      toast({ title: "Price suggested", description: "AI suggested a marketplace price." });
    } catch (err: unknown) {
      const fallbackMessage =
        "AI price suggestion is currently unavailable. Enter a shipment value manually and tick the price acceptance box to continue.";
      setSuggestedPrice(null);
      setDistanceMiles(null);
      setPureDrivingHours(null);
      setActualDurationHours(null);
      setSuggestionReason(fallbackMessage);
      setSuggestionError(fallbackMessage);
      setPriceAccepted(false);
      toast({
        title: "Use manual price",
        description: err instanceof Error ? `${fallbackMessage} (${err.message})` : fallbackMessage,
        variant: "destructive",
      });
    } finally {
      setSuggestionLoading(false);
    }
  };


  const suggestedPriceLabel = suggestedPrice == null ? "No price yet" : formatAudPrice(suggestedPrice);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · NEW LISTING</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Post a Shipment</h1>
        <p className="text-sm text-muted-foreground mt-1.5">List freight to LoadMind's verified carrier marketplace.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,880px)_340px] items-start">
        <div className="min-w-0">
          <form onSubmit={submit} className="space-y-6 w-full max-w-3xl">
        
        {/* 1 — Cargo */}
        <Section number="01" icon={Package} title="Cargo Details">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Item Description" required>
              <input required value={form.cargo} onChange={set("cargo")} placeholder="e.g. Palletized non-perishable groceries" className="loadmind-input" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={set("category")} className="loadmind-input">
                {DRY_GOODS_CATEGORIES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Weight (kg)" required>
              <input required type="number" value={form.weight} onChange={set("weight")} placeholder="24000" className="loadmind-input" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="L (cm)"><input value={form.length} onChange={set("length")} className="loadmind-input" /></Field>
              <Field label="W (cm)"><input value={form.width} onChange={set("width")} className="loadmind-input" /></Field>
              <Field label="H (cm)"><input value={form.height} onChange={set("height")} className="loadmind-input" /></Field>
            </div>
          </div>
        </Section>

        {/* 2 — Route */}
        <Section number="02" icon={MapPin} title="Route Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Pickup Location"
              required
              action={
                <button
                  type="button"
                  onClick={() => setLocationPicker("origin")}
                  className="h-7 px-2.5 rounded-md surface-3 text-xs font-semibold flex items-center gap-1.5 hover:lift-shadow"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map
                </button>
              }
            >
              <AddressAutocompleteInput
                required
                value={form.origin}
                onChange={(value) => setValue("origin", value)}
                placeholder="Melbourne, VIC"
                maxLength={240}
                className="loadmind-input"
              />
            </Field>
            <Field
              label="Delivery Location"
              required
              action={
                <button
                  type="button"
                  onClick={() => setLocationPicker("destination")}
                  className="h-7 px-2.5 rounded-md surface-3 text-xs font-semibold flex items-center gap-1.5 hover:lift-shadow"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map
                </button>
              }
            >
              <AddressAutocompleteInput
                required
                value={form.destination}
                onChange={(value) => setValue("destination", value)}
                placeholder="Sydney, NSW"
                maxLength={240}
                className="loadmind-input"
              />
            </Field>
            <Field label="Pickup Time" required>
              <input required type="datetime-local" value={form.pickupTime} onChange={set("pickupTime")} className="loadmind-input" />
            </Field>
            <Field label="Dropoff Time" required>
              <input required type="datetime-local" value={form.dropoffTime} onChange={set("dropoffTime")} min={form.pickupTime || undefined} className="loadmind-input" />
            </Field>
          </div>

          <LocationPickerDialog
            open={locationPicker === "origin"}
            onOpenChange={(open) => !open && setLocationPicker(null)}
            value={form.origin}
            onConfirm={(location) => {
              setValue("origin", location);
              setLocationPicker(null);
            }}
          />
          <LocationPickerDialog
            open={locationPicker === "destination"}
            onOpenChange={(open) => !open && setLocationPicker(null)}
            value={form.destination}
            onConfirm={(location) => {
              setValue("destination", location);
              setLocationPicker(null);
            }}
          />
        </Section>

        {/* 3 — Documentation */}
        <Section number="03" icon={FileImage} title="Cargo Documentation">
          <div className="grid sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <button type="button" key={i} className="aspect-[4/3] surface-3 rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:lift-shadow transition">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload photo {i}</span>
              </button>
            ))}
          </div>
        </Section>

        <button type="submit" disabled={busy} className="btn-primary-gradient h-12 px-6 rounded-md text-sm font-semibold flex items-center justify-center gap-2 w-full lg:w-auto">
          {busy ? "Posting…" : <>Post Listing to Marketplace <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
        </div>

        <aside className="w-full xl:sticky xl:top-6 space-y-4">
          <div className="surface-2 rounded-xl ghost-shadow p-6">
            <div className="font-display text-sm font-bold mb-2">PRICE INSIGHTS</div>
            <div className="text-xs text-muted-foreground mb-3">Suggested Marketplace Price</div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Suggested price</div>
              <div className="mt-1 text-3xl font-display font-bold text-foreground">{suggestedPriceLabel}</div>
            </div>
            <label className="mb-3 block">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Edit price</div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground">AUD</span>
                <input
                  type="number"
                  step="1"
                  value={editedPrice}
                  onChange={(e) => { setEditedPrice(e.target.value); setPriceAccepted(false); }}
                  placeholder="0"
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                />
              </div>
            </label>
            <div className="mb-3">
              <button type="button" onClick={fetchPriceSuggestion} disabled={suggestionLoading} className="w-full h-10 rounded-md surface-3 font-semibold">
                {suggestionLoading ? "Working…" : "Get AI Recommendation"}
              </button>
            </div>
            {suggestionError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                {suggestionError}
              </div>
            ) : null}
            <div className="mb-3">
              <button type="button" onClick={() => { if (suggestedPrice != null) { setEditedPrice(String(Math.round(suggestedPrice))); setPriceAccepted(true); toast({ title: "Price accepted", description: "AI recommendation accepted." }); } }} disabled={suggestedPrice == null} className="w-full h-10 rounded-md bg-slate-100 font-semibold">
                Accept AI Recommendation
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Route summary</div>
                <dl className="mt-3 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">Distance</dt>
                    <dd className="text-sm font-semibold text-right">{distanceMiles == null ? "--" : `${distanceMiles.toLocaleString("en-AU", { maximumFractionDigits: 0 })} mi`}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">Pure driving</dt>
                    <dd className="text-sm font-semibold text-right">{pureDrivingHours == null ? "--" : `${pureDrivingHours.toFixed(1)} h`}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">With breaks</dt>
                    <dd className="text-sm font-semibold text-right">{actualDurationHours == null ? "--" : `${actualDurationHours.toFixed(1)} h`}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reasoning</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{suggestionReason ?? "No reasoning available yet."}</p>
              </div>
              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <input className="mt-1" type="checkbox" checked={priceAccepted} onChange={(e) => setPriceAccepted(e.target.checked)} />
                <span>I've set and accept this price</span>
              </label>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .loadmind-input {
          width: 100%; height: 42px; padding: 0 0.75rem; border-radius: 0.375rem;
          background: hsl(var(--surface-container-lowest));
          font-size: 0.875rem; outline: none;
          transition: box-shadow 0.15s ease;
        }
        .loadmind-input:focus { box-shadow: 0 0 0 2px hsl(var(--primary)); }
      `}</style>
    </div>
  );
}

function Section({ number, icon: Icon, title, children }: { number: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="surface-2 rounded-xl ghost-shadow p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="font-display text-xs font-bold font-mono-data text-muted-foreground">{number}</div>
        <div className="h-8 w-8 rounded-md surface-3 grid place-items-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  required,
  action,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="label-eyebrow">{label}{required && <span className="text-destructive ml-1">*</span>}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
