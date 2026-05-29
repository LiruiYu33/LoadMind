import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { createLoad, suggestPrice } from "@/lib/loads-api";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { LoadMindLoader } from "@/components/LoadMindLoader";
import { Package, MapPin, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DRY_GOODS_CATEGORIES } from "@/lib/dry-goods";

const MAX_SHIPMENT_WEIGHT_KG = 24000;
const MIN_DROP_OFF_BUFFER_MINUTES = 60;

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
    notes: "",
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

  const estimateFallbackPrice = () => {
    const weight = Number(form.weight);
    const cargoLabel = form.cargo.trim();
    const weightComponent = Number.isFinite(weight) && weight > 0 ? weight * 0.08 : 0;
    const cargoComponent = cargoLabel ? Math.min(cargoLabel.length * 0.5, 35) : 0;
    const specialHandlingComponent = /refrigerated|temperature-controlled|hazard|oversize/i.test(form.category)
      ? 60
      : 0;

    return Math.max(250, Math.round(250 + weightComponent + cargoComponent + specialHandlingComponent));
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setValue = (k: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [k]: value }));
  };

  const setPickupTime = (value: string) => {
    setForm((current) => {
      const next = { ...current, pickupTime: value };
      if (!value) return next;

      const pickupTime = new Date(value);
      if (Number.isNaN(pickupTime.getTime())) return next;

      const earliestDropoff = getEarliestDropoffTime(pickupTime, actualDurationHours);
      const currentDropoff = new Date(current.dropoffTime);
      if (!current.dropoffTime || Number.isNaN(currentDropoff.getTime()) || currentDropoff < earliestDropoff) {
        next.dropoffTime = toDateTimeLocalValue(earliestDropoff);
      }

      return next;
    });
  };

  const setPositiveIntegerNumber = (k: keyof typeof form, max?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setValue(k, value);
      return;
    }

    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isFinite(number) || number <= 0) return;
    if (max != null && number > max) return;
    setValue(k, value);
  };

  const setPositivePrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceAccepted(false);

    if (value === "") {
      setEditedPrice(value);
      return;
    }

    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isFinite(number) || number <= 0) return;
    setEditedPrice(value);
  };

  const preventIntegerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
  };

  const getInvalidCargoNumberField = () => {
    const numericFields = [
      { label: "Weight", value: form.weight, required: true, max: MAX_SHIPMENT_WEIGHT_KG },
      { label: "Length", value: form.length, required: false },
      { label: "Width", value: form.width, required: false },
      { label: "Height", value: form.height, required: false },
    ];

    return numericFields.find((field) => {
      if (!field.value) return field.required;
      const number = Number(field.value);
      return !Number.isFinite(number) || number <= 0 || (field.max != null && number > field.max);
    });
  };

  const showCargoNumberError = (field: { label: string; required: boolean; max?: number }) => {
    toast({
      title: "Invalid cargo dimensions",
      description: field.max != null
        ? `${field.label} must be between 1 and ${field.max.toLocaleString("en-AU")}.`
        : `${field.label} must be a number greater than zero${field.required ? "" : " or left blank"}.`,
      variant: "destructive",
    });
  };

  const validateCargoNumbers = () => {
    const invalidField = getInvalidCargoNumberField();
    if (!invalidField) return true;
    showCargoNumberError(invalidField);
    return false;
  };

  const getValidatedTimes = () => {
    const pickupTime = new Date(form.pickupTime);
    const dropoffTime = new Date(form.dropoffTime);
    const now = new Date();
    now.setSeconds(0, 0);

    if (
      Number.isNaN(pickupTime.getTime()) ||
      Number.isNaN(dropoffTime.getTime())
    ) {
      toast({ title: "Invalid times", description: "Please provide valid pickup and dropoff times.", variant: "destructive" });
      return null;
    }

    if (pickupTime < now) {
      toast({ title: "Pickup time is in the past", description: "Please choose a current or future pickup time.", variant: "destructive" });
      return null;
    }

    if (dropoffTime <= pickupTime) {
      toast({ title: "Time sequence invalid", description: "Dropoff time must be after pickup time.", variant: "destructive" });
      return null;
    }

    const earliestDropoff = getEarliestDropoffTime(pickupTime, actualDurationHours);
    if (dropoffTime < earliestDropoff) {
      toast({
        title: "Dropoff time is too early",
        description: `Earliest dropoff is ${formatDateTimeForMessage(earliestDropoff)} based on the pickup time${actualDurationHours ? " and estimated route duration" : ""}.`,
        variant: "destructive",
      });
      return null;
    }

    return { pickupTime, dropoffTime };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!priceAccepted) {
      toast({ title: "Accept a price", description: "Please accept a suggested or modified price before posting.", variant: "destructive" });
      return;
    }
    const times = getValidatedTimes();
    if (!times) return;
    const { pickupTime, dropoffTime } = times;

    if (!validateCargoNumbers()) return;

    const acceptedPrice = editedPrice ? Number(editedPrice) : suggestedPrice;
    if (!Number.isFinite(acceptedPrice) || acceptedPrice == null || acceptedPrice <= 0) {
      toast({ title: "Invalid price", description: "Price must be greater than zero.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const weight = Number(form.weight) || 0;
      const cargoDescription = [form.cargo.trim(), form.notes.trim()].filter(Boolean).join(" - ");
      await createLoad({
        cargo: cargoDescription,
        origin: form.origin,
        destination: form.destination,
        weight_kg: weight,
        load_type: form.category,
        value: acceptedPrice,
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
    const times = getValidatedTimes();
    if (!times || !validateCargoNumbers()) return;

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
        pickup_time: times.pickupTime.toISOString(),
        dropoff_time: times.dropoffTime.toISOString(),
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
      const fallbackPrice = estimateFallbackPrice();
      const fallbackMessage = `AI price suggestion is currently unavailable. A fallback price of ${formatAudPrice(fallbackPrice)} was applied.`;
      setSuggestedPrice(fallbackPrice);
      setDistanceMiles(null);
      setPureDrivingHours(null);
      setActualDurationHours(null);
      setSuggestionReason(fallbackMessage);
      setSuggestionError(fallbackMessage);
      setEditedPrice(String(Math.round(fallbackPrice)));
      setPriceAccepted(false);
      toast({
        title: "Fallback price applied",
        description: err instanceof Error ? `${fallbackMessage} (${err.message})` : fallbackMessage,
      });
    } finally {
      setSuggestionLoading(false);
    }
  };


  const suggestedPriceLabel = suggestedPrice == null ? "No price yet" : formatAudPrice(suggestedPrice);
  const pickupMinValue = toDateTimeLocalValue(new Date());
  const dropoffMinDate = form.pickupTime
    ? getEarliestDropoffTime(new Date(form.pickupTime), actualDurationHours)
    : null;
  const dropoffMinValue = dropoffMinDate ? toDateTimeLocalValue(dropoffMinDate) : pickupMinValue;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · NEW LISTING</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Post a Shipment</h1>
        <p className="text-sm text-muted-foreground mt-1.5">List freight to LoadMind's verified carrier marketplace.</p>
      </div>

      <div className="grid gap-6 items-start">
        <div className="min-w-0">
          <form id="post-shipment-form" onSubmit={submit} className="space-y-6 w-full">
        
        {/* 1 — Cargo */}
        <Section number="01" icon={Package} title="Cargo Details">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Item Description" required>
              <input required value={form.cargo} onChange={set("cargo")} placeholder="e.g. Palletized non-perishable groceries" maxLength={240} className="loadmind-input" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={set("category")} className="loadmind-input">
                {DRY_GOODS_CATEGORIES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Weight (kg)" required>
              <input
                required
                type="number"
                min="1"
                max={MAX_SHIPMENT_WEIGHT_KG}
                step="1"
                value={form.weight}
                onChange={setPositiveIntegerNumber("weight", MAX_SHIPMENT_WEIGHT_KG)}
                onKeyDown={preventIntegerInput}
                placeholder="24000"
                className="loadmind-input"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="L (cm)">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.length}
                  onChange={setPositiveIntegerNumber("length")}
                  onKeyDown={preventIntegerInput}
                  className="loadmind-input"
                />
              </Field>
              <Field label="W (cm)">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.width}
                  onChange={setPositiveIntegerNumber("width")}
                  onKeyDown={preventIntegerInput}
                  className="loadmind-input"
                />
              </Field>
              <Field label="H (cm)">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.height}
                  onChange={setPositiveIntegerNumber("height")}
                  onKeyDown={preventIntegerInput}
                  className="loadmind-input"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Additional Load Notes">
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Optional handling notes, packaging details, pallet count, or delivery instructions."
                  maxLength={240}
                  className="loadmind-input loadmind-textarea"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* 2 — Route */}
        <Section number="02" icon={MapPin} title="Route Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Pickup Location"
              required
            >
              <div className="relative">
                <AddressAutocompleteInput
                  required
                  value={form.origin}
                  onChange={(value) => setValue("origin", value)}
                  placeholder="Melbourne, VIC"
                  maxLength={240}
                  className="loadmind-input pr-[5.25rem]"
                />
                <button
                  type="button"
                  onClick={() => setLocationPicker("origin")}
                  className="absolute right-1 top-1 h-[34px] rounded-[4px] px-2.5 text-xs font-semibold flex items-center gap-1.5 transition hover:bg-primary/10 hover:text-primary"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map
                </button>
              </div>
            </Field>
            <Field
              label="Delivery Location"
              required
            >
              <div className="relative">
                <AddressAutocompleteInput
                  required
                  value={form.destination}
                  onChange={(value) => setValue("destination", value)}
                  placeholder="Sydney, NSW"
                  maxLength={240}
                  className="loadmind-input pr-[5.25rem]"
                />
                <button
                  type="button"
                  onClick={() => setLocationPicker("destination")}
                  className="absolute right-1 top-1 h-[34px] rounded-[4px] px-2.5 text-xs font-semibold flex items-center gap-1.5 transition hover:bg-primary/10 hover:text-primary"
                >
                  <MapPin className="h-3.5 w-3.5" /> Map
                </button>
              </div>
            </Field>
            <Field label="Pickup Time" required>
              <input required type="datetime-local" value={form.pickupTime} onChange={(event) => setPickupTime(event.target.value)} min={pickupMinValue} className="loadmind-input" />
            </Field>
            <Field label="Dropoff Time" required>
              <input required type="datetime-local" value={form.dropoffTime} onChange={set("dropoffTime")} min={dropoffMinValue || undefined} className="loadmind-input" />
              {form.pickupTime && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Earliest dropoff: {dropoffMinDate ? formatDateTimeForMessage(dropoffMinDate) : "set pickup time first"}.
                </p>
              )}
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

      </form>
        </div>

        <aside className="w-full space-y-4">
          <div className="surface-2 rounded-xl ghost-shadow p-6">
            <div className="font-display text-sm font-bold mb-2">PRICE INSIGHTS</div>
            <div className="text-xs text-muted-foreground mb-3">Suggested Marketplace Price</div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {suggestionLoading ? (
                <LoadMindLoader
                  compact
                  label="Calculating price"
                  detail="AI recommendation in progress"
                  className="min-h-[88px] py-0"
                />
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Suggested price</div>
                  <div className="mt-1 text-3xl font-display font-bold text-foreground">{suggestedPriceLabel}</div>
                </>
              )}
            </div>
            <label className="mb-3 block">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Edit price</div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground">AUD</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editedPrice}
                  onChange={setPositivePrice}
                  onKeyDown={preventIntegerInput}
                  placeholder="350"
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
          <button
            type="submit"
            form="post-shipment-form"
            disabled={busy}
            className="btn-primary-gradient h-12 px-6 rounded-md text-sm font-semibold flex items-center justify-center gap-2 w-full"
          >
            {busy ? "Posting…" : <>Post Listing to Marketplace <ArrowRight className="h-4 w-4" /></>}
          </button>
        </aside>
      </div>

      <style>{`
        .loadmind-input {
          width: 100%; height: 42px; padding: 0 0.75rem; border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-size: 0.875rem; outline: none;
          box-shadow: 0 1px 2px hsl(var(--foreground) / 0.04);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .loadmind-input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.22);
        }
        .loadmind-textarea {
          min-height: 96px;
          height: auto;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          resize: vertical;
          line-height: 1.45;
        }
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

function getEarliestDropoffTime(pickupTime: Date, actualDurationHours: number | null) {
  const minimumMinutes = Math.max(
    MIN_DROP_OFF_BUFFER_MINUTES,
    actualDurationHours && Number.isFinite(actualDurationHours) ? Math.ceil(actualDurationHours * 60) : 0,
  );

  return new Date(pickupTime.getTime() + minimumMinutes * 60 * 1000);
}

function toDateTimeLocalValue(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  if (rounded.getTime() < date.getTime()) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    rounded.getFullYear(),
    pad(rounded.getMonth() + 1),
    pad(rounded.getDate()),
  ].join("-") + `T${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`;
}

function formatDateTimeForMessage(date: Date) {
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
