"""Project service for project management."""

import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.layout import Layout
from app.models.project import Project
from app.models.user import User

logger = get_logger("project_service")


class ProjectServiceError(Exception):
    """Base exception for project service errors."""
    pass


class ProjectNotFoundError(ProjectServiceError):
    """Raised when project is not found."""
    pass


class ProjectAccessDeniedError(ProjectServiceError):
    """Raised when user doesn't have access to project."""
    pass


class ProjectService:
    """Service class for project-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: int) -> Optional[Project]:
        """Get project by ID."""
        return self.db.query(Project).filter(Project.id == project_id).first()

    def get_with_access_check(self, project_id: int, user: User) -> Project:
        """
        Get project with access verification.

        Args:
            project_id: Project ID
            user: Current user

        Returns:
            Project object

        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user doesn't have access
        """
        project = self.get_by_id(project_id)

        if not project:
            raise ProjectNotFoundError(f"Project {project_id} not found")

        if project.owner_id != user.id and not project.is_shared:
            raise ProjectAccessDeniedError("Not authorized to access this project")

        return project

    def get_with_owner_check(self, project_id: int, user: User) -> Project:
        """
        Get project with owner verification (for modifications).

        Args:
            project_id: Project ID
            user: Current user

        Returns:
            Project object

        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user is not the owner
        """
        project = self.get_by_id(project_id)

        if not project:
            raise ProjectNotFoundError(f"Project {project_id} not found")

        if project.owner_id != user.id:
            raise ProjectAccessDeniedError("Not authorized to modify this project")

        return project

    def list_by_owner(self, user: User, skip: int = 0, limit: int = 100) -> List[Project]:
        """
        List projects owned by user.

        Args:
            user: Owner user
            skip: Pagination offset
            limit: Max results

        Returns:
            List of projects
        """
        return (
            self.db.query(Project)
            .filter(Project.owner_id == user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(
        self,
        owner: User,
        name: str,
        room_width: float,
        room_height: float,
        room_depth: float,
        description: Optional[str] = None,
        build_mode: str = "template",
        room_structure: Optional[Dict[str, Any]] = None,
    ) -> Project:
        """
        Create a new project with initial empty layout.

        Args:
            owner: Project owner
            name: Project name
            room_width: Room width
            room_height: Room height
            room_depth: Room depth
            description: Optional description
            build_mode: 'template' or 'free_build'
            room_structure: Room structure for free build mode

        Returns:
            Created project
        """
        # Create project
        new_project = Project(
            owner_id=owner.id,
            name=name,
            description=description,
            room_width=room_width,
            room_height=room_height,
            room_depth=room_depth,
            has_3d_file=False,
            file_type=None,
            has_ply_file=False,
            is_shared=False,
            build_mode=build_mode or "template",
            room_structure=room_structure,
        )

        self.db.add(new_project)
        self.db.commit()
        self.db.refresh(new_project)

        # Create initial empty layout
        initial_layout = Layout(
            project_id=new_project.id,
            version=1,
            furniture_state={"furnitures": []},
            is_current=True
        )

        self.db.add(initial_layout)
        self.db.commit()

        return new_project

    def update(self, project: Project, update_data: Dict[str, Any]) -> Project:
        """
        Update project fields.

        Args:
            project: Project to update
            update_data: Dict of fields to update

        Returns:
            Updated project
        """
        for field, value in update_data.items():
            if hasattr(project, field):
                setattr(project, field, value)

        self.db.commit()
        self.db.refresh(project)

        return project

    def toggle_share(self, project: Project, share: bool) -> Project:
        """
        Toggle project sharing status.

        Args:
            project: Project to update
            share: Share status

        Returns:
            Updated project
        """
        project.is_shared = share
        self.db.commit()
        self.db.refresh(project)

        return project

    def delete(self, project: Project) -> None:
        """
        Delete project and associated files.

        Args:
            project: Project to delete
        """
        files_deleted = []
        files_not_found = []

        # Delete legacy PLY file if exists
        if project.ply_file_path:
            self._delete_file(
                project.ply_file_path,
                "PLY",
                files_deleted,
                files_not_found
            )

        # Delete 3D file (PLY or GLB) if exists
        if project.file_path:
            file_type_name = project.file_type.upper() if project.file_type else "3D"
            self._delete_file(
                project.file_path,
                file_type_name,
                files_deleted,
                files_not_found
            )

        # Delete project from database (cascades to layouts and history)
        project_id = project.id
        self.db.delete(project)
        self.db.commit()

        # Summary log
        if files_deleted:
            logger.info(f"Project {project_id} deleted: {len(files_deleted)} file(s) removed")
        elif files_not_found:
            logger.info(f"Project {project_id} deleted: files already removed")
        else:
            logger.info(f"Project {project_id} deleted: no files to remove")

    def _delete_file(
        self,
        file_path: str,
        file_type: str,
        deleted_list: List[str],
        not_found_list: List[str]
    ) -> None:
        """Helper to delete a file and track result."""
        path = Path(file_path)
        if path.exists():
            try:
                os.remove(path)
                deleted_list.append(str(path))
                logger.info(f"Deleted {file_type} file: {path}")
            except Exception as e:
                logger.warning(f"Failed to delete {file_type} file {path}: {e}")
        else:
            not_found_list.append(f"{file_type}: {path}")

    def get_detail(self, project: Project) -> Dict[str, Any]:
        """
        Get project detail with current layout.

        Args:
            project: Project object

        Returns:
            Project detail dict with current layout
        """
        # Get current layout
        current_layout = (
            self.db.query(Layout)
            .filter(Layout.project_id == project.id, Layout.is_current == True)
            .first()
        )

        return {
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
            "download_url": project.download_url,
            "file_size": project.file_size,
            # Legacy PLY support
            "has_ply_file": project.has_ply_file,
            "ply_file_size": project.ply_file_size,
            # Free Build Mode support
            "build_mode": project.build_mode or "template",
            "room_structure": project.room_structure,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "is_shared": project.is_shared,
            "current_layout": current_layout.furniture_state if current_layout else None,
        }
