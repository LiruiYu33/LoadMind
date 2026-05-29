from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, status

from app.ai.pricing import calculate_price, estimate_fallback_price_aud
from app.api.schemas.price_insights import (
    PriceSuggestionRequest,
    PriceSuggestionResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/api/v1/price-insights", tags=["price-insights"])
logger = logging.getLogger(__name__)


async def geocode_location(location: str) -> list[float]:
    """
    Geocode a location string to [longitude, latitude] using OpenRouteService.

    Args:
        location: Location name (e.g., "Melbourne, VIC")

    Returns:
        [longitude, latitude]
    """
    url = "https://api.openrouteservice.org/geocode/search"
    params = {"text": location, "size": 1}

    headers = {
        "Authorization": settings.ors_api_key,
        "Accept": "application/json, application/geo+json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        features = data.get("features", [])
        if not features:
            raise ValueError(f"No geocoding results for: {location}")

        coords = features[0].get("geometry", {}).get("coordinates", [])
        if not coords or len(coords) < 2:
            raise ValueError(f"Invalid coordinates for: {location}")

        return [float(coords[0]), float(coords[1])]
    except Exception as e:
        logger.error(f"Geocoding error for {location}: {e}")
        raise


@router.post(
    "/suggest", response_model=PriceSuggestionResponse, status_code=status.HTTP_200_OK
)
async def suggest_price(payload: PriceSuggestionRequest) -> PriceSuggestionResponse:
    """
    Suggest a dynamic freight price based on route, weight, and timing.

    Takes location names and converts them to coordinates, then uses the XGBoost model
    to predict pricing. Includes HOS (Hours of Service) logic.
    """
    cargo_label = payload.cargo.strip() or "General freight"
    try:
        # 1. Geocode locations
        origin_coords = await geocode_location(payload.origin)
        destination_coords = await geocode_location(payload.destination)

        # 2. Calculate price
        pricing_result = await calculate_price(
            weight_kg=payload.weight_kg,
            origin_coords=origin_coords,
            destination_coords=destination_coords,
        )

        # 3. Build reasoning
        distance_miles = pricing_result["distance_miles"]
        pure_hours = pricing_result["pure_driving_hours"]
        actual_hours = pricing_result["actual_duration_hours"]
        weight_lbs = payload.weight_kg * 2.20462

        reasoning = (
            f"Route: {distance_miles:.0f} miles, "
            f"{pure_hours:.1f}h driving + {actual_hours - pure_hours:.1f}h break = {actual_hours:.1f}h total. "
            f"Weight: {weight_lbs:.0f} lbs. Category: {payload.load_type}."
        )

        return PriceSuggestionResponse(
            suggested_price=pricing_result["suggested_price"],
            reasoning=reasoning,
            pure_driving_hours=pricing_result["pure_driving_hours"],
            actual_duration_hours=pricing_result["actual_duration_hours"],
            distance_miles=pricing_result["distance_miles"],
        )
    except Exception as e:
        logger.error(f"Error suggesting price, returning fallback estimate: {e}")
        fallback_price = estimate_fallback_price_aud(
            weight_kg=payload.weight_kg,
            cargo=payload.cargo,
            load_type=payload.load_type,
        )
        return PriceSuggestionResponse(
            suggested_price=fallback_price,
            reasoning=(
                f"Live AI pricing is unavailable for {cargo_label}. "
                f"A conservative fallback price was applied for this shipment."
            ),
            pure_driving_hours=None,
            actual_duration_hours=None,
            distance_miles=None,
        )
