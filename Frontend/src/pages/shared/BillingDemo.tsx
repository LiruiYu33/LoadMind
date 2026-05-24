import { useState } from "react";
import { CreditCard, ShieldCheck, BadgeDollarSign, Landmark, ExternalLink, Repeat } from "lucide-react";

export function BillingDemo({ variant }: { variant: "carrier" | "shipper" }) {
  const isCarrier = variant === "carrier";
  const [subscribed, setSubscribed] = useState(false);
  const shipmentValue = 1900;
  const feeRate = subscribed ? 0.05 : 0.1;
  const platformFee = shipmentValue * feeRate;
  const carrierPayout = shipmentValue - platformFee;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="label-eyebrow mb-2">
          {isCarrier ? "CARRIER PORTAL · PAYOUT SETUP" : "SHIPPER PORTAL · PAYMENT SETUP"}
        </div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Billing & Platform Fee</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Demo-only payment onboarding for explaining transaction fees, optional subscription pricing, and future Stripe Connect integration.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <section className="surface-2 rounded-xl ghost-shadow p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-md grid place-items-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="label-eyebrow mb-1">STRIPE-STYLE ONBOARDING</div>
              <h2 className="font-display text-xl font-bold">
                {isCarrier ? "Connect payout bank account" : "Bind payment card"}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                This screen is a non-payment demo. It shows the intended checkout and payout model without collecting real
                card numbers, bank details, or creating live Stripe charges.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DemoField label={isCarrier ? "Payout account" : "Payment method"} value={isCarrier ? "Demo bank account ending 2048" : "Demo Visa ending 4242"} />
            <DemoField label="Stripe mode" value="Test / demo only" />
            <DemoField label="Fee model" value={subscribed ? "Subscription active · 5% transaction fee" : "Free plan · 10% transaction fee"} />
            <DemoField label="Settlement status" value={isCarrier ? "Ready for simulated payout" : "Ready for simulated checkout"} />
          </div>

          <div className="rounded-md bg-white p-4 ring-1 ring-border/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="label-eyebrow mb-1">SUBSCRIPTION OPTION</div>
                <div className="font-display text-sm font-semibold">
                  {subscribed ? "LoadMind Pro enabled" : "Free marketplace plan"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscribed
                    ? "Monthly subscription lowers the transaction fee from 10% to 5%."
                    : "Without subscription, LoadMind keeps a 10% platform fee per completed transaction."}
                </p>
              </div>
              <div
                className="relative grid h-10 min-w-[172px] grid-cols-2 rounded-md surface-3 p-1 text-xs font-semibold"
                role="tablist"
                aria-label="Subscription plan"
              >
                <div
                  className={`absolute left-1 top-1 h-8 w-[calc(50%-0.25rem)] rounded-[4px] bg-white lift-shadow transition-transform duration-200 ease-out ${
                    subscribed ? "translate-x-full" : "translate-x-0"
                  }`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={!subscribed}
                  onClick={() => setSubscribed(false)}
                  className={`relative z-10 rounded-[4px] px-3 transition-colors duration-200 ${
                    subscribed ? "text-muted-foreground hover:text-foreground" : "text-primary"
                  }`}
                >
                  Free · 10%
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={subscribed}
                  onClick={() => setSubscribed(true)}
                  className={`relative z-10 rounded-[4px] px-3 transition-colors duration-200 ${
                    subscribed ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pro · 5%
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-md surface-3 p-4">
            <div className="label-eyebrow mb-3">DEMO TRANSACTION EXAMPLE</div>
            <div className="space-y-3 text-sm">
              <FeeRow label="Shipment value" value={formatAud(shipmentValue)} />
              <FeeRow label={`LoadMind platform fee (${Math.round(feeRate * 100)}%)`} value={formatAud(platformFee)} accent />
              <FeeRow label={isCarrier ? "Estimated carrier payout" : "Carrier payout after platform fee"} value={formatAud(carrierPayout)} />
            </div>
          </div>

          <button
            type="button"
            disabled
            className="h-11 w-full rounded-md surface-3 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
          >
            <ExternalLink className="h-4 w-4" />
            Open Stripe onboarding (disabled in MVP demo)
          </button>
        </section>

        <aside className="space-y-4">
          <InfoCard
            icon={BadgeDollarSign}
            title={subscribed ? "5% subscribed fee" : "10% marketplace fee"}
            text={
              subscribed
                ? "Subscribed users would pay a monthly fee and receive a lower 5% transaction fee on completed marketplace jobs."
                : "Free-plan users would pay no monthly subscription, with LoadMind deducting a 10% service fee from completed transactions."
            }
          />
          <InfoCard
            icon={Repeat}
            title="Subscription model"
            text="A future paid plan can provide lower marketplace fees, priority matching, analytics, or reporting features."
          />
          <InfoCard
            icon={Landmark}
            title={isCarrier ? "Carrier payout flow" : "Shipper payment flow"}
            text={
              isCarrier
                ? "Carriers would connect a payout account through Stripe Connect to receive net settlement."
                : "Shippers would pay through a Stripe-hosted or embedded checkout flow after accepting a carrier."
            }
          />
          <InfoCard
            icon={ShieldCheck}
            title="No real payment data"
            text="The MVP does not store card numbers or bank account details. A production version should delegate sensitive payment handling to Stripe."
          />
        </aside>
      </div>
    </div>
  );
}

function DemoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-4 ring-1 ring-border/70">
      <div className="label-eyebrow mb-1">{label}</div>
      <div className="font-display text-sm font-semibold">{value}</div>
    </div>
  );
}

function FeeRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-display font-semibold font-mono-data ${accent ? "text-action-deep" : ""}`}>{value}</span>
    </div>
  );
}

function formatAud(value: number) {
  return `AUD ${Math.round(value).toLocaleString("en-AU")}`;
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CreditCard;
  title: string;
  text: string;
}) {
  return (
    <div className="surface-2 rounded-xl ghost-shadow p-5">
      <Icon className="h-4 w-4 text-primary mb-3" />
      <div className="font-display text-sm font-bold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
