from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PriceSuggestionRequest(BaseModel):
    cargo: str = Field(min_length=1, max_length=120)
    origin: str = Field(min_length=1, max_length=240)
    destination: str = Field(min_length=1, max_length=240)
    weight_kg: float = Field(gt=0, le=100000)
    load_type: str = Field(min_length=1, max_length=80)
    length_cm: int | None = Field(default=None, ge=1, le=100000)
    width_cm: int | None = Field(default=None, ge=1, le=100000)
    height_cm: int | None = Field(default=None, ge=1, le=100000)
    pickup_time: datetime
    dropoff_time: datetime


class PriceSuggestionResponse(BaseModel):
    suggested_price: float = Field(description="Suggested price in AUD")
    reasoning: str | None = Field(
        default=None, description="AI reasoning for the price"
    )
    pure_driving_hours: float | None = Field(
        default=None, description="Pure driving hours from ORS"
    )
    actual_duration_hours: float | None = Field(
        default=None, description="Actual duration including breaks"
    )
    distance_miles: float | None = Field(default=None, description="Distance in miles")
