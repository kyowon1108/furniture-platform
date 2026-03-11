"""Project management API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetail,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import (
    ProjectService,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
)

router = APIRouter()


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """Dependency to get project service."""
    return ProjectService(db)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    Create a new project with initial empty layout.

    Args:
        project_data: Project creation data
        current_user: Current authenticated user
        project_service: Project service instance

    Returns:
        Created project object
    """
    new_project = project_service.create(
        owner=current_user,
        name=project_data.name,
        room_width=project_data.room_width,
        room_height=project_data.room_height,
        room_depth=project_data.room_depth,
        description=project_data.description,
        build_mode=project_data.build_mode,
        room_structure=project_data.room_structure,
    )

    return new_project


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    List all projects owned by current user.

    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        current_user: Current authenticated user
        project_service: Project service instance

    Returns:
        List of projects
    """
    return project_service.list_by_owner(current_user, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    Get project details with current layout.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        project_service: Project service instance

    Returns:
        Project details with current layout

    Raises:
        HTTPException: If project not found or access denied
    """
    try:
        project = project_service.get_with_access_check(project_id, current_user)
        return project_service.get_detail(project)
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


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    Update project metadata.

    Args:
        project_id: Project ID
        project_update: Project update data
        current_user: Current authenticated user
        project_service: Project service instance

    Returns:
        Updated project object

    Raises:
        HTTPException: If project not found or access denied
    """
    try:
        project = project_service.get_with_owner_check(project_id, current_user)
        update_data = project_update.model_dump(exclude_unset=True)
        return project_service.update(project, update_data)
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this project"
        )


@router.post("/{project_id}/share", response_model=ProjectResponse)
def toggle_project_share(
    project_id: int,
    share: bool = True,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    Toggle project sharing status.

    Args:
        project_id: Project ID
        share: True to enable sharing, False to disable
        current_user: Current authenticated user
        project_service: Project service instance

    Returns:
        Updated project object
    """
    try:
        project = project_service.get_with_owner_check(project_id, current_user)
        return project_service.toggle_share(project, share)
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this project"
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service),
):
    """
    Delete a project (cascades to layouts and history).
    Also deletes associated uploaded files (PLY/GLB).

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        project_service: Project service instance

    Raises:
        HTTPException: If project not found or access denied
    """
    try:
        project = project_service.get_with_owner_check(project_id, current_user)
        project_service.delete(project)
        return None
    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this project"
        )
