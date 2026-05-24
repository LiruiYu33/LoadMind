from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps.auth import CurrentUser, get_current_user
from app.api.schemas.loads import LoadAssignRequest, LoadCreateRequest, LoadResponse
from app.integrations.supabase.client import supabase_client

router = APIRouter(prefix="/api/v1/loads", tags=["loads"])


def _actor_confirmation_field(load: dict, user_id: str, phase: str) -> str:
    shipper_id = load.get("shipper_id")
    carrier_id = load.get("assigned_carrier_id")

    if user_id == shipper_id:
        return f"{phase}_confirmed_by_shipper_at"
    if user_id == carrier_id:
        return f"{phase}_confirmed_by_carrier_at"

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not a participant of this load.",
    )


def _get_load_or_404(load_id: str) -> dict:
    try:
        load = supabase_client.get_load_by_id(load_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load not found.",
        )

    return load


@router.get("/open", response_model=list[LoadResponse])
def get_open_loads(_: CurrentUser = Depends(get_current_user)) -> list[LoadResponse]:
    try:
        rows = supabase_client.list_open_loads()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return [LoadResponse.model_validate(row) for row in rows]


@router.post("", response_model=LoadResponse, status_code=status.HTTP_201_CREATED)
def create_load(
    payload: LoadCreateRequest, user: CurrentUser = Depends(get_current_user)
) -> LoadResponse:
    weight = float(payload.weight_kg)
    value = (
        float(payload.value)
        if payload.value is not None
        else round(weight * 0.42 + 800)
    )
    predicted_margin = round(value * 0.22)

    routing_hint = abs(hash(f"{payload.origin}:{payload.destination}:{weight}"))
    match_score = 84 + (routing_hint % 12)
    empty_miles_saved = 80 + (routing_hint % 240)

    ai_reasoning = (
        f"New listing - {payload.cargo} matches active capacity on "
        f"{payload.origin} -> {payload.destination}."
    )

    shipment_code = payload.shipment_code or f"LM-{uuid4().hex[:8].upper()}"

    insert_payload = {
        "shipper_id": user.id,
        "shipment_code": shipment_code,
        "cargo": payload.cargo,
        "origin": payload.origin,
        "destination": payload.destination,
        "route_origin": payload.origin,
        "route_destination": payload.destination,
        "weight_kg": weight,
        "load_type": payload.load_type,
        "length_cm": payload.length_cm,
        "width_cm": payload.width_cm,
        "height_cm": payload.height_cm,
        "pickup_time": payload.pickup_time.isoformat(),
        "dropoff_time": payload.dropoff_time.isoformat(),
        "value": value,
        "predicted_margin": predicted_margin,
        "match_score": match_score,
        "empty_miles_saved": empty_miles_saved,
        "ai_reasoning": ai_reasoning,
        "status": "open",
    }

    try:
        row = supabase_client.create_load(insert_payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return LoadResponse.model_validate(row)


@router.post("/{load_id}/assign", response_model=LoadResponse)
def assign_load(
    load_id: str,
    payload: LoadAssignRequest,
    user: CurrentUser = Depends(get_current_user),
) -> LoadResponse:
    try:
        vehicle = supabase_client.get_vehicle_for_owner(payload.vehicle_id, user.id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found for this carrier.",
        )

    carrier_label = None
    if user.email and "@" in user.email:
        carrier_label = user.email.split("@", 1)[0]
    if not carrier_label:
        carrier_label = f"Carrier-{user.id[:8]}"

    assigned_at = datetime.now(timezone.utc).isoformat()

    try:
        row = supabase_client.assign_open_load(
            load_id,
            {
                "status": "scheduled",
                "assigned_vehicle_id": vehicle["id"],
                "assigned_vehicle_unit": vehicle.get("unit_id"),
                "assigned_carrier_id": user.id,
                "assigned_carrier_name": carrier_label,
                "assigned_at": assigned_at,
            },
        )
        supabase_client.create_assignment(
            {
                "carrier_id": user.id,
                "load_id": load_id,
                "vehicle_id": vehicle["id"],
                "status": "active",
            }
        )
        supabase_client.set_vehicle_status(vehicle["id"], "active")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return LoadResponse.model_validate(row)


@router.post("/{load_id}/cancel", response_model=LoadResponse)
def cancel_open_load(
    load_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> LoadResponse:
    load = _get_load_or_404(load_id)

    if load.get("shipper_id") != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the shipper who posted this load can cancel it.",
        )

    if load.get("status") != "open":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only open marketplace listings can be cancelled.",
        )

    try:
        row = supabase_client.update_load(
            load_id=load_id,
            expected_status="open",
            payload={"status": "cancelled"},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not row:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Load is no longer open.",
        )

    return LoadResponse.model_validate(row)


@router.post("/{load_id}/restore", response_model=LoadResponse)
def restore_cancelled_load(
    load_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> LoadResponse:
    load = _get_load_or_404(load_id)

    if load.get("shipper_id") != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the shipper who posted this load can restore it.",
        )

    if load.get("status") != "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only cancelled marketplace listings can be restored.",
        )

    try:
        row = supabase_client.update_load(
            load_id=load_id,
            expected_status="cancelled",
            payload={"status": "open"},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not row:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Load is no longer cancelled.",
        )

    return LoadResponse.model_validate(row)


@router.post("/{load_id}/confirm-pickup", response_model=LoadResponse)
def confirm_pickup(
    load_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> LoadResponse:
    load = _get_load_or_404(load_id)
    actor_field = _actor_confirmation_field(load, user.id, "pickup")

    if load.get("status") == "open":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Load must be assigned before pickup confirmation.",
        )

    current_status = str(load.get("status"))
    if current_status not in {"scheduled", "in_transit", "delivered"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pickup confirmation is only allowed on scheduled or active loads.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    if not load.get(actor_field):
        try:
            updated = supabase_client.update_load(
                load_id=load_id,
                payload={actor_field: now_iso},
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

        if updated:
            load = updated

    if (
        load.get("status") == "scheduled"
        and load.get("pickup_confirmed_by_shipper_at")
        and load.get("pickup_confirmed_by_carrier_at")
    ):
        try:
            transitioned = supabase_client.update_load(
                load_id=load_id,
                expected_status="scheduled",
                payload={"status": "in_transit"},
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

        if transitioned:
            load = transitioned
        else:
            load = _get_load_or_404(load_id)

    return LoadResponse.model_validate(load)


@router.post("/{load_id}/confirm-delivery", response_model=LoadResponse)
def confirm_delivery(
    load_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> LoadResponse:
    load = _get_load_or_404(load_id)
    actor_field = _actor_confirmation_field(load, user.id, "delivered")

    current_status = str(load.get("status"))
    if current_status not in {"in_transit", "delivered"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery confirmation is only allowed for in-transit loads.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    if not load.get(actor_field):
        try:
            updated = supabase_client.update_load(
                load_id=load_id,
                payload={actor_field: now_iso},
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

        if updated:
            load = updated

    if (
        load.get("status") == "in_transit"
        and load.get("delivered_confirmed_by_shipper_at")
        and load.get("delivered_confirmed_by_carrier_at")
    ):
        completion_payload = {
            "status": "delivered",
            "completed_at": now_iso,
        }

        try:
            transitioned = supabase_client.update_load(
                load_id=load_id,
                expected_status="in_transit",
                payload=completion_payload,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

        if transitioned:
            load = transitioned
        else:
            load = _get_load_or_404(load_id)

        if load.get("status") == "delivered":
            try:
                assigned_carrier_id = load.get("assigned_carrier_id")
                if isinstance(assigned_carrier_id, str) and assigned_carrier_id:
                    supabase_client.complete_active_assignment(
                        load_id, assigned_carrier_id
                    )
                vehicle_id = load.get("assigned_vehicle_id")
                if isinstance(vehicle_id, str) and vehicle_id:
                    supabase_client.set_vehicle_status(vehicle_id, "idle")
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=str(exc),
                ) from exc

    return LoadResponse.model_validate(load)
