"""Layout management API endpoints."""

from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.layout import LayoutCreate, LayoutResponse, ValidationResult
from app.services.layout_service import (
    LayoutService,
    LayoutNotFoundError,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
)

router = APIRouter()


def get_layout_service(db: Session = Depends(get_db)) -> LayoutService:
    """Dependency to get layout service."""
    return LayoutService(db)


@router.post("/projects/{project_id}/layouts", response_model=LayoutResponse, status_code=status.HTTP_201_CREATED)
def create_layout(
    project_id: int,
    layout_data: LayoutCreate,
    current_user: User = Depends(get_current_user),
    layout_service: LayoutService = Depends(get_layout_service),
):
    """
    Create a new layout version for a project.

    Args:
        project_id: Project ID
        layout_data: Layout creation data
        current_user: Current authenticated user
        layout_service: Layout service instance

    Returns:
        Created layout object
    """
    try:
        return layout_service.create(
            project_id=project_id,
            user=current_user,
            furniture_state=layout_data.furniture_state,
            tile_state=layout_data.tile_state,
        )
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )


@router.get("/projects/{project_id}/layouts/current", response_model=LayoutResponse)
def get_current_layout(
    project_id: int,
    current_user: User = Depends(get_current_user),
    layout_service: LayoutService = Depends(get_layout_service),
):
    """
    Get current layout for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        layout_service: Layout service instance

    Returns:
        Current layout object
    """
    try:
        return layout_service.get_current(project_id, current_user)
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )
    except LayoutNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current layout found"
        )


@router.get("/projects/{project_id}/layouts", response_model=List[LayoutResponse])
def list_layouts(
    project_id: int,
    current_user: User = Depends(get_current_user),
    layout_service: LayoutService = Depends(get_layout_service),
):
    """
    List all layout versions for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        layout_service: Layout service instance

    Returns:
        List of layouts ordered by version (descending)
    """
    try:
        return layout_service.list_by_project(project_id, current_user)
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )


@router.post("/projects/{project_id}/layouts/{layout_id}/restore", response_model=LayoutResponse)
def restore_layout(
    project_id: int,
    layout_id: int,
    current_user: User = Depends(get_current_user),
    layout_service: LayoutService = Depends(get_layout_service),
):
    """
    Restore a previous layout version as current.

    Args:
        project_id: Project ID
        layout_id: Layout ID to restore
        current_user: Current authenticated user
        layout_service: Layout service instance

    Returns:
        Restored layout object
    """
    try:
        return layout_service.restore(project_id, layout_id, current_user)
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )
    except LayoutNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layout not found"
        )


@router.post("/validate", response_model=ValidationResult)
def validate_furniture_layout(
    furniture_state: Dict[str, Any] = Body(...),
    room_dimensions: Dict[str, float] = Body(...),
):
    """
    Validate furniture layout for collisions and boundary violations.
    Does not save to database.

    Args:
        furniture_state: Furniture state dict with 'furnitures' list
        room_dimensions: Room dimensions dict with width, height, depth

    Returns:
        Validation result with collisions and out of bounds items
    """
    result = LayoutService.validate(furniture_state, room_dimensions)
    return result
