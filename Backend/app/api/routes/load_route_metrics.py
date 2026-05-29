from __future__ import annotations

import logging
from asyncio import gather

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps.auth import CurrentUser, get_current_user
from app.api.routes.price_insights import geocode_location
from app.api.schemas.load_route_metrics import (
    LoadRouteMetricsRequest,
    LoadRouteMetricsResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/api/v1/load-insights", tags=["load-insights"])
logger = logging.getLogger(__name__)


@router.post(
    "/route-metrics",
    response_model=LoadRouteMetricsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_load_route_metrics(
    payload: LoadRouteMetricsRequest,
    _: CurrentUser = Depends(get_current_user),
) -> LoadRouteMetricsResponse:
    if not settings.ors_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenRouteService is not configured on the backend.",
        )

    try:
        origin_coords, destination_coords = await _resolve_route_coords(payload)
    except Exception as exc:
        logger.error("Failed to geocode route metrics inputs: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not resolve load route coordinates.",
        ) from exc

    params = {
        "start": f"{origin_coords[0]},{origin_coords[1]}",
        "end": f"{destination_coords[0]},{destination_coords[1]}",
    }
    headers = {
        "Authorization": settings.ors_api_key,
        "Accept": "application/json, application/geo+json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.openrouteservice.org/v2/directions/driving-hgv",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("OpenRouteService route metrics request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouteService request failed.",
        ) from exc

    try:
        summary = data["features"][0]["properties"]["summary"]
        distance_km = float(summary["distance"]) / 1000.0
        duration_seconds = float(summary["duration"])
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.error("OpenRouteService returned unexpected route metrics payload")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouteService returned an invalid response.",
        ) from exc

    return LoadRouteMetricsResponse(
        distance_km=distance_km,
        duration_seconds=duration_seconds,
    )


async def _resolve_route_coords(
    payload: LoadRouteMetricsRequest,
) -> tuple[list[float], list[float]]:
    origin = payload.origin.strip()
    destination = payload.destination.strip()

    if not origin or not destination:
        raise ValueError("Origin and destination are required.")

    origin_coords, destination_coords = await gather(
        geocode_location(origin),
        geocode_location(destination),
    )
    return origin_coords, destination_coords
