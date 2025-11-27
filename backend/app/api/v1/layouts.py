"""Layout management API endpoints."""

from typing import Any, Dict, List

from app.api.deps import get_current_user
from app.core.collision import validate_layout
from app.database import get_db
from app.models.layout import Layout
from app.models.project import Project
from app.models.user import User
from app.schemas.layout import LayoutCreate, LayoutResponse, ValidationResult
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


def verify_project_access(project_id: int, user_id: int, db: Session) -> Project:
    """Helper function to verify project access."""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != user_id and not project.is_shared:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project")

    return project


@router.post("/projects/{project_id}/layouts", response_model=LayoutResponse, status_code=status.HTTP_201_CREATED)
def create_layout(
    project_id: int,
    layout_data: LayoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new layout version for a project.

    Args:
        project_id: Project ID
        layout_data: Layout creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created layout object
    """
    # Verify project access
    verify_project_access(project_id, current_user.id, db)

    # Set all existing layouts to not current
    db.query(Layout).filter(Layout.project_id == project_id).update({"is_current": False})

    # Get max version number
    max_version = db.query(Layout).filter(Layout.project_id == project_id).count()

    # Create new layout
    new_layout = Layout(
        project_id=project_id, version=max_version + 1, furniture_state=layout_data.furniture_state, is_current=True
    )

    db.add(new_layout)
    db.commit()
    db.refresh(new_layout)

    return new_layout


@router.get("/projects/{project_id}/layouts/current", response_model=LayoutResponse)
def get_current_layout(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current layout for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Current layout object
    """
    # Verify project access
    verify_project_access(project_id, current_user.id, db)

    layout = db.query(Layout).filter(Layout.project_id == project_id, Layout.is_current == True).first()

    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No current layout found")

    return layout


@router.get("/projects/{project_id}/layouts", response_model=List[LayoutResponse])
def list_layouts(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    List all layout versions for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of layouts ordered by version (descending)
    """
    # Verify project access
    verify_project_access(project_id, current_user.id, db)

    layouts = db.query(Layout).filter(Layout.project_id == project_id).order_by(Layout.version.desc()).all()

    return layouts


@router.post("/projects/{project_id}/layouts/{layout_id}/restore", response_model=LayoutResponse)
def restore_layout(
    project_id: int, layout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Restore a previous layout version as current.

    Args:
        project_id: Project ID
        layout_id: Layout ID to restore
        current_user: Current authenticated user
        db: Database session

    Returns:
        Restored layout object
    """
    # Verify project access
    verify_project_access(project_id, current_user.id, db)

    # Find layout
    layout = db.query(Layout).filter(Layout.id == layout_id, Layout.project_id == project_id).first()

    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found")

    # Set all layouts to not current
    db.query(Layout).filter(Layout.project_id == project_id).update({"is_current": False})

    # Set selected layout as current
    layout.is_current = True
    db.commit()
    db.refresh(layout)

    return layout


@router.post("/validate", response_model=ValidationResult)
def validate_furniture_layout(
    furniture_state: Dict[str, Any] = Body(...), room_dimensions: Dict[str, float] = Body(...)
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
    result = validate_layout(furniture_state, room_dimensions)
    return result
