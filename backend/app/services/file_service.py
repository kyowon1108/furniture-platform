"""File service for 3D file management (PLY and GLB)."""

import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Literal

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.project import Project
from app.models.user import User

logger = get_logger("file_service")

# Directories
UPLOADS_DIR = Path("uploads")
PLY_DIR = UPLOADS_DIR / "ply_files"
GLB_DIR = UPLOADS_DIR / "glb_files"

# Ensure directories exist
PLY_DIR.mkdir(parents=True, exist_ok=True)
GLB_DIR.mkdir(parents=True, exist_ok=True)

# File size limits (in bytes)
MAX_PLY_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_GLB_FILE_SIZE = 50 * 1024 * 1024   # 50MB


class FileServiceError(Exception):
    """Base exception for file service errors."""
    pass


class ProjectNotFoundError(FileServiceError):
    """Raised when project is not found."""
    pass


class ProjectAccessDeniedError(FileServiceError):
    """Raised when user doesn't have access."""
    pass


class FileNotFoundError(FileServiceError):
    """Raised when file is not found."""
    pass


class InvalidFileError(FileServiceError):
    """Raised when file is invalid."""
    pass


class FileTooLargeError(FileServiceError):
    """Raised when file exceeds size limit."""
    def __init__(self, max_size_mb: int):
        self.max_size_mb = max_size_mb
        super().__init__(f"File too large. Maximum size is {max_size_mb}MB")


class FileService:
    """Service class for 3D file operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_project_with_owner_check(self, project_id: int, user: User) -> Project:
        """Get project and verify ownership."""
        project = self.db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise ProjectNotFoundError(f"Project {project_id} not found")

        if project.owner_id != user.id:
            raise ProjectAccessDeniedError("Not authorized to modify this project")

        return project

    def get_project_with_access_check(self, project_id: int, user: User) -> Project:
        """Get project and verify access (owner or shared)."""
        project = self.db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise ProjectNotFoundError(f"Project {project_id} not found")

        if project.owner_id != user.id and not project.is_shared:
            raise ProjectAccessDeniedError("Not authorized to access this project")

        return project

    def detect_file_type(self, filename: str) -> Literal["ply", "glb"]:
        """Detect file type from filename."""
        if not filename:
            raise InvalidFileError("No filename provided")

        filename_lower = filename.lower()
        if filename_lower.endswith(".ply"):
            return "ply"
        elif filename_lower.endswith(".glb") or filename_lower.endswith(".gltf"):
            return "glb"
        else:
            raise InvalidFileError("File must be a PLY or GLB file")

    def validate_file_size(self, file_size: int, file_type: str) -> None:
        """Validate file size against limits."""
        max_size = MAX_PLY_FILE_SIZE if file_type == "ply" else MAX_GLB_FILE_SIZE
        if file_size > max_size:
            raise FileTooLargeError(max_size // (1024 * 1024))

    def get_upload_dir(self, file_type: str) -> Path:
        """Get upload directory for file type."""
        return PLY_DIR if file_type == "ply" else GLB_DIR

    def generate_safe_filename(self, project_id: int, file_type: str) -> str:
        """Generate safe filename with UUID."""
        extension = ".ply" if file_type == "ply" else ".glb"
        return f"project_{project_id}_{uuid.uuid4().hex}{extension}"

    async def upload_3d_file(
        self,
        project: Project,
        file_content: bytes,
        file_type: str,
    ) -> Dict[str, Any]:
        """
        Upload and process 3D file.

        Args:
            project: Project to attach file to
            file_content: File content bytes
            file_type: 'ply' or 'glb'

        Returns:
            Upload result dict
        """
        upload_dir = self.get_upload_dir(file_type)
        extension = ".ply" if file_type == "ply" else ".glb"

        # Generate paths
        temp_filename = f"temp_{project.id}_{uuid.uuid4().hex}{extension}"
        temp_path = upload_dir / temp_filename
        final_filename = self.generate_safe_filename(project.id, file_type)
        final_path = upload_dir / final_filename

        try:
            # Save temporarily
            with open(temp_path, "wb") as f:
                f.write(file_content)

            # Process based on file type
            if file_type == "ply":
                result = await self._process_ply_file(temp_path, final_path, project)
            else:
                result = await self._process_glb_file(temp_path, final_path, project)

            # Update project
            project.has_3d_file = True
            project.file_type = file_type
            project.file_path = str(final_path)
            project.file_size = len(file_content)

            # Legacy PLY support
            if file_type == "ply":
                project.has_ply_file = True
                project.ply_file_path = str(final_path)
                project.ply_file_size = len(file_content)

            self.db.commit()
            self.db.refresh(project)

            return {
                "file_type": file_type,
                "filename": final_filename,
                "file_size": len(file_content),
                "project_id": project.id,
                **result,
            }

        except Exception as e:
            # Cleanup temp file
            if temp_path.exists():
                os.remove(temp_path)
            raise

    async def _process_ply_file(
        self, temp_path: Path, final_path: Path, project: Project
    ) -> Dict[str, Any]:
        """Process PLY file - validate and convert if needed."""
        from plyfile import PlyData
        from app.utils.ply_converter import (
            convert_gaussian_to_rgb,
            has_faces,
            has_standard_colors,
            is_gaussian_splatting_ply,
        )

        # Read and validate
        ply_data = PlyData.read(str(temp_path))

        if "vertex" not in ply_data:
            raise InvalidFileError("Invalid PLY file: no vertex data found")

        vertex_count = len(ply_data["vertex"])
        if vertex_count == 0:
            raise InvalidFileError("Invalid PLY file: no vertices found")

        needs_conversion = is_gaussian_splatting_ply(ply_data) and not has_standard_colors(ply_data)
        is_mesh = has_faces(ply_data)

        # Remove old file
        if project.file_path and os.path.exists(project.file_path):
            os.remove(project.file_path)

        if needs_conversion:
            logger.info(f"Converting Gaussian Splatting PLY for project {project.id}")
            result = convert_gaussian_to_rgb(str(temp_path), str(final_path), generate_mesh=True)

            if not result["success"]:
                raise InvalidFileError(f"Failed to convert PLY: {result['message']}")

            if temp_path.exists():
                os.remove(temp_path)
        else:
            shutil.move(str(temp_path), str(final_path))

        # Get color info
        vertex_element = ply_data["vertex"]
        has_colors = any(
            prop in vertex_element.data.dtype.names
            for prop in ["red", "green", "blue", "r", "g", "b"]
        )

        return {
            "vertex_count": vertex_count,
            "has_colors": has_colors,
            "is_mesh": is_mesh,
            "converted": needs_conversion,
        }

    async def _process_glb_file(
        self, temp_path: Path, final_path: Path, project: Project
    ) -> Dict[str, Any]:
        """Process GLB file - validate and extract info."""
        # Validate GLB magic number
        with open(temp_path, "rb") as f:
            header = f.read(12)

        if len(header) < 12:
            raise InvalidFileError("Invalid GLB file: file too small")

        magic = int.from_bytes(header[0:4], byteorder="little")
        if magic != 0x46546C67:  # "glTF"
            raise InvalidFileError("Invalid GLB file: incorrect magic number")

        version = int.from_bytes(header[4:8], byteorder="little")
        length = int.from_bytes(header[8:12], byteorder="little")

        logger.info(f"Valid GLB file: version {version}, length {length} bytes")

        # Extract dimensions if needed
        from app.utils.glb_utils import extract_glb_dimensions

        has_valid_dimensions = (
            project.room_width and project.room_height and project.room_depth and
            project.room_width > 0 and project.room_height > 0 and project.room_depth > 0
        )

        dimensions = None
        if has_valid_dimensions:
            dimensions = {
                'width': project.room_width,
                'height': project.room_height,
                'depth': project.room_depth
            }
        else:
            dimensions = extract_glb_dimensions(temp_path)
            if dimensions and dimensions.get('width') and dimensions.get('height') and dimensions.get('depth'):
                if not (dimensions['width'] == 5.0 and dimensions['height'] == 3.0 and dimensions['depth'] == 4.0):
                    project.room_width = dimensions['width']
                    project.room_height = dimensions['height']
                    project.room_depth = dimensions['depth']

        # Remove old file
        if project.file_path and os.path.exists(project.file_path):
            os.remove(project.file_path)

        shutil.move(str(temp_path), str(final_path))

        return {
            "glb_version": version,
            "glb_length": length,
            "is_mesh": True,
            "has_colors": True,
            "dimensions": dimensions,
        }

    def get_file_info(self, project: Project) -> Dict[str, Any]:
        """Get 3D file info for project."""
        if not project.has_3d_file or not project.file_path:
            raise FileNotFoundError("No 3D file found for this project")

        if not os.path.exists(project.file_path):
            # Update DB to reflect missing file
            project.has_3d_file = False
            project.file_path = None
            project.file_size = None
            self.db.commit()
            raise FileNotFoundError("File not found on disk")

        return {
            "has_3d_file": True,
            "file_type": project.file_type,
            "file_path": project.file_path,
            "file_size": project.file_size,
            "project_id": project.id,
        }

    def get_file_path(self, project: Project) -> str:
        """Get file path for download."""
        if not project.has_3d_file or not project.file_path:
            raise FileNotFoundError("No 3D file found")

        if not os.path.exists(project.file_path):
            project.has_3d_file = False
            project.file_path = None
            project.file_size = None
            self.db.commit()
            raise FileNotFoundError("File not found on disk")

        return project.file_path

    def delete_file(self, project: Project) -> None:
        """Delete 3D file from project."""
        if not project.has_3d_file:
            raise FileNotFoundError("No 3D file to delete")

        # Delete from disk
        if project.file_path and os.path.exists(project.file_path):
            os.remove(project.file_path)

        # Update database
        project.has_3d_file = False
        project.file_type = None
        project.file_path = None
        project.file_size = None

        # Legacy
        project.has_ply_file = False
        project.ply_file_path = None
        project.ply_file_size = None

        self.db.commit()
