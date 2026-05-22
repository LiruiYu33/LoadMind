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
| Carrier views route map | Pickup and delivery markers are displayed. | Load route map component. |
| Carrier assigns load | Load is assigned to selected vehicle. | Backend assign endpoint and Supabase update. |
| User signs out | User returns to authentication flow. | Sign-out button remains visible in sidebar. |

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

Known test limitation:

- The current committed frontend test is minimal and should be expanded.
- More meaningful tests are listed in the future validation work section below.

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

## Recommended Model Validation Dataset

Before final submission, the team should add or describe a validation dataset. A suitable CSV could use this schema:

```text
origin,destination,weight_kg,distance_miles,actual_duration_hours,reference_price_aud,predicted_price_aud
```

Recommended path:

```text
Backend/data/pricing_validation.csv
```

The dataset may be:

- real historical freight pricing data, if available,
- anonymised sample data,
- simulated/synthetic dry-goods freight scenarios, if real data is not available.

If the data is synthetic, the team should clearly state that it is synthetic and explain how the values were generated.

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
| Rule-based baseline | To be measured | To be measured | To be measured | Simple distance and weight formula. |
| XGBoost pricing model | To be measured | To be measured | To be measured | Current MVP model. |

Do not invent numeric metrics. If final metrics are not available by the demo, present the table as a planned validation approach and explain the current MVP limitation.

## Suggested Baseline

A simple baseline could be:

```text
reference_price = base_fee + distance_miles * rate_per_mile + weight_lbs * weight_rate
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
| Long details hidden | Verify details can be expanded in AI Load Matcher. |
| Dry-goods scope drift | Verify only dry-goods categories appear in shipment form. |

## Manual Demo Test Cases

### Test Case 1: Shipper Posts Dry-Goods Shipment

1. Sign in as Shipper.
2. Open Post Shipment.
3. Select a dry-goods category.
4. Enter pickup and delivery addresses.
5. Enter weight, dimensions, and times.
6. Request price suggestion.
7. Submit shipment.

Expected result: shipment is created and visible to carrier as an open load.

### Test Case 2: Carrier Assigns Load

1. Sign in as Carrier.
2. Open AI Load Matcher.
3. Confirm load card shows route, value, category, and map.
4. Expand pickup/delivery details.
5. Click Assign Load.
6. Select vehicle.

Expected result: load is assigned and removed from open marketplace view.

### Test Case 3: Service Restart Requires Login

1. Sign in.
2. Restart frontend or backend service.
3. Reopen the app.

Expected result: user is required to sign in again.

## Future Validation Work

Recommended next tests:

- Unit tests for dry-goods category normalisation.
- Unit tests for address alias normalisation, especially Clayton and Melbourne CBD.
- Component tests for expandable load details.
- Integration tests for create load, assign load, confirm pickup, and confirm delivery.
- Backend tests for schema validation and role-sensitive endpoints.
- Model validation script producing MAE, RMSE, R2, and baseline comparison.
- Seed data script for repeatable demo runs.

## Demo Statement

Suggested validation explanation for Q&A:

> We validated the MVP at two levels. First, we verified the product workflow manually and through local technical checks: frontend lint, build, test, and backend compile checks. Second, for the AI pricing model, the current repository includes the trained XGBoost artifact and the backend integration. The final production-level model validation still needs a committed validation dataset and numeric metrics such as MAE, RMSE, R2, and comparison against a rule-based baseline. For the MVP, we treat the model as a feasibility demonstration and clearly document this limitation.
