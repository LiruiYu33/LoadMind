import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { createLoad } from "@/lib/loads-api";
import { Package, MapPin, FileImage, Upload, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PostShipment() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    cargo: "",
    category: "Dry Goods",
    weight: "",
    length: "",
    width: "",
    height: "",
    origin: "",
    destination: "",
    pickupTime: "",
    dropoffTime: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
        length_cm: form.length ? Number(form.length) : null,
        width_cm: form.width ? Number(form.width) : null,
        height_cm: form.height ? Number(form.height) : null,
        pickup_time: pickupTime.toISOString(),
        dropoff_time: dropoffTime.toISOString(),
        shipment_code: `SH-${Date.now().toString(36).toUpperCase()}`,
      });
      toast({ title: "Shipment posted", description: "Your load is now live in the carrier marketplace." });
      nav("/shipper");
    } catch (err: any) {
      toast({ title: "Could not post", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">SHIPPER PORTAL · NEW LISTING</div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Post a Shipment</h1>
        <p className="text-sm text-muted-foreground mt-1.5">List freight to LoadMind's verified carrier marketplace.</p>
      </div>

      <form onSubmit={submit} className="space-y-6 max-w-3xl">
        {/* 1 — Cargo */}
        <Section number="01" icon={Package} title="Cargo Details">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Item Description" required>
              <input required value={form.cargo} onChange={set("cargo")} placeholder="e.g. Refrigerated produce pallets" className="loadmind-input" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={set("category")} className="loadmind-input">
                {["Dry Goods", "Reefer Produce", "Construction Steel", "Consumer Electronics", "Hazardous", "Flatbed Steel"].map((o) => (
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
            <Field label="Pickup Location" required>
              <input required value={form.origin} onChange={set("origin")} placeholder="Melbourne, VIC" className="loadmind-input" />
            </Field>
            <Field label="Delivery Location" required>
              <input required value={form.destination} onChange={set("destination")} placeholder="Sydney, NSW" className="loadmind-input" />
            </Field>
            <Field label="Pickup Time" required>
              <input required type="datetime-local" value={form.pickupTime} onChange={set("pickupTime")} className="loadmind-input" />
            </Field>
            <Field label="Dropoff Time" required>
              <input required type="datetime-local" value={form.dropoffTime} onChange={set("dropoffTime")} min={form.pickupTime || undefined} className="loadmind-input" />
            </Field>
          </div>
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

function Section({ number, icon: Icon, title, children }: { number: string; icon: any; title: string; children: React.ReactNode }) {
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

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <div className="label-eyebrow mb-2">{label}{required && <span className="text-destructive ml-1">*</span>}</div>
      {children}
    </label>
  );
}

