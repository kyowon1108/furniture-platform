"""File upload API endpoints for PLY files."""

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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
PLY_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-ply/{project_id}")
async def upload_ply_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload PLY file for a project.

    Args:
        project_id: Project ID
        file: PLY file upload
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
    if not file.filename or not file.filename.lower().endswith(".ply"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a PLY file")

    # Read file content (no size limit for development/demo)
    file_content = await file.read()

    # Validate PLY file format
    temp_path = None
    try:
        # Reset file pointer
        await file.seek(0)
        temp_path = PLY_DIR / f"temp_{project_id}.ply"

        # Save temporarily to validate
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_content)

        # Try to read PLY file
        ply_data = PlyData.read(str(temp_path))

        # Basic validation - check if it has vertices
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
            has_standard_colors,
            is_gaussian_splatting_ply,
        )

        needs_conversion = is_gaussian_splatting_ply(ply_data) and not has_standard_colors(ply_data)

        # Prepare final path
        final_filename = f"project_{project_id}_{file.filename}"
        final_path = PLY_DIR / final_filename

        # Remove old PLY file if exists
        if project.ply_file_path and os.path.exists(project.ply_file_path):
            os.remove(project.ply_file_path)

        if needs_conversion:
            print(f"🔄 Converting Gaussian Splatting PLY to RGB for project {project_id}")
            conversion_result = convert_gaussian_to_rgb(str(temp_path), str(final_path))

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

        # Update project in database
        project.has_ply_file = True
        project.ply_file_path = str(final_path)
        project.ply_file_size = len(file_content)

        db.commit()
        db.refresh(project)

        # Check for color properties
        vertex_element = ply_data["vertex"]
        has_colors = any(prop in vertex_element.data.dtype.names for prop in ["red", "green", "blue", "r", "g", "b"])
        color_properties = [
            prop
            for prop in vertex_element.data.dtype.names
            if prop in ["red", "green", "blue", "r", "g", "b", "diffuse_red", "diffuse_green", "diffuse_blue"]
        ]

        return {
            "message": "PLY file uploaded successfully",
            "filename": final_filename,
            "file_size": len(file_content),
            "vertex_count": vertex_count,
            "has_colors": has_colors,
            "color_properties": color_properties,
            "all_properties": list(vertex_element.data.dtype.names),
            "project_id": project_id,
        }

    except HTTPException:
        # Clean up temp file if it exists
        if temp_path and temp_path.exists():
            os.remove(temp_path)
        raise
    except Exception as e:
        # Clean up temp file if it exists
        if temp_path and temp_path.exists():
            os.remove(temp_path)

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process PLY file: {str(e)}")


@router.get("/ply/{project_id}")
async def get_ply_file(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get PLY file info for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        PLY file information
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project")

    if not project.has_ply_file or not project.ply_file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No PLY file found for this project")

    # Check if file exists
    if not os.path.exists(project.ply_file_path):
        # Update database to reflect missing file
        project.has_ply_file = False
        project.ply_file_path = None
        project.ply_file_size = None
        db.commit()

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PLY file not found on disk")

    return {
        "has_ply_file": True,
        "file_path": project.ply_file_path,
        "file_size": project.ply_file_size,
        "project_id": project_id,
    }


@router.get("/ply-info/{project_id}")
async def get_ply_info(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get PLY file information including color properties.
    """
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Check ownership
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project")

    if not project.has_ply_file or not project.ply_file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No PLY file found for this project")

    if not os.path.exists(project.ply_file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PLY file not found on disk")

    try:
        # Read PLY file
        ply_data = PlyData.read(project.ply_file_path)
        vertex_element = ply_data["vertex"]

        # Get all property names
        all_properties = list(vertex_element.data.dtype.names)

        # Check for color properties
        color_properties = [
            prop
            for prop in all_properties
            if prop in ["red", "green", "blue", "r", "g", "b", "diffuse_red", "diffuse_green", "diffuse_blue", "alpha"]
        ]
        has_colors = len(color_properties) >= 3

        # Sample color values if available
        color_samples = []
        if has_colors:
            for i in range(min(5, len(vertex_element.data))):
                sample = {}
                for prop in color_properties:
                    sample[prop] = int(vertex_element.data[prop][i])
                color_samples.append(sample)

        return {
            "project_id": project_id,
            "vertex_count": len(vertex_element.data),
            "has_colors": has_colors,
            "color_properties": color_properties,
            "all_properties": all_properties,
            "color_samples": color_samples,
            "file_size": project.ply_file_size,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error reading PLY file: {str(e)}"
        )


@router.get("/download-ply/{project_id}")
async def download_ply_file(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Download PLY file for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        PLY file as FileResponse
    """
    from fastapi.responses import FileResponse

    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project")

    if not project.has_ply_file or not project.ply_file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No PLY file found for this project")

    # Check if file exists
    if not os.path.exists(project.ply_file_path):
        # Update database to reflect missing file
        project.has_ply_file = False
        project.ply_file_path = None
        project.ply_file_size = None
        db.commit()

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PLY file not found on disk")

    return FileResponse(
        path=project.ply_file_path,
        media_type="application/octet-stream",
        filename=os.path.basename(project.ply_file_path),
    )


@router.delete("/ply/{project_id}")
async def delete_ply_file(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Delete PLY file for a project.

    Args:
        project_id: Project ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Deletion result
    """
    # Verify project ownership
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this project")

    if not project.has_ply_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No PLY file to delete")

    # Delete file from disk
    if project.ply_file_path and os.path.exists(project.ply_file_path):
        os.remove(project.ply_file_path)

    # Update database
    project.has_ply_file = False
    project.ply_file_path = None
    project.ply_file_size = None

    db.commit()

    return {"message": "PLY file deleted successfully", "project_id": project_id}
