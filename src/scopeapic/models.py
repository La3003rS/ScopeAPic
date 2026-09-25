from typing import Any

from pydantic import BaseModel, Field


class AnalysisResponse(BaseModel):
    file: dict[str, Any] = Field(default_factory=dict)
    camera: dict[str, Any] = Field(default_factory=dict)
    exposure: dict[str, Any] = Field(default_factory=dict)
    capture: dict[str, Any] = Field(default_factory=dict)
    location: dict[str, Any] = Field(default_factory=dict)
    gps: dict[str, Any] = Field(default_factory=dict)
    privacy: dict[str, Any] = Field(default_factory=dict)
    identifiers: dict[str, Any] = Field(default_factory=dict)
    image: dict[str, Any] = Field(default_factory=dict)
    fujifilm: dict[str, Any] = Field(default_factory=dict)
    metadata: list[dict[str, Any]] = Field(default_factory=list)
    metadata_count: int = 0
