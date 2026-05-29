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


class RouteOptimizationShipmentStep(BaseModel):
    id: int
    description: str | None = None
    location: list[float]
    service: int = Field(default=0, ge=0)
    time_windows: list[list[int]] | None = None

    @model_validator(mode="after")
    def validate_time_windows(self) -> "RouteOptimizationShipmentStep":
        if self.time_windows is None:
            return self

        for window in self.time_windows:
            if len(window) != 2:
                raise ValueError(
                    "Each shipment time window must contain exactly two values."
                )

            start, end = window
            if start < 0 or end < 0:
                raise ValueError(
                    "Shipment time windows must not contain negative values."
                )
            if end <= start:
                raise ValueError("Shipment time window end must be greater than start.")
            if start == 0 and end == 0:
                raise ValueError("Shipment time windows must not be [0, 0].")

        return self


class RouteOptimizationShipment(BaseModel):
    id: int
    amount: list[int] = Field(default_factory=lambda: [1])
    pickup: RouteOptimizationShipmentStep
    delivery: RouteOptimizationShipmentStep

    @model_validator(mode="after")
    def validate_shipment(self) -> "RouteOptimizationShipment":
        if self.pickup.id == self.delivery.id:
            raise ValueError("Shipment pickup and delivery ids must be different.")
        if len(self.amount) != 1 or self.amount[0] <= 0:
            raise ValueError("Shipment amount must be a single positive value.")
        return self


class RouteOptimizationVehicle(BaseModel):
    id: int
    profile: str
    description: str | None = None
    start: list[float]
    end: list[float]
    time_window: list[int]
    capacity: list[int] = Field(default_factory=lambda: [1])

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

        if len(self.capacity) != 1 or self.capacity[0] <= 0:
            raise ValueError("Vehicle capacity must be a single positive value.")

        return self


class RouteOptimizationRequest(BaseModel):
    jobs: list[RouteOptimizationJob]
    shipments: list[RouteOptimizationShipment] = Field(default_factory=list)
    vehicles: list[RouteOptimizationVehicle]
