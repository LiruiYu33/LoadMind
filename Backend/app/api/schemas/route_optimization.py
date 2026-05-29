from __future__ import annotations

from pydantic import BaseModel, Field


class RouteOptimizationPoint(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")


class RouteOptimizationJob(BaseModel):
    id: int
    description: str | None = None
    location: list[float]
    service: int = Field(default=0, ge=0)
    time_windows: list[list[int]] | None = None


class RouteOptimizationVehicle(BaseModel):
    id: int
    profile: str
    description: str | None = None
    start: list[float]
    end: list[float]
    time_window: list[int]


class RouteOptimizationRequest(BaseModel):
    jobs: list[RouteOptimizationJob]
    vehicles: list[RouteOptimizationVehicle]
