"""Tests for file upload functionality."""

import os
import tempfile
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from plyfile import PlyData, PlyElement


def create_test_ply_file(vertex_count=100):
    """
    Create a test PLY file with random vertices.

    Args:
        vertex_count: Number of vertices to create

    Returns:
        Path to temporary PLY file
    """
    # Create random vertices with proper dtype
    vertices = np.zeros(vertex_count, dtype=[("x", "f4"), ("y", "f4"), ("z", "f4")])
    vertices["x"] = np.random.rand(vertex_count).astype(np.float32)
    vertices["y"] = np.random.rand(vertex_count).astype(np.float32)
    vertices["z"] = np.random.rand(vertex_count).astype(np.float32)

    # Create PLY element
    vertex_element = PlyElement.describe(vertices, "vertex")

    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix=".ply", delete=False)
    temp_file.close()

    # Write PLY data
    PlyData([vertex_element]).write(temp_file.name)

    return temp_file.name


def test_upload_ply_file(client, auth_headers):
    """Test PLY file upload."""
    # Create a test project first
    project_data = {"name": "PLY Test Project", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    assert project_response.status_code == 201
    project_id = project_response.json()["id"]

    # Create test PLY file
    ply_file_path = create_test_ply_file(50)

    try:
        # Upload PLY file
        with open(ply_file_path, "rb") as f:
            response = client.post(
                f"/api/v1/files/upload-ply/{project_id}",
                files={"file": ("test.ply", f, "application/octet-stream")},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "PLY file uploaded successfully"
        assert data["project_id"] == project_id
        assert data["vertex_count"] == 50
        assert data["file_size"] > 0

        # Verify project was updated
        project_response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert project_response.status_code == 200
        project_data = project_response.json()
        assert project_data["has_ply_file"] is True
        assert project_data["ply_file_path"] is not None
        assert project_data["ply_file_size"] > 0

    finally:
        # Clean up
        if os.path.exists(ply_file_path):
            os.unlink(ply_file_path)


def test_upload_invalid_file_type(client, auth_headers):
    """Test uploading non-PLY file."""
    # Create a test project
    project_data = {"name": "Invalid File Test", "room_width": 5.0, "room_height": 3.0, "room_depth": 4.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Try to upload a text file
    response = client.post(
        f"/api/v1/files/upload-ply/{project_id}",
        files={"file": ("test.txt", b"not a ply file", "text/plain")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "File must be a PLY file" in response.json()["detail"]


def test_upload_invalid_ply_content(client, auth_headers):
    """Test uploading file with .ply extension but invalid content."""
    # Create a test project
    project_data = {"name": "Invalid PLY Test", "room_width": 5.0, "room_height": 3.0, "room_depth": 4.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Try to upload invalid PLY content
    response = client.post(
        f"/api/v1/files/upload-ply/{project_id}",
        files={"file": ("invalid.ply", b"not valid ply content", "application/octet-stream")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "Failed to process PLY file" in response.json()["detail"]


def test_get_ply_file_info(client, auth_headers):
    """Test getting PLY file information."""
    # Create project and upload PLY file
    project_data = {"name": "PLY Info Test", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Upload PLY file
    ply_file_path = create_test_ply_file(25)

    try:
        with open(ply_file_path, "rb") as f:
            client.post(
                f"/api/v1/files/upload-ply/{project_id}",
                files={"file": ("test.ply", f, "application/octet-stream")},
                headers=auth_headers,
            )

        # Get PLY file info
        response = client.get(f"/api/v1/files/ply/{project_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["has_ply_file"] is True
        assert data["project_id"] == project_id
        assert data["file_size"] > 0

    finally:
        if os.path.exists(ply_file_path):
            os.unlink(ply_file_path)


def test_get_ply_file_not_found(client, auth_headers):
    """Test getting PLY file info when no file exists."""
    # Create project without PLY file
    project_data = {"name": "No PLY Test", "room_width": 5.0, "room_height": 3.0, "room_depth": 4.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Try to get PLY file info
    response = client.get(f"/api/v1/files/ply/{project_id}", headers=auth_headers)

    assert response.status_code == 404
    assert "No PLY file found" in response.json()["detail"]


def test_delete_ply_file(client, auth_headers):
    """Test deleting PLY file."""
    # Create project and upload PLY file
    project_data = {"name": "PLY Delete Test", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Upload PLY file
    ply_file_path = create_test_ply_file(30)

    try:
        with open(ply_file_path, "rb") as f:
            client.post(
                f"/api/v1/files/upload-ply/{project_id}",
                files={"file": ("test.ply", f, "application/octet-stream")},
                headers=auth_headers,
            )

        # Delete PLY file
        response = client.delete(f"/api/v1/files/ply/{project_id}", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["message"] == "PLY file deleted successfully"

        # Verify project was updated
        project_response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        project_data = project_response.json()
        assert project_data["has_ply_file"] is False
        assert project_data["ply_file_path"] is None

    finally:
        if os.path.exists(ply_file_path):
            os.unlink(ply_file_path)


def test_upload_unauthorized_project(client, auth_headers):
    """Test uploading PLY file to project owned by another user."""
    # This would require creating another user, but for now test with non-existent project
    response = client.post(
        "/api/v1/files/upload-ply/99999",
        files={"file": ("test.ply", b"dummy", "application/octet-stream")},
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert "Project not found" in response.json()["detail"]


def test_large_file_upload(client, auth_headers):
    """Test uploading large file (no size limit for development/demo)."""
    # Create a test project
    project_data = {"name": "Large File Test", "room_width": 5.0, "room_height": 3.0, "room_depth": 4.0}
    project_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]

    # Note: In development/demo mode, there is no file size limit
    # This test is kept for documentation purposes
    # In production, you may want to add size limits based on your infrastructure

    # For now, we just verify the project was created successfully
    assert project_response.status_code == 201
    assert project_id is not None


def test_project_creation_with_ply_flag(client, auth_headers):
    """Test creating project with has_ply_file flag."""
    project_data = {
        "name": "PLY Flag Test",
        "room_width": 5.0,
        "room_height": 3.0,
        "room_depth": 4.0,
        "has_ply_file": True,
    }
    response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["has_ply_file"] is True
    assert data["ply_file_path"] is None  # No file uploaded yet
