"""File upload API endpoints for 3D files (PLY and GLB)."""

import os
import shutil
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from plyfile import PlyData
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.user import User

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
PLY_DIR = UPLOADS_DIR / "ply_files"
GLB_DIR = UPLOADS_DIR / "glb_files"
PLY_DIR.mkdir(parents=True, exist_ok=True)
GLB_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-3d/{project_id}")
async def upload_3d_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload 3D file (PLY or GLB) for a project.

    Args:
        project_id: Project ID
        file: 3D file upload (PLY or GLB)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Upload result with file info
    """
    # Verify project ownership
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this project")

    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    filename_lower = file.filename.lower()
    if filename_lower.endswith(".ply"):
        file_type = "ply"
        upload_dir = PLY_DIR
    elif filename_lower.endswith(".glb") or filename_lower.endswith(".gltf"):
        file_type = "glb"
        upload_dir = GLB_DIR
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a PLY or GLB file")

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Prepare paths
    temp_path = upload_dir / f"temp_{project_id}_{file.filename}"
    final_filename = f"project_{project_id}_{file.filename}"
    final_path = upload_dir / final_filename

    try:
        # Save temporarily
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_content)

        # Validate and process based on file type
        if file_type == "ply":
            result = await _process_ply_file(temp_path, final_path, project, db)
        else:  # glb
            result = await _process_glb_file(temp_path, final_path, project, db)

        # Update project in database
        project.has_3d_file = True
        project.file_type = file_type
        project.file_path = str(final_path)
        project.file_size = file_size

        # Legacy support
        if file_type == "ply":
            project.has_ply_file = True
            project.ply_file_path = str(final_path)
            project.ply_file_size = file_size

        db.commit()
        db.refresh(project)

        return {
            "message": f"{file_type.upper()} file uploaded successfully",
            "file_type": file_type,
            "filename": final_filename,
            "file_size": file_size,
            "project_id": project_id,
            **result,
        }

    except HTTPException:
        if temp_path.exists():
            os.remove(temp_path)
        raise
    except Exception as e:
        if temp_path.exists():
            os.remove(temp_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process {file_type.upper()} file: {str(e)}"
        )


async def _process_ply_file(temp_path: Path, final_path: Path, project: Project, db: Session) -> dict:
    """Process PLY file - validate and convert if needed."""
    try:
        # Try to read PLY file
        ply_data = PlyData.read(str(temp_path))

        # Basic validation
        if "vertex" not in ply_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PLY file: no vertex data found"
            )

        vertex_count = len(ply_data["vertex"])
        if vertex_count == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PLY file: no vertices found")

        # Check if conversion is needed
        from app.utils.ply_converter import (
            convert_gaussian_to_rgb,
            has_faces,
            has_standard_colors,
            is_gaussian_splatting_ply,
        )

        needs_conversion = is_gaussian_splatting_ply(ply_data) and not has_standard_colors(ply_data)
        is_mesh = has_faces(ply_data)

        # Remove old file if exists
        if project.file_path and os.path.exists(project.file_path):
            os.remove(project.file_path)

        if needs_conversion:
            print(f"🔄 Converting Gaussian Splatting PLY to RGB for project {project.id}")
            conversion_result = convert_gaussian_to_rgb(
                str(temp_path),
                str(final_path),
                generate_mesh=True,  # Generate mesh if point cloud
            )

            if not conversion_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to convert PLY: {conversion_result['message']}",
                )

            print(f"✅ Conversion successful: {conversion_result['message']}")

            # Clean up temp file
            if temp_path.exists():
                os.remove(temp_path)
        else:
            # No conversion needed, just move the file
            shutil.move(str(temp_path), str(final_path))

        # Get color info
        vertex_element = ply_data["vertex"]
        has_colors = any(prop in vertex_element.data.dtype.names for prop in ["red", "green", "blue", "r", "g", "b"])

        return {
            "vertex_count": vertex_count,
            "has_colors": has_colors,
            "is_mesh": is_mesh,
            "converted": needs_conversion,
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process PLY file: {str(e)}")


async def _process_glb_file(temp_path: Path, final_path: Path, project: Project, db: Session) -> dict:
    """Process GLB file - validate and extract info."""
    try:
        # GLB files are already in a good format for Three.js
        # Just validate it's a valid GLB file

        # Read first 12 bytes to check GLB magic number
        with open(temp_path, "rb") as f:
            header = f.read(12)

        # GLB magic number is 0x46546C67 ("glTF" in ASCII)
        if len(header) < 12:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GLB file: file too small")

        magic = int.from_bytes(header[0:4], byteorder="little")
        if magic != 0x46546C67:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GLB file: incorrect magic number"
            )

        version = int.from_bytes(header[4:8], byteorder="little")
        length = int.from_bytes(header[8:12], byteorder="little")

        print(f"✅ Valid GLB file: version {version}, length {length} bytes")

        # Extract dimensions from GLB file
        from app.utils.glb_utils import extract_glb_dimensions
        dimensions = extract_glb_dimensions(temp_path)

        # Update project dimensions if extraction was successful
        if dimensions and dimensions.get('width') and dimensions.get('height') and dimensions.get('depth'):
            # Only update if we got valid dimensions (not the defaults)
            if not (dimensions['width'] == 5.0 and dimensions['height'] == 3.0 and dimensions['depth'] == 4.0):
                project.room_width = dimensions['width']
                project.room_height = dimensions['height']
                project.room_depth = dimensions['depth']
                print(f"📐 Updated room dimensions from GLB: {dimensions['width']}x{dimensions['height']}x{dimensions['depth']}")
            else:
                print(f"⚠️ Got default dimensions, keeping existing: {project.room_width}x{project.room_height}x{project.room_depth}")
        else:
            print(f"⚠️ Could not extract dimensions from GLB, keeping existing: {project.room_width}x{project.room_height}x{project.room_depth}")

        # Remove old file if exists
        if project.file_path and os.path.exists(project.file_path):
            os.remove(project.file_path)

        # Move file to final location
        shutil.move(str(temp_path), str(final_path))

        return {
            "glb_version": version,
            "glb_length": length,
            "is_mesh": True,  # GLB always contains mesh data
            "has_colors": True,  # GLB typically has materials/textures
            "dimensions": dimensions if dimensions else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process GLB file: {str(e)}")


@router.get("/3d-file/{project_id}")
async def get_3d_file(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get 3D file info for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id and not project.is_shared:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if not project.has_3d_file or not project.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No 3D file found")

    if not os.path.exists(project.file_path):
        project.has_3d_file = False
        project.file_path = None
        project.file_size = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return {
        "has_3d_file": True,
        "file_type": project.file_type,
        "file_path": project.file_path,
        "file_size": project.file_size,
        "project_id": project_id,
    }


@router.get("/download-3d/{project_id}")
async def download_3d_file(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Download 3D file for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id and not project.is_shared:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if not project.has_3d_file or not project.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No 3D file found")

    if not os.path.exists(project.file_path):
        project.has_3d_file = False
        project.file_path = None
        project.file_size = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    media_type = "model/gltf-binary" if project.file_type == "glb" else "application/octet-stream"

    return FileResponse(
        path=project.file_path,
        media_type=media_type,
        filename=os.path.basename(project.file_path),
    )


@router.delete("/3d-file/{project_id}")
async def delete_3d_file(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Delete 3D file for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if not project.has_3d_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No 3D file to delete")

    # Delete file from disk
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

    db.commit()

    return {"message": "3D file deleted successfully", "project_id": project_id}
