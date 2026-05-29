from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


class PriceSuggestionRequest(BaseModel):
    cargo: str = Field(default="", max_length=500)
    origin: str = Field(min_length=1, max_length=240)
    destination: str = Field(min_length=1, max_length=240)
    weight_kg: float = Field(gt=0, le=24000)
    load_type: str = Field(min_length=1, max_length=80)
    length_cm: int | None = Field(default=None, ge=1, le=100000)
    width_cm: int | None = Field(default=None, ge=1, le=100000)
    height_cm: int | None = Field(default=None, ge=1, le=100000)
    pickup_time: datetime
    dropoff_time: datetime

    @field_validator("cargo", mode="before")
    @classmethod
    def normalize_cargo(cls, value: object) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        return str(value).strip()

    @model_validator(mode="after")
    def validate_timepoints(self) -> "PriceSuggestionRequest":
        if self.dropoff_time <= self.pickup_time:
            raise ValueError("Dropoff time must be after pickup time.")
        return self


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
