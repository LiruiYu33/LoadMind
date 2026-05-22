# MVP Demo Script

This script is intended for the Week 12 live demonstration. The team has 20 minutes total for walkthrough and Q&A, and questions may happen during the demo.

## Demo Goal

Show that LoadMind is a functional MVP with an end-to-end dry-goods freight workflow:

1. Shipper logs in.
2. Shipper posts a dry-goods shipment.
3. The product helps with address selection, route information, and price suggestion.
4. Carrier logs in.
5. Carrier reviews the open load in AI Load Matcher.
6. Carrier checks pickup/delivery route map.
7. Carrier assigns the load to a fleet vehicle.
8. The workflow can progress through status confirmation.

## Pre-Demo Setup

Complete these checks before the demonstration starts:

- Confirm Supabase project is available.
- Confirm demo accounts are ready:
  - one Shipper account,
  - one Carrier account,
  - same email can be used for both roles if needed.
- Confirm Supabase migrations have been applied.
- Confirm open demo loads and demo vehicles exist.
- Start backend:

```bash
cd Backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Start frontend:

```bash
cd Frontend
npm run dev -- --host 0.0.0.0 --port 8080
```

- Open:

```text
http://localhost:8080
```

- Keep backup screenshots available in case the network, Supabase, or map services fail.

## Suggested Timing

| Segment | Time | Owner | Purpose |
| --- | ---: | --- | --- |
| Product introduction | 1 min | Team lead | Explain problem, users, and dry-goods focus. |
| Shipper workflow | 4 min | Shipper owner | Show shipment creation and price suggestion. |
| Carrier workflow | 4 min | Carrier owner | Show AI Load Matcher, maps, and assignment. |
| AI/ML explanation | 3 min | AI owner | Explain XGBoost model, features, and limitations. |
| Validation/risk/roadmap | 3 min | Product/technical owner | Explain testing, risk, privacy, and future plan. |
| Q&A buffer | 5 min | Whole team | Answer questions. |

## Opening Script

> LoadMind is a dry-goods freight matching MVP for shippers and carriers. Shippers can post loads with pickup and delivery details, and carriers can review AI-supported load recommendations, route maps, and assign loads to vehicles. The MVP demonstrates a complete workflow from posting a shipment to carrier assignment and status confirmation.

## Part 1: Shipper Workflow

1. Go to `/auth`.
2. Select `Shipper`.
3. Sign in with the demo account.
4. Open `Post Shipment`.
5. Explain the dry-goods scope:
   - categories are restricted to dry-goods subcategories,
   - refrigerated, hazardous, oversized, and specialised freight are outside MVP scope.
6. Enter or select pickup address:
   - show manual typing and autocomplete,
   - optionally click the map pin selector,
   - confirm that a full street address is written into the field.
7. Enter or select delivery address.
8. Add cargo details, weight, dimensions, pickup time, and dropoff time.
9. Request or show AI price suggestion.
10. Submit the shipment.
11. Open the Shipper dashboard/history to show the posted shipment.

Key points to say:

- Address selection reduces ambiguity in pickup and delivery data.
- Full street addresses are shown to users rather than raw coordinates.
- Dry-goods categories keep the MVP focused and realistic.
- The AI price is advisory and should be reviewed before acceptance.

## Part 2: Carrier Workflow

1. Sign out.
2. Return to `/auth`.
3. Select `Carrier`.
4. Sign in with the carrier demo account.
5. Open `AI Load Matcher`.
6. Show available load cards.
7. Explain load card information:
   - dry-goods category,
   - weight,
   - route,
   - pickup time,
   - dropoff time,
   - load value.
8. Expand long pickup/delivery details to show full information.
9. Show small OpenStreetMap route map with pickup and delivery markers.
10. Click `Assign Load`.
11. Select a fleet vehicle.
12. Open fleet management or assigned load area to show the assignment.

Key points to say:

- The carrier can review route and operational details before assignment.
- Maps provide quick spatial context for pickup and delivery.
- Load value stays visible for fast decision-making.
- The workflow connects shipper demand to carrier capacity.

## Part 3: AI/ML Explanation

Use `docs/AI_MODEL.md` as the source.

Short explanation:

> The AI/ML feature is the price suggestion workflow. The backend geocodes the route, calculates distance and driving duration, adjusts for rest time, converts weight, loads an XGBoost regression model from `Backend/xgboost_pricing_model.json`, and returns a suggested price in AUD with a short reasoning statement.

Mention why XGBoost:

- appropriate for structured tabular data,
- handles non-linear relationships,
- simpler and more suitable for MVP deployment than a neural network,
- stronger than a fixed rule-based formula.

## Part 4: Validation and Risk

Use `docs/VALIDATION.md` and `docs/RISK_SECURITY.md` as support.

Mention current validation evidence:

- frontend lint,
- frontend build,
- frontend unit test command,
- backend compile check,
- repeated manual end-to-end demo checks.

Mention model validation position:

- the MVP includes a trained model artifact,
- final numeric validation metrics should be supported by a validation dataset,
- if metrics are not final, present this honestly as a current limitation and future refinement.

Mention risk and privacy:

- Supabase Auth handles authentication,
- backend service key is server-side only,
- no payment card data is collected,
- location data is used for route and freight operations,
- third-party map/routing dependency is a known risk,
- users can view a simple Privacy Policy dialog.

## Q&A Preparation

### What is the core MVP?

An end-to-end dry-goods shipment workflow from shipper posting to carrier assignment and status tracking.

### Where is AI/ML used?

In price suggestion and decision support. The XGBoost model predicts a suggested price using route, duration, and weight features.

### Why dry goods only?

Dry goods are operationally simpler for an MVP. Refrigerated, hazardous, oversized, and specialised freight introduce extra compliance and equipment requirements.

### What data does the model use?

The current backend model uses `weight_lbs`, `typical_distance_miles`, and `actual_duration_hours`.

### What are the limitations?

The MVP does not yet include production-grade validation data, audit logging, payments, driver verification, or full enterprise compliance reporting.

### How is privacy handled?

The MVP collects only account, role, shipment, fleet, and route data needed for the freight workflow. Authentication uses Supabase, and backend secrets are not exposed to the frontend.

## Backup Plan

If the live app has an issue:

- Show README setup instructions.
- Show key files:
  - `Frontend/src/pages/shipper/PostShipment.tsx`
  - `Frontend/src/pages/carrier/AIMatcher.tsx`
  - `Backend/app/api/routes/loads.py`
  - `Backend/app/api/routes/price_insights.py`
  - `Backend/app/ai/pricing.py`
  - `Backend/xgboost_pricing_model.json`
- Show screenshots or screen recording if available.
- Explain the intended end-to-end flow using this script.

## Final Checklist

- Shipper login works.
- Carrier login works.
- Same email can access both roles when selected.
- Shipment posting works.
- Address autocomplete or map pin selection works.
- AI price suggestion works or fallback explanation is ready.
- Carrier can see open load.
- Route map markers display correctly.
- Assign Load dropdown is visible and usable.
- Assigned load appears in carrier workflow.
- README setup instructions are accurate.
- Roadmap, AI model, validation, and risk/security documents are available in `docs/`.
