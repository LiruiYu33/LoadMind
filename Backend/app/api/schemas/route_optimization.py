from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class RouteOptimizationPoint(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")


class RouteOptimizationJob(BaseModel):
    id: int
    description: str | None = None
    location: list[float]
    service: int = Field(default=0, ge=0)
    time_windows: list[list[int]] | None = None

    @model_validator(mode="after")
    def validate_time_windows(self) -> "RouteOptimizationJob":
        if self.time_windows is None:
            return self

        for window in self.time_windows:
            if len(window) != 2:
                raise ValueError(
                    "Each job time window must contain exactly two values."
                )

            start, end = window
            if start < 0 or end < 0:
                raise ValueError("Job time windows must not contain negative values.")
            if end <= start:
                raise ValueError("Job time window end must be greater than start.")
            if start == 0 and end == 0:
                raise ValueError("Job time windows must not be [0, 0].")

        return self


class RouteOptimizationVehicle(BaseModel):
    id: int
    profile: str
    description: str | None = None
    start: list[float]
    end: list[float]
    time_window: list[int]

    @model_validator(mode="after")
    def validate_time_window(self) -> "RouteOptimizationVehicle":
        if len(self.time_window) != 2:
            raise ValueError("Vehicle time_window must contain exactly two values.")

        start, end = self.time_window
        if start < 0 or end < 0:
            raise ValueError("Vehicle time_window must not contain negative values.")
        if end <= start:
            raise ValueError("Vehicle time_window end must be greater than start.")
        if start == 0 and end == 0:
            raise ValueError("Vehicle time_window must not be [0, 0].")

        return self


class RouteOptimizationRequest(BaseModel):
    jobs: list[RouteOptimizationJob]
    vehicles: list[RouteOptimizationVehicle]
