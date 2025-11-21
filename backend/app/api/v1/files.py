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

        # Move to final location
        final_filename = f"project_{project_id}_{file.filename}"
        final_path = PLY_DIR / final_filename

        # Remove old PLY file if exists
        if project.ply_file_path and os.path.exists(project.ply_file_path):
            os.remove(project.ply_file_path)

        shutil.move(str(temp_path), str(final_path))

        # Update project in database
        project.has_ply_file = True
        project.ply_file_path = str(final_path)
        project.ply_file_size = len(file_content)

        db.commit()
        db.refresh(project)

        return {
            "message": "PLY file uploaded successfully",
            "filename": final_filename,
            "file_size": len(file_content),
            "vertex_count": vertex_count,
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
