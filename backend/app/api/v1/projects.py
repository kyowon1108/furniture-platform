"""Project management API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.layout import Layout
from app.models.project import Project
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetail,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Create a new project with initial empty layout.

    Args:
        project_data: Project creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created project object
    """
    # Create project
    new_project = Project(
        owner_id=current_user.id,
        name=project_data.name,
        description=project_data.description,
        room_width=project_data.room_width,
        room_height=project_data.room_height,
        room_depth=project_data.room_depth,
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Create initial empty layout
    initial_layout = Layout(project_id=new_project.id, version=1, furniture_state={"furnitures": []}, is_current=True)

    db.add(initial_layout)
    db.commit()

    return new_project


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    List all projects owned by current user.

    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of projects
    """
    projects = db.query(Project).filter(Project.owner_id == current_user.id).offset(skip).limit(limit).all()

    return projects


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get project details with current layout.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Project details with current layout

    Raises:
        HTTPException: If project not found or access denied
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project")

    # Get current layout
    current_layout = db.query(Layout).filter(Layout.project_id == project_id, Layout.is_current == True).first()

    # Convert to dict and add current_layout
    project_dict = {
        "id": project.id,
        "owner_id": project.owner_id,
        "name": project.name,
        "description": project.description,
        "room_width": project.room_width,
        "room_height": project.room_height,
        "room_depth": project.room_depth,
        "has_ply_file": project.has_ply_file,
        "ply_file_path": project.ply_file_path,
        "ply_file_size": project.ply_file_size,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "current_layout": current_layout.furniture_state if current_layout else None,
    }

    return project_dict


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update project metadata.

    Args:
        project_id: Project ID
        project_update: Project update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated project object

    Raises:
        HTTPException: If project not found or access denied
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this project")

    # Update fields
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete a project (cascades to layouts and history).

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        HTTPException: If project not found or access denied
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this project")

    db.delete(project)
    db.commit()

    return None
