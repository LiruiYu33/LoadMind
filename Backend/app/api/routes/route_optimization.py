from __future__ import annotations

import logging
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps.auth import CurrentUser, get_current_user
from app.api.schemas.route_optimization import RouteOptimizationRequest
from app.core.config import settings

router = APIRouter(prefix="/api/v1/route-optimization", tags=["route-optimization"])
logger = logging.getLogger(__name__)

ORS_OPTIMIZATION_URL = "https://api.openrouteservice.org/optimization"


def _log_tasks(forwarded: dict) -> None:
    for job in forwarded.get("jobs", []):
        logger.info(
            "ORS job: id=%s description=%s location=%s service=%s time_windows=%s",
            job.get("id"),
            job.get("description"),
            job.get("location"),
            job.get("service"),
            job.get("time_windows"),
        )

    for shipment in forwarded.get("shipments", []):
        pickup = shipment.get("pickup", {})
        delivery = shipment.get("delivery", {})
        logger.info(
            "ORS shipment: id=%s pickup=%s delivery=%s",
            shipment.get("id"),
            {
                "id": pickup.get("id"),
                "description": pickup.get("description"),
                "location": pickup.get("location"),
                "service": pickup.get("service"),
                "time_windows": pickup.get("time_windows"),
            },
            {
                "id": delivery.get("id"),
                "description": delivery.get("description"),
                "location": delivery.get("location"),
                "service": delivery.get("service"),
                "time_windows": delivery.get("time_windows"),
            },
        )


def _task_description_by_id(forwarded: dict) -> dict[int, str | None]:
    descriptions: dict[int, str | None] = {}
    for job in forwarded.get("jobs", []):
        try:
            job_id = int(job.get("id"))
        except (TypeError, ValueError):
            continue
        descriptions[job_id] = job.get("description")

    for shipment in forwarded.get("shipments", []):
        pickup = shipment.get("pickup", {})
        delivery = shipment.get("delivery", {})
        for step, suffix in ((pickup, "pickup"), (delivery, "delivery")):
            try:
                step_id = int(step.get("id"))
            except (TypeError, ValueError, AttributeError):
                continue
            descriptions[step_id] = (
                f"{shipment.get('id')} {suffix}: {step.get('description')}"
            )
    return descriptions


def _normalize_time_windows(forwarded: dict) -> None:
    import time

    now = int(time.time())
    normalized = False

    def normalize_windows(container: dict, key: str) -> None:
        nonlocal normalized
        tw = container.get(key)
        if isinstance(tw, list):
            new_tw = []
            for window in tw:
                if isinstance(window, list) and len(window) >= 2:
                    s, e = int(window[0]), int(window[1])
                    if s < 1_000_000_000 or e < 1_000_000_000:
                        s = s + now if s < 1_000_000_000 else s
                        e = e + now if e < 1_000_000_000 else e
                        normalized = True
                    new_tw.append([s, e])
            container[key] = new_tw

    for job in forwarded.get("jobs", []):
        normalize_windows(job, "time_windows")

    for shipment in forwarded.get("shipments", []):
        pickup = shipment.get("pickup", {})
        delivery = shipment.get("delivery", {})
        if isinstance(pickup, dict):
            normalize_windows(pickup, "time_windows")
        if isinstance(delivery, dict):
            normalize_windows(delivery, "time_windows")

    for vehicle in forwarded.get("vehicles", []):
        tw = vehicle.get("time_window")
        if isinstance(tw, list) and len(tw) >= 2:
            s, e = int(tw[0]), int(tw[1])
            if s < 1_000_000_000 or e < 1_000_000_000:
                vehicle["time_window"] = [
                    s + now if s < 1_000_000_000 else s,
                    e + now if e < 1_000_000_000 else e,
                ]
                normalized = True

    if normalized:
        logger.info("Normalized relative time windows by adding epoch base %s", now)
        logger.info("Normalized payload:\n%s", json.dumps(forwarded, indent=2))


def _validate_time_windows(forwarded: dict) -> None:
    def validate_windows(owner: dict, key: str, label: str) -> None:
        tw = owner.get(key)
        if tw is None:
            return
        if not isinstance(tw, list):
            raise ValueError(f"Invalid {label} time windows.")
        for window in tw:
            if not isinstance(window, list) or len(window) != 2:
                raise ValueError(
                    f"Each {label} time window must contain exactly two values."
                )
            start, end = int(window[0]), int(window[1])
            if start < 0 or end < 0:
                raise ValueError(
                    f"{label.capitalize()} time windows must not contain negative values."
                )
            if end <= start:
                raise ValueError(
                    f"{label.capitalize()} time window end must be greater than start."
                )
            if start == 0 and end == 0:
                raise ValueError(
                    f"{label.capitalize()} time windows must not be [0, 0]."
                )

    def validate_single_window(owner: dict, key: str, label: str) -> None:
        tw = owner.get(key)
        if tw is None:
            return
        if not isinstance(tw, list) or len(tw) != 2:
            raise ValueError(
                f"Each {label} time window must contain exactly two values."
            )

        start, end = int(tw[0]), int(tw[1])
        if start < 0 or end < 0:
            raise ValueError(
                f"{label.capitalize()} time window must not contain negative values."
            )
        if end <= start:
            raise ValueError(
                f"{label.capitalize()} time window end must be greater than start."
            )
        if start == 0 and end == 0:
            raise ValueError(f"{label.capitalize()} time window must not be [0, 0].")

    for job in forwarded.get("jobs", []):
        validate_windows(job, "time_windows", "job")

    for shipment in forwarded.get("shipments", []):
        validate_windows(shipment.get("pickup", {}), "time_windows", "shipment pickup")
        validate_windows(
            shipment.get("delivery", {}), "time_windows", "shipment delivery"
        )

    for vehicle in forwarded.get("vehicles", []):
        validate_single_window(vehicle, "time_window", "vehicle")


@router.post("/optimize")
async def optimize_route(
    payload: RouteOptimizationRequest,
    _: CurrentUser = Depends(get_current_user),
) -> dict:
    if not settings.ors_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenRouteService is not configured on the backend.",
        )

    headers = {
        "Authorization": settings.ors_api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    # Log the exact payload we'll forward to ORS to aid debugging of 400 errors.
    try:
        forwarded = payload.model_dump(mode="json")
        _log_tasks(forwarded)
        logger.info(
            "Forwarding ORS optimization payload:\n%s", json.dumps(forwarded, indent=2)
        )
    except Exception:
        logger.exception("Failed to serialize ORS payload for logging")

    # Normalize time windows: if values look like relative offsets (small ints),
    # convert them to absolute epoch seconds by adding current time.
    try:
        _normalize_time_windows(forwarded)
    except Exception:
        logger.exception("Failed to normalize time windows")

    try:
        _validate_time_windows(forwarded)
    except ValueError as exc:
        logger.error("Invalid ORS optimization payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ORS_OPTIMIZATION_URL,
                headers=headers,
                json=forwarded,
            )
    except httpx.HTTPError as exc:
        logger.error("OpenRouteService optimization request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouteService request failed.",
        ) from exc

    if response.status_code >= 400:
        # Log response body for debugging
        resp_text = response.text
        logger.error(
            "OpenRouteService returned error status %s: %s",
            response.status_code,
            resp_text,
        )

        message = "OpenRouteService optimization failed."
        try:
            body = response.json()
            if isinstance(body, dict):
                error = body.get("error")
                if isinstance(error, dict) and isinstance(error.get("message"), str):
                    message = error["message"]
                elif isinstance(body.get("message"), str):
                    message = body["message"]
        except Exception:
            # leave message as-is
            pass

        # Return a concise message but keep full response in server logs.
        raise HTTPException(status_code=response.status_code, detail=f"{message}")

    try:
        data = response.json()
    except ValueError as exc:
        logger.error("OpenRouteService returned invalid JSON")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenRouteService returned an invalid response.",
        ) from exc

    if isinstance(data, dict):
        unassigned = data.get("unassigned")
        if isinstance(unassigned, list) and unassigned:
            descriptions = _task_description_by_id(forwarded)
            for item in unassigned:
                try:
                    job_id = int(item.get("id"))
                except (TypeError, ValueError, AttributeError):
                    job_id = None
                logger.warning(
                    "ORS unassigned job: id=%s description=%s",
                    job_id,
                    descriptions.get(job_id) if job_id is not None else None,
                )

    return data
