"""Layout service for layout management."""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.collision import validate_layout
from app.models.layout import Layout
from app.models.project import Project
from app.models.user import User


class LayoutServiceError(Exception):
    """Base exception for layout service errors."""
    pass


class LayoutNotFoundError(LayoutServiceError):
    """Raised when layout is not found."""
    pass


class ProjectNotFoundError(LayoutServiceError):
    """Raised when project is not found."""
    pass


class ProjectAccessDeniedError(LayoutServiceError):
    """Raised when user doesn't have access to project."""
    pass


class LayoutService:
    """Service class for layout-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def verify_project_access(self, project_id: int, user: User) -> Project:
        """
        Verify user has access to project.

        Args:
            project_id: Project ID
            user: Current user

        Returns:
            Project object

        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user doesn't have access
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise ProjectNotFoundError(f"Project {project_id} not found")

        if project.owner_id != user.id and not project.is_shared:
            raise ProjectAccessDeniedError("Not authorized to access this project")

        return project

    def get_by_id(self, layout_id: int) -> Optional[Layout]:
        """Get layout by ID."""
        return self.db.query(Layout).filter(Layout.id == layout_id).first()

    def get_current(self, project_id: int, user: User) -> Layout:
        """
        Get current layout for a project.

        Args:
            project_id: Project ID
            user: Current user

        Returns:
            Current layout

        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user doesn't have access
            LayoutNotFoundError: If no current layout exists
        """
        self.verify_project_access(project_id, user)

        layout = (
            self.db.query(Layout)
            .filter(Layout.project_id == project_id, Layout.is_current == True)
            .first()
        )

        if not layout:
            raise LayoutNotFoundError(f"No current layout found for project {project_id}")

        return layout

    def list_by_project(self, project_id: int, user: User) -> List[Layout]:
        """
        List all layouts for a project.

        Args:
            project_id: Project ID
            user: Current user

        Returns:
            List of layouts ordered by version (descending)
        """
        self.verify_project_access(project_id, user)

        return (
            self.db.query(Layout)
            .filter(Layout.project_id == project_id)
            .order_by(Layout.version.desc())
            .all()
        )

    def create(
        self,
        project_id: int,
        user: User,
        furniture_state: Dict[str, Any],
        tile_state: Optional[Dict[str, Any]] = None,
    ) -> Layout:
        """
        Create a new layout version.

        Args:
            project_id: Project ID
            user: Current user
            furniture_state: Furniture state dict
            tile_state: Optional tile state for free build mode

        Returns:
            Created layout
        """
        self.verify_project_access(project_id, user)

        # Set all existing layouts to not current
        self.db.query(Layout).filter(Layout.project_id == project_id).update(
            {"is_current": False}
        )

        # Get max version number
        max_version = self.db.query(Layout).filter(Layout.project_id == project_id).count()

        # Create new layout
        new_layout = Layout(
            project_id=project_id,
            version=max_version + 1,
            furniture_state=furniture_state,
            tile_state=tile_state,
            is_current=True,
        )

        self.db.add(new_layout)
        self.db.commit()
        self.db.refresh(new_layout)

        return new_layout

    def restore(self, project_id: int, layout_id: int, user: User) -> Layout:
        """
        Restore a previous layout version as current.

        Args:
            project_id: Project ID
            layout_id: Layout ID to restore
            user: Current user

        Returns:
            Restored layout

        Raises:
            LayoutNotFoundError: If layout doesn't exist
        """
        self.verify_project_access(project_id, user)

        # Find layout
        layout = (
            self.db.query(Layout)
            .filter(Layout.id == layout_id, Layout.project_id == project_id)
            .first()
        )

        if not layout:
            raise LayoutNotFoundError(f"Layout {layout_id} not found in project {project_id}")

        # Set all layouts to not current
        self.db.query(Layout).filter(Layout.project_id == project_id).update(
            {"is_current": False}
        )

        # Set selected layout as current
        layout.is_current = True
        self.db.commit()
        self.db.refresh(layout)

        return layout

    @staticmethod
    def validate(
        furniture_state: Dict[str, Any],
        room_dimensions: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Validate furniture layout for collisions and boundary violations.

        Args:
            furniture_state: Furniture state dict with 'furnitures' list
            room_dimensions: Room dimensions dict with width, height, depth

        Returns:
            Validation result dict
        """
        return validate_layout(furniture_state, room_dimensions)
