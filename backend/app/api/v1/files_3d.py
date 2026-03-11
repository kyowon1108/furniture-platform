"""File upload API endpoints for 3D files (PLY and GLB)."""

import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.file_service import (
    FileService,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    FileNotFoundError as FileServiceNotFoundError,
    InvalidFileError,
    FileTooLargeError,
    MAX_GLB_FILE_SIZE,
    MAX_PLY_FILE_SIZE,
    save_upload_to_temp_file,
)

router = APIRouter()


def get_file_service(db: Session = Depends(get_db)) -> FileService:
    """Dependency to get file service."""
    return FileService(db)


@router.post("/upload-3d/{project_id}")
async def upload_3d_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service),
):
    """
    Upload 3D file (PLY or GLB) for a project.

    Args:
        project_id: Project ID
        file: 3D file upload (PLY or GLB)
        current_user: Current authenticated user
        file_service: File service instance

    Returns:
        Upload result with file info
    """
    try:
        # Verify ownership
        project = file_service.get_project_with_owner_check(project_id, current_user)

        # Detect and validate file type
        file_type = file_service.detect_file_type(file.filename)
        max_size = MAX_PLY_FILE_SIZE if file_type == "ply" else MAX_GLB_FILE_SIZE
        temp_path = file_service.create_temp_upload_path(project.id, file_type)
        file_size = await save_upload_to_temp_file(file, temp_path, max_size)
        result = await file_service.finalize_uploaded_file(project, temp_path, file_size, file_type)

        return {
            "message": f"{file_type.upper()} file uploaded successfully",
            **result,
        }

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
    except InvalidFileError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except FileTooLargeError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process file: {str(e)}"
        )


@router.get("/3d-file/{project_id}")
async def get_3d_file(
    project_id: int,
    current_user: User = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service),
):
    """Get 3D file info for a project."""
    try:
        project = file_service.get_project_with_access_check(project_id, current_user)
        return file_service.get_file_info(project)

    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    except FileServiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/download-3d/{project_id}")
async def download_3d_file(
    project_id: int,
    current_user: User = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service),
):
    """Download 3D file for a project."""
    try:
        project = file_service.get_project_with_access_check(project_id, current_user)
        file_path = file_service.get_file_path(project)

        media_type = "model/gltf-binary" if project.file_type == "glb" else "application/octet-stream"

        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=os.path.basename(file_path),
        )

    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    except FileServiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/3d-file/{project_id}")
async def delete_3d_file(
    project_id: int,
    current_user: User = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service),
):
    """Delete 3D file for a project."""
    try:
        project = file_service.get_project_with_owner_check(project_id, current_user)
        file_service.delete_file(project)

        return {"message": "3D file deleted successfully", "project_id": project_id}

    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ProjectAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    except FileServiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
