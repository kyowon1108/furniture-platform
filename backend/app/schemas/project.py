"""Project schemas for request/response validation."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    """Base project schema with common fields."""

    name: str
    description: Optional[str] = None
    room_width: float
    room_height: float
    room_depth: float
    has_3d_file: Optional[bool] = False
    file_type: Optional[str] = None  # 'ply' or 'glb'
    file_type: Optional[str] = None  # 'ply' or 'glb'
    has_ply_file: Optional[bool] = False  # Legacy support
    is_shared: Optional[bool] = False


class ProjectCreate(ProjectBase):
    """Schema for project creation."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for project updates (all fields optional)."""

    name: Optional[str] = None
    description: Optional[str] = None
    room_width: Optional[float] = None
    room_height: Optional[float] = None
    room_height: Optional[float] = None
    room_depth: Optional[float] = None
    is_shared: Optional[bool] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: int
    owner_id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    ply_file_path: Optional[str] = None  # Legacy support
    ply_file_size: Optional[int] = None  # Legacy support
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDetail(ProjectResponse):
    """Schema for detailed project response with current layout."""

    current_layout: Optional[Dict[str, Any]] = None
