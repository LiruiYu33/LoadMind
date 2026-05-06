# Price Insights API Implementation

## Overview

The Price Insights API endpoint provides dynamic freight price predictions using:
- **OpenRouteService**: Route distance and duration calculation
- **Hours of Service (HOS) Logic**: Applies 10-hour breaks after 11 hours of driving
- **XGBoost Model**: Trained pricing model for prediction
- **Frankfurter API**: Real-time USD to AUD exchange rates
- **Async/Await**: Non-blocking HTTP calls
- **Celery + Redis**: Optional async task processing (available but not required)

## Endpoint

### POST `/api/v1/price-insights/suggest`

**Request Body** (JSON):
```json
{
  "cargo": "Refrigerated produce pallets",
  "origin": "Melbourne, VIC",
  "destination": "Sydney, NSW",
  "weight_kg": 4500,
  "load_type": "Reefer Produce",
  "length_cm": 200,
  "width_cm": 120,
  "height_cm": 180,
  "pickup_time": "2026-05-10T08:00:00",
  "dropoff_time": "2026-05-11T17:00:00"
}
```

**Response** (JSON):
```json
{
  "suggested_price": 2840.50,
  "reasoning": "Route: 903 miles, 13.5h driving + 10.0h break = 23.5h total. Weight: 9921 lbs. Category: Reefer Produce.",
  "pure_driving_hours": 13.5,
  "actual_duration_hours": 23.5,
  "distance_miles": 903.0
}
```

## Calculation Flow

### Step 1: Geocoding
- Convert location strings (`origin`, `destination`) to coordinates via ORS Geocoding API
- Returns `[longitude, latitude]` pairs

### Step 2: Route Information
- Call ORS Directions API with `driving-hgv` profile
- Extract from GeoJSON response:
  - `distance` (meters)
  - `duration` (seconds)

### Step 3: Unit Conversions
- Distance: meters → miles (`* 0.000621371`)
- Duration: seconds → hours (`/ 3600`)

### Step 4: Hours of Service Logic
- **Pure Driving Hours**: Duration in hours from step 3
- **Break Time**: `(pure_driving_hours // 11) * 10` hours
  - Example: 13.5 hours driving → 1 break of 10 hours
- **Actual Duration**: Pure driving + break time

### Step 5: Weight Conversion
- Weight: kg → lbs (`* 2.20462`)

### Step 6: Exchange Rate
- Fetch USD/AUD rate from Frankfurter API v2
- Uses live market data

### Step 7: Model Prediction
- Load XGBoost model from `xgboost_pricing_model.json`
- Create DataFrame with three features:
  - `typical_distance_miles` (float)
  - `actual_duration_hours` (float)
  - `weight_lbs` (float)
- Model outputs log-dollars

### Step 8: Currency Conversion
- Convert log-dollars to USD: `numpy.expm1(prediction)`
- Convert USD to AUD: `predicted_usd * exchange_rate`

### Step 9: Response
- Return suggested price in AUD, routing details, and reasoning

## Files

### `/app/api/routes/price_insights.py`
- FastAPI router
- `POST /api/v1/price-insights/suggest` endpoint
- Geocoding helper function
- Error handling (400, 502)

### `/app/api/schemas/price_insights.py`
- `PriceSuggestionRequest`: Input validation
- `PriceSuggestionResponse`: Output model

### `/app/ai/pricing.py`
- Core calculation logic
- `get_route_info()`: ORS directions API call
- `get_exchange_rate()`: Frankfurter API call
- `calculate_price()`: Main orchestration function
- Model loading & prediction

### `/app/workers/celery_app.py`
- Celery task: `calculate_freight_price()`
- Wraps async logic with `asyncio.run()`
- Optional: For offloading heavy calculations

### `/app/core/config.py`
- Updated with `ors_api_key` setting

### `/app/main.py`
- Registered `price_insights_router`

## Configuration

### Environment Variables (`.env`)
```
ORS_API_KEY=<your_key>
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

### Dependencies (added to `pyproject.toml`)
- `xgboost>=2.0.0`
- `pandas>=2.0.0`
- `numpy>=1.24.0`

## Example Usage (cURL)

```bash
curl -X POST "http://localhost:8000/api/v1/price-insights/suggest" \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": "Steel beams",
    "origin": "Melbourne, VIC",
    "destination": "Sydney, NSW",
    "weight_kg": 5000,
    "load_type": "Flatbed Steel",
    "pickup_time": "2026-05-10T10:00:00",
    "dropoff_time": "2026-05-12T14:00:00"
  }'
```

## Error Handling

- **400 Bad Request**: Invalid location (geocoding failed), missing required fields
- **502 Bad Gateway**: OpenRouteService, Frankfurter, or model loading errors
- **Validation**: Pydantic validates all inputs (e.g., dropoff > pickup)

## Notes

1. **Async I/O**: All HTTP calls use `httpx.AsyncClient` for non-blocking I/O
2. **Model Loading**: Lazy-loaded on first request; cached thereafter
3. **Geocoding**: Uses ORS search API; may return approximate results for ambiguous locations
4. **Exchange Rate**: Cached per-request; consider adding TTL caching for high volume
5. **HOS Logic**: Simple model (11h drive + 10h break); can be enhanced with real HOS regulations
6. **Celery Task**: Available for async job processing if needed; call with `.delay()`

## Future Enhancements

- Cache exchange rates (Redis with TTL)
- Add rate limiting on geocoding
- Store pricing history for analytics
- Integrate with real-time freight market data
- Support multiple vehicle profiles (van, flatbed, reefer, etc.)
