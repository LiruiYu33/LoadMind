from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class LoadCreateRequest(BaseModel):
    cargo: str = Field(min_length=1, max_length=500)
    shipment_code: str | None = Field(default=None, min_length=3, max_length=40)
    origin: str = Field(min_length=1, max_length=240)
    destination: str = Field(min_length=1, max_length=240)
    weight_kg: float = Field(gt=0, le=24000)
    load_type: str = Field(min_length=1, max_length=80)
    value: float | None = Field(default=None, gt=0)
    # Dimensions are required (cm). Set realistic upper bounds for validation.
    # Length: typical heavy vehicle max ~16 m (1600 cm)
    # Width: typical maximum ~2.5 m (250 cm)
    # Height: typical maximum ~4.0 m (400 cm)
    length_cm: int = Field(..., ge=1, le=1600)
    width_cm: int = Field(..., ge=1, le=250)
    height_cm: int = Field(..., ge=1, le=400)
    pickup_time: datetime
    dropoff_time: datetime

    @model_validator(mode="after")
    def validate_timepoints(self) -> "LoadCreateRequest":
        if self.dropoff_time <= self.pickup_time:
            raise ValueError("Dropoff time must be after pickup time.")
        return self


class LoadResponse(BaseModel):
    id: str
    shipper_id: str | None = None
    origin: str
    destination: str
    shipment_code: str | None = None
    cargo: str | None = None
    route_origin: str | None = None
    route_destination: str | None = None
    weight_kg: float
    load_type: str
    value: float
    predicted_margin: float
    net_margin: float | None = None
    empty_miles_saved: int | None = None
    match_score: int | None = None
    ai_reasoning: str | None = None
    pickup_time: datetime
    dropoff_time: datetime
    length_cm: int
    width_cm: int
    height_cm: int
    assigned_vehicle_id: str | None = None
    assigned_vehicle_unit: str | None = None
    assigned_carrier_id: str | None = None
    assigned_carrier_name: str | None = None
    assigned_at: datetime | None = None
    pickup_confirmed_by_shipper_at: datetime | None = None
    pickup_confirmed_by_carrier_at: datetime | None = None
    delivered_confirmed_by_shipper_at: datetime | None = None
    delivered_confirmed_by_carrier_at: datetime | None = None
    completed_at: datetime | None = None
    status: str
    created_at: datetime


class LoadAssignRequest(BaseModel):
    vehicle_id: str = Field(min_length=1)
