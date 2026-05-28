# Validation Plan and Evidence

This document explains how the LoadMind MVP is validated for the FIT5239 Assessment 3 demonstration. It covers product workflow validation, technical verification, AI/ML model validation, and remaining validation gaps.

## Validation Scope

The MVP needs to show two forms of validation:

1. Product validation: the end-to-end user workflow works for the intended users.
2. Model validation: the AI/ML component is appropriate, explainable, and tested against relevant data.

The current product validation is stronger than the current quantitative model validation. This should be explained honestly in the demonstration if asked.

## Product Workflow Validation

The core workflow is validated manually through demonstration rehearsals.

| Workflow Step | Expected Result | Evidence |
| --- | --- | --- |
| User opens login page | Login page loads and shows Carrier/Shipper role selector. | Manual demo check. |
| User signs in as Shipper | User enters the Shipper portal. | Supabase Auth plus role selection. |
| Shipper posts shipment | Shipment is created and becomes visible to carriers. | Backend load creation endpoint and Supabase data. |
| Shipper selects address manually | Address field accepts typed full street address. | Manual demo check. |
| Shipper selects address with map pin | Confirmed map location writes address back to the field. | OpenStreetMap map selector. |
| Shipper uses dry-goods category | Only dry-goods subcategories are selectable. | Frontend category restriction. |
| Price suggestion is requested | Backend returns suggested price and reasoning. | `POST /api/v1/price-insights/suggest`. |
| Carrier signs in | User enters Carrier portal. | Supabase Auth plus role selection. |
| Carrier opens AI Load Matcher | Open loads appear as load cards. | Backend open-load API. |
| Carrier filters/sorts AI Load Matcher | Loads can be searched, filtered by dry-goods category/weight, filtered by available trucks, and sorted by load value, nearest pickup, or earliest pickup. | Manual demo check and frontend logic. |
| Carrier views route map | Pickup and delivery markers are displayed. | Load route map component. |
| Carrier assigns load | Load is assigned only to a theoretically capable vehicle. | Frontend candidate filtering plus backend assignment validation. |
| Carrier registers vehicle | Required fields are marked and numeric fields reject zero/negative values. | Fleet Management form validation. |
| Carrier optimizes route | Route optimizer accepts a truck, marketplace/custom stops, and optional fixed end stop. | Route Optimizer manual demo check. |
| User signs out | User returns to authentication flow. | Sign-out is available from the avatar dropdown menu. |

## Technical Verification Commands

Frontend checks:

```bash
cd Frontend
npm run lint
npm run build
npm run test
```

Backend check:

```bash
cd Backend
python3.11 -m py_compile app/main.py app/api/schemas/loads.py app/api/schemas/price_insights.py
```

GitLab CI currently runs a backend-only check because the available GitLab runner is a shell executor with Python available but no `npm` command. Frontend checks are run locally until a Docker or Node-enabled runner is available.

## Current Validation Evidence

The following checks have been run during MVP preparation:

- `npm run lint`
- `npm run build`
- `npm run test`
- backend Python compile check

Known lint status:

- Frontend lint passes with existing Fast Refresh warnings from shared shadcn/component utility files.
- These warnings do not block the build and are not introduced by the final feature work.

Committed frontend unit tests now cover:

- dry-goods category restrictions and legacy category normalisation,
- deterministic address handling for Melbourne CBD, Clayton, and demo street addresses,
- service restart detection that requires users to log in again after backend/frontend restarts.

## AI/ML Model Validation

The MVP includes an XGBoost pricing model artifact:

```text
Backend/xgboost_pricing_model.json
```

The backend loads it through:

```text
Backend/app/ai/pricing.py
```

The model uses:

- `weight_lbs`
- `typical_distance_miles`
- `actual_duration_hours`

The backend also uses:

- OpenRouteService geocoding and heavy-goods-vehicle routing,
- a simple Hours of Service rest adjustment,
- USD to AUD exchange-rate conversion.

## Current Model Validation Dataset

The repository now includes a small synthetic dry-goods pricing benchmark:

```text
Backend/data/pricing_validation.csv
```

It uses this schema:

```text
scenario,origin,destination,weight_kg,weight_lbs,typical_distance_miles,actual_duration_hours,reference_price_aud,reference_type
```

The current rows are synthetic demo benchmarks. They cover Melbourne metro, Victorian regional, and interstate dry-goods examples. The benchmark is useful for showing validation method and comparing model output with a simple baseline. It is not production-grade evidence.

If real historical or anonymised freight pricing data becomes available, it should replace or supplement this synthetic benchmark.

## Validation Script

Run:

```bash
cd Backend
python3.11 scripts/validate_pricing_model.py
```

The script prints MAE, RMSE, R2, a baseline comparison, and per-route prediction rows by default. Use `--hide-rows` to hide the row table.

## Recommended Model Metrics

The team should report:

| Metric | Meaning |
| --- | --- |
| MAE | Average absolute difference between predicted and reference price. |
| RMSE | Similar to MAE but penalises larger errors more strongly. |
| R2 | How much variation in price the model explains compared with a simple baseline. |
| Baseline comparison | Shows whether XGBoost improves over a rule-based formula. |

Suggested results table format:

| Model | MAE (AUD) | RMSE (AUD) | R2 | Notes |
| --- | ---: | ---: | ---: | --- |
| Rule-based baseline | Run script | Run script | Run script | Simple distance, weight, and duration formula. |
| XGBoost pricing model | Run script | Run script | Run script | Current MVP model artifact. |

Do not invent production claims from the synthetic benchmark. In the demo, describe the numbers as MVP validation support only.

## Suggested Baseline

A simple baseline could be:

```text
baseline_aud = 250 + distance_miles * 2.0 + weight_lbs * 0.006 + actual_duration_hours * 15
```

This baseline is useful because it is easy to explain. The XGBoost model should be justified by showing that it can capture non-linear interactions that a simple formula cannot.

## Risk-Based Validation

| Risk | Validation Action |
| --- | --- |
| Wrong address geocoding | Use full street addresses, known aliases, and map preview checks. |
| Map marker incorrect | Verify pickup and delivery markers for known demo routes. |
| User sees wrong portal | Test same email with Carrier and Shipper role selection. |
| Stale session after restart | Restart backend/frontend and verify user is required to log in again. |
| Assign Load dropdown blocked | Verify dropdown displays above maps and remains clickable. |
| Ineligible truck assignment | Verify unavailable, over-capacity, dimension-mismatched, or time-conflicting trucks are not offered and backend assignment rejects them. |
| Long details hidden | Verify details can be expanded in AI Load Matcher. |
| Dry-goods scope drift | Verify only dry-goods categories appear in shipment form. |

## Manual Demo Test Cases

### Test Case 1: Shipper Posts Dry-Goods Shipment

1. Sign in as Shipper.
2. Open Post Shipment.
3. Select a dry-goods category.
4. Enter pickup and delivery addresses.
5. Enter weight, optional dimensions, and times.
6. Request price suggestion, edit the price if needed, and accept it.
7. Submit shipment.

Expected result: shipment is created and visible to carrier as an open load.

### Test Case 2: Carrier Assigns Load

1. Sign in as Carrier.
2. Open AI Load Matcher.
3. Confirm load card shows route, value, category, and map.
4. Expand pickup/delivery details.
5. Click Assign Load.
6. Confirm only theoretically capable vehicles are displayed.
7. Select vehicle.

Expected result: load is assigned and removed from open marketplace view.

### Test Case 3: Service Restart Requires Login

1. Sign in.
2. Restart frontend or backend service.
3. Reopen the app.

Expected result: user is required to sign in again.

## Future Validation Work

Recommended next tests:

- Component tests for expandable load details.
- Integration tests for create load, assign load, confirm pickup, and confirm delivery.
- Backend tests for schema validation and role-sensitive endpoints.
- Larger model validation dataset using real or anonymised freight pricing examples.
- End-to-end test for price suggestion fallback when the backend or route provider is unavailable.

## Demo Statement

Suggested validation explanation for Q&A:

> We validated the MVP at two levels. First, we verified the product workflow manually and through local technical checks: frontend lint, build, targeted frontend unit tests, and backend compile checks. Second, for the AI pricing model, the repository includes the trained XGBoost artifact, backend integration, a synthetic dry-goods benchmark dataset, and a validation script that reports MAE, RMSE, R2, and comparison against a rule-based baseline. For the MVP, this is validation support rather than production-grade pricing evidence, and we clearly document that limitation.
