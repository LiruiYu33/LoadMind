# AI/ML Model Documentation

This document explains the AI/ML component used in the LoadMind MVP, why the current model was selected, how it is integrated into the product, and what limitations remain before production use.

## Model Purpose

The MVP uses an AI-assisted pricing feature to suggest a freight price for a dry-goods shipment. The goal is not to automatically set a binding contract price. The goal is to provide a useful starting point that helps shippers and carriers understand the expected price range for a shipment based on route and load characteristics.

The pricing suggestion supports these product goals:

- Help shippers post loads with more realistic price expectations.
- Help carriers compare load value against route effort.
- Demonstrate that LoadMind can integrate AI/ML into the freight workflow rather than using a static form only.

## Model Artifact

The trained model artifact is stored at:

```text
Backend/xgboost_pricing_model.json
```

It is loaded by:

```text
Backend/app/ai/pricing.py
```

The backend loads it with:

```python
_MODEL = xgb.Booster()
_MODEL.load_model(str(_MODEL_PATH))
```

The file is JSON because XGBoost supports JSON as a native model serialisation format. The JSON stores the trained tree structure, split conditions, leaf weights, feature names, objective configuration, and XGBoost metadata.

## Model Type

The model is an XGBoost regression model.

XGBoost was selected because:

- It performs well on structured tabular data.
- It can model non-linear relationships between distance, time, weight, and price.
- It is more flexible than a simple rule-based formula.
- It is easier to deploy in a small backend service than a large neural network.
- It provides a practical MVP-level balance between predictive power, explainability, and implementation complexity.

## Alternatives Considered

| Alternative | Reason Not Selected for MVP |
| --- | --- |
| Rule-based formula | Easy to explain, but too rigid. It cannot learn non-linear pricing patterns or route-duration effects. |
| Linear regression | More interpretable, but likely underfits freight pricing where distance, time, and weight interact non-linearly. |
| Random forest | Reasonable alternative, but XGBoost is usually stronger for structured regression and supports efficient model export. |
| Neural network | More complex than needed for MVP tabular pricing and harder to justify with a small or synthetic dataset. |
| Manual price entry only | Does not demonstrate AI/ML feasibility and gives less decision support to the user. |

## Input Features

The current model receives these numeric features:

| Feature | Source | Description |
| --- | --- | --- |
| `weight_lbs` | User shipment input | Shipment weight converted from kilograms to pounds. |
| `typical_distance_miles` | Route calculation | Driving distance converted from metres to miles. |
| `actual_duration_hours` | Route calculation plus Hours of Service logic | Estimated total duration after adding rest breaks. |

The route calculation uses OpenRouteService heavy-goods-vehicle routing. The backend also retrieves a USD to AUD exchange rate before returning the final suggested price in AUD.

## Prediction Flow

1. The user enters shipment details in the Shipper workflow.
2. The frontend calls `POST /api/v1/price-insights/suggest`.
3. The backend geocodes origin and destination.
4. The backend requests route distance and duration from OpenRouteService.
5. Distance is converted to miles.
6. Weight is converted to pounds.
7. A simple Hours of Service rule adds rest time after long driving hours.
8. The XGBoost model predicts a log-price in USD.
9. The prediction is converted back from log scale with `np.expm1`.
10. The backend converts USD to AUD using the exchange rate.
11. The frontend displays the suggested price and reasoning to the user.

## Output

The backend returns:

- `suggested_price`: model-assisted price in AUD.
- `reasoning`: plain-English explanation with distance, driving hours, rest break time, weight, and category.
- `pure_driving_hours`: route driving time before rest adjustment.
- `actual_duration_hours`: estimated total time after rest adjustment.
- `distance_miles`: route distance used by the model.

## Data and Training Position

The repository currently contains the trained model artifact, but it does not yet include the full training dataset or training notebook. For final assessment, the team should clearly state whether the model was trained on real, simulated, or synthetic freight data.

For the MVP, it is acceptable to position the current model as a feasibility model if the team can explain:

- why the selected features are relevant to freight pricing,
- how synthetic or simulated data was generated or sourced,
- how the model was validated,
- what performance metrics were observed,
- what limits remain before production deployment.

## Validation Support

The repository includes MVP validation support for the pricing model:

```text
Backend/data/pricing_validation.csv
Backend/scripts/validate_pricing_model.py
```

Run it with:

```bash
cd Backend
python3.11 scripts/validate_pricing_model.py --show-rows
```

The committed dataset is a small synthetic dry-goods benchmark for demonstration support. It is useful for showing the validation method and comparing the XGBoost artifact with a rule-based baseline, but it should not be presented as production-grade freight pricing validation.

The script reports:

- MAE: average absolute pricing error.
- RMSE: error metric that penalises larger mistakes.
- R2: explanatory power compared with a baseline.
- Baseline comparison: compare XGBoost against a simple rule-based pricing formula.

## Known Limitations

- The committed repository does not currently include a full training dataset.
- The model uses only three numeric features, so it does not yet include fuel price, demand, carrier availability, service level, vehicle type, or lane history.
- Geocoding errors can affect route distance and therefore suggested price.
- Exchange rates and market pricing can change after the prediction.
- The model output should be treated as decision support, not an automatic contract price.
- The Hours of Service logic is simplified and should be replaced with regulation-aware scheduling before production use.

## Future Improvements

- Add a reproducible training script and training dataset description.
- Replace the synthetic validation benchmark with a larger real or anonymised historical validation set.
- Add dry-goods category features once enough data is available.
- Add fuel cost, lane demand, pickup urgency, vehicle capacity, and historical acceptance rate.
- Store prediction inputs and accepted prices for continuous improvement.
- Add confidence bands or price ranges instead of a single point estimate.

## Demo Explanation

Suggested short explanation for the live demo:

> LoadMind uses an XGBoost regression model for price suggestions because freight pricing is structured tabular data with non-linear relationships between distance, driving time, weight, and price. The backend geocodes the route, calculates driving distance and duration, adjusts for rest time, loads the XGBoost model from `Backend/xgboost_pricing_model.json`, and returns a suggested AUD price with reasoning. This is an MVP decision-support model, not an automatic contract price.
