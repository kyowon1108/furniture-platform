"""Layout schemas for request/response validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class LayoutCreate(BaseModel):
    """Schema for layout creation."""

    furniture_state: Dict[str, Any]
    tile_state: Optional[Dict[str, Any]] = None  # Free Build Mode tile textures/depth maps


class LayoutResponse(BaseModel):
    """Schema for layout response."""

    id: int
    project_id: int
    version: int
    furniture_state: Dict[str, Any]
    tile_state: Optional[Dict[str, Any]] = None  # Free Build Mode tile textures/depth maps
    is_current: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ValidationResult(BaseModel):
    """Schema for layout validation result."""

    valid: bool
    collisions: List[Dict[str, Any]]
    out_of_bounds: List[str]
