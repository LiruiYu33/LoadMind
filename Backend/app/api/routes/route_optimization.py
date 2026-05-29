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


def _log_jobs(forwarded: dict) -> None:
    for job in forwarded.get("jobs", []):
        logger.info(
            "ORS job: id=%s description=%s location=%s service=%s time_windows=%s",
            job.get("id"),
            job.get("description"),
            job.get("location"),
            job.get("service"),
            job.get("time_windows"),
        )


def _job_description_by_id(forwarded: dict) -> dict[int, str | None]:
    descriptions: dict[int, str | None] = {}
    for job in forwarded.get("jobs", []):
        try:
            job_id = int(job.get("id"))
        except (TypeError, ValueError):
            continue
        descriptions[job_id] = job.get("description")
    return descriptions


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
        _log_jobs(forwarded)
        logger.info(
            "Forwarding ORS optimization payload:\n%s", json.dumps(forwarded, indent=2)
        )
    except Exception:
        logger.exception("Failed to serialize ORS payload for logging")

    # Normalize time windows: if values look like relative offsets (small ints),
    # convert them to absolute epoch seconds by adding current time.
    try:
        import time

        now = int(time.time())
        normalized = False

        # jobs -> time_windows: list[list[int]]
        for job in forwarded.get("jobs", []):
            tw = job.get("time_windows")
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
                job["time_windows"] = new_tw

        # vehicles -> time_window: list[int]
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
    except Exception:
        logger.exception("Failed to normalize time windows")

    try:
        for job in forwarded.get("jobs", []):
            tw = job.get("time_windows")
            if tw is None:
                continue
            for window in tw:
                if not isinstance(window, list) or len(window) != 2:
                    raise ValueError(
                        "Each job time window must contain exactly two values."
                    )
                start, end = int(window[0]), int(window[1])
                if start < 0 or end < 0:
                    raise ValueError(
                        "Job time windows must not contain negative values."
                    )
                if end <= start:
                    raise ValueError("Job time window end must be greater than start.")
                if start == 0 and end == 0:
                    raise ValueError("Job time windows must not be [0, 0].")

        for vehicle in forwarded.get("vehicles", []):
            tw = vehicle.get("time_window")
            if not isinstance(tw, list) or len(tw) != 2:
                raise ValueError("Vehicle time_window must contain exactly two values.")
            start, end = int(tw[0]), int(tw[1])
            if start < 0 or end < 0:
                raise ValueError(
                    "Vehicle time_window must not contain negative values."
                )
            if end <= start:
                raise ValueError("Vehicle time_window end must be greater than start.")
            if start == 0 and end == 0:
                raise ValueError("Vehicle time_window must not be [0, 0].")
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
            descriptions = _job_description_by_id(forwarded)
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
