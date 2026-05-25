import json
import logging
from pathlib import Path

import httpx
import numpy as np
import pandas as pd
import xgboost as xgb

from app.core.config import settings

logger = logging.getLogger(__name__)

MINIMUM_SUGGESTED_PRICE_AUD = 250.0

# Load model at module initialization
_MODEL = None
_MODEL_PATH = Path(__file__).parent.parent.parent / "xgboost_pricing_model.json"


def get_model():
    """Lazy load the XGBoost model."""
    global _MODEL
    if _MODEL is None:
        try:
            _MODEL = xgb.Booster()
            _MODEL.load_model(str(_MODEL_PATH))
            logger.info(f"Loaded XGBoost model from {_MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load XGBoost model: {e}")
            raise
    return _MODEL


async def get_route_info(
    origin_coords: list[float], destination_coords: list[float]
) -> dict:
    """
    Fetch route info from OpenRouteService.

    Args:
        origin_coords: [longitude, latitude]
        destination_coords: [longitude, latitude]

    Returns:
        dict with 'distance_meters' and 'duration_seconds'
    """
    url = "https://api.openrouteservice.org/v2/directions/driving-hgv"
    params = {
        "start": f"{origin_coords[0]},{origin_coords[1]}",
        "end": f"{destination_coords[0]},{destination_coords[1]}",
    }

    headers = {
        "Authorization": settings.ors_api_key,
        "Accept": "application/json, application/geo+json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

    features = data.get("features", [])
    if not features:
        raise ValueError("No route found in ORS response")

    summary = features[0].get("properties", {}).get("summary", {})
    distance_meters = summary.get("distance", 0)
    duration_seconds = summary.get("duration", 0)

    return {
        "distance_meters": distance_meters,
        "duration_seconds": duration_seconds,
    }


async def get_exchange_rate() -> float:
    """
    Fetch USD to AUD exchange rate from Frankfurter API.

    Returns:
        float: exchange rate (AUD per USD)
    """
    url = "https://api.frankfurter.dev/v2/rates"
    params = {"base": "USD", "quotes": "AUD"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    # Response is a list of objects
    if isinstance(data, list) and len(data) > 0:
        exchange_rate = data[0].get("rate", 1.5)  # fallback to ~1.5 if missing
    else:
        exchange_rate = 1.5  # fallback

    return float(exchange_rate)


def estimate_fallback_price_aud(weight_kg: float, cargo: str, load_type: str) -> float:
    """Estimate a conservative fallback price when live pricing is unavailable."""
    cargo_label = cargo.strip()
    load_type_label = load_type.strip().lower()

    weight_component = max(weight_kg * 0.08, 0.0)
    cargo_component = min(len(cargo_label) * 0.5, 35.0) if cargo_label else 0.0
    special_handling_component = 0.0
    if any(
        term in load_type_label
        for term in ("refrigerated", "temperature-controlled", "hazard", "oversize")
    ):
        special_handling_component = 60.0

    estimated_price = (
        MINIMUM_SUGGESTED_PRICE_AUD
        + weight_component
        + cargo_component
        + special_handling_component
    )
    return float(round(max(MINIMUM_SUGGESTED_PRICE_AUD, estimated_price), 2))


async def calculate_price(
    weight_kg: float,
    origin_coords: list[float],
    destination_coords: list[float],
) -> dict:
    """
    Calculate dynamic freight price using ORS, model, and Frankfurter API.

    Args:
        weight_kg: Weight in kilograms
        origin_coords: [longitude, latitude]
        destination_coords: [longitude, latitude]

    Returns:
        dict with pricing and routing details
    """
    # 1. Get route info
    route_info = await get_route_info(origin_coords, destination_coords)
    distance_meters = route_info["distance_meters"]
    duration_seconds = route_info["duration_seconds"]

    # 2. Convert units
    distance_miles = distance_meters * 0.000621371
    pure_driving_hours = duration_seconds / 3600

    # 3. Hours of Service logic (11 hours driving + 10 hour break)
    num_breaks = int(pure_driving_hours // 11)
    actual_duration_hours = pure_driving_hours + (num_breaks * 10)

    # 4. Convert weight
    weight_lbs = weight_kg * 2.20462

    # 5. Get exchange rate
    exchange_rate = await get_exchange_rate()

    # 6. Model prediction
    model = get_model()
    df = pd.DataFrame(
        {
            "weight_lbs": [int(weight_lbs)],
            "typical_distance_miles": [int(distance_miles)],
            "actual_duration_hours": [float(actual_duration_hours)],
        }
    )

    # XGBoost prediction (model outputs in log-dollars)
    dmatrix = xgb.DMatrix(df)
    log_prediction = model.predict(dmatrix)[0]

    # 7. Convert from log to actual USD
    predicted_usd = np.expm1(log_prediction)

    # 8. Convert to AUD
    predicted_aud = predicted_usd * exchange_rate

    return {
        "suggested_price": float(predicted_aud),
        "pure_driving_hours": float(pure_driving_hours),
        "actual_duration_hours": float(actual_duration_hours),
        "distance_miles": float(distance_miles),
        "predicted_usd": float(predicted_usd),
        "exchange_rate": float(exchange_rate),
    }
