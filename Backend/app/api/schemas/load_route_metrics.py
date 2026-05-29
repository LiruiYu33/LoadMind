from __future__ import annotations

from pydantic import BaseModel, Field


class LoadRouteMetricsRequest(BaseModel):
    origin: str = Field(min_length=1, max_length=240)
    destination: str = Field(min_length=1, max_length=240)


class LoadRouteMetricsResponse(BaseModel):
    distance_km: float = Field(ge=0)
    duration_seconds: float = Field(ge=0)
