# Demo Data

This document explains how to reset repeatable MVP demo data for LoadMind.

## Purpose

The seed file creates a small dry-goods marketplace that supports the live demo:

- one shipper role,
- one carrier role,
- two carrier vehicles,
- four open dry-goods loads with full Australian addresses,
- deterministic shipment codes beginning with `DEMO-`.

The seed is for demonstration and validation support only. It is not production data.

## Required Auth Users

Create these users first in the Supabase web dashboard under **Authentication > Users**:

```text
shipper.demo@loadmind.test
carrier.demo@loadmind.test
```

Set passwords that the team can use during the live demo. The SQL seed does not create Auth passwords.

## Seed File

Run this file in the Supabase SQL editor:

```text
Frontend/supabase/seed_demo.sql
```

The seed script:

1. Finds the two Auth users by email.
2. Adds the correct `shipper` and `carrier` rows in `public.user_roles`.
3. Deletes existing demo loads and demo vehicles whose identifiers start with `DEMO-`.
4. Inserts fresh demo vehicles and open loads.

It is safe to rerun before a demo because it only resets rows with demo identifiers.

## Demo Routes

| Shipment Code | Category | Pickup | Delivery |
| --- | --- | --- | --- |
| `DEMO-CLAYTON-CBD` | Palletized Goods | Clayton, Victoria, 3168, Australia | Melbourne, Victoria, 3000, Australia |
| `DEMO-DYNON-EUMEMMERRING` | Packaged Consumer Goods | 391-395 Dynon Road, West Melbourne, Victoria, 3003, Australia | 9A Butler Street, Eumemmerring, Victoria, 3177, Australia |
| `DEMO-MEL-GEELONG` | Electronics & Appliances | Melbourne, Victoria, 3000, Australia | Geelong, Victoria, 3220, Australia |
| `DEMO-MEL-ADELAIDE` | Non-perishable Food & Beverages | Melbourne, Victoria, 3000, Australia | Adelaide, South Australia, 5000, Australia |

## Verification

After running the seed:

1. Log in as the carrier.
2. Open AI Load Matcher.
3. Confirm the demo loads are visible.
4. Confirm each load card shows a dry-goods category.
5. Confirm route maps show pickup and delivery markers.
6. Assign one load to `DEMO-MEL-01` or `DEMO-GEE-02`.
