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

    if project.owner_id != current_user.id and not project.is_shared:
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
        # New 3D file support
        "has_3d_file": project.has_3d_file,
        "file_type": project.file_type,
        "file_path": project.file_path,
        "file_size": project.file_size,
        # Legacy PLY support
        "has_ply_file": project.has_ply_file,
        "ply_file_path": project.ply_file_path,
        "ply_file_size": project.ply_file_size,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "is_shared": project.is_shared,
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


@router.post("/{project_id}/share", response_model=ProjectResponse)
def toggle_project_share(
    project_id: int,
    share: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggle project sharing status.

    Args:
        project_id: Project ID
        share: True to enable sharing, False to disable
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated project object
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this project")

    project.is_shared = share
    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete a project (cascades to layouts and history).
    Also deletes associated uploaded files (PLY/GLB).

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        HTTPException: If project not found or access denied
    """
    import os
    from pathlib import Path

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this project")

    # Delete associated uploaded files
    files_deleted = []
    files_not_found = []

    # Delete legacy PLY file if exists
    if project.ply_file_path:
        ply_path = Path(project.ply_file_path)
        if ply_path.exists():
            try:
                os.remove(ply_path)
                files_deleted.append(str(ply_path))
                print(f"✅ Deleted PLY file: {ply_path}")
            except Exception as e:
                print(f"⚠️ Failed to delete PLY file {ply_path}: {e}")
        else:
            files_not_found.append(f"PLY: {ply_path}")
            print(f"ℹ️ PLY file not found (already deleted or moved): {ply_path}")

    # Delete 3D file (PLY or GLB) if exists
    if project.file_path:
        file_path = Path(project.file_path)
        file_type_name = project.file_type.upper() if project.file_type else "3D"

        if file_path.exists():
            try:
                os.remove(file_path)
                files_deleted.append(str(file_path))
                print(f"✅ Deleted {file_type_name} file: {file_path}")
            except Exception as e:
                print(f"⚠️ Failed to delete {file_type_name} file {file_path}: {e}")
        else:
            files_not_found.append(f"{file_type_name}: {file_path}")
            print(f"ℹ️ {file_type_name} file not found (already deleted or moved): {file_path}")

    # Delete project from database (cascades to layouts and history)
    try:
        db.delete(project)
        db.commit()
        print(f"✅ Project {project_id} deleted from database")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to delete project {project_id} from database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete project: {str(e)}"
        )

    # Summary log
    if files_deleted:
        print(f"🗑️ Project {project_id} deletion complete: {len(files_deleted)} file(s) deleted")
    elif files_not_found:
        print(f"🗑️ Project {project_id} deletion complete: {len(files_not_found)} file(s) not found (already deleted)")
    else:
        print(f"🗑️ Project {project_id} deletion complete: no files to remove")

    return None
