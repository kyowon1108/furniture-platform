"""Tests for project endpoints."""

import pytest


def test_create_project(client, auth_headers):
    """Test project creation with initial layout."""
    project_data = {
        "name": "My Room",
        "description": "Test room layout",
        "room_width": 10.0,
        "room_height": 3.0,
        "room_depth": 8.0,
    }

    response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == project_data["name"]
    assert data["room_width"] == project_data["room_width"]
    assert "id" in data
    assert "owner_id" in data


def test_list_projects(client, auth_headers):
    """Test listing user's projects."""
    # Create a project first
    project_data = {"name": "Test Project", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    client.post("/api/v1/projects", json=project_data, headers=auth_headers)

    # List projects
    response = client.get("/api/v1/projects", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["name"] == "Test Project"


def test_get_project_detail(client, auth_headers):
    """Test getting project details with current layout."""
    # Create project
    project_data = {"name": "Detail Test", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    create_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = create_response.json()["id"]

    # Get project detail
    response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Test"
    assert "current_layout" in data
    assert data["current_layout"] is not None


def test_update_project(client, auth_headers):
    """Test updating project metadata."""
    # Create project
    project_data = {"name": "Original Name", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    create_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = create_response.json()["id"]

    # Update project
    update_data = {"name": "Updated Name"}
    response = client.put(f"/api/v1/projects/{project_id}", json=update_data, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


def test_delete_project(client, auth_headers):
    """Test deleting a project."""
    # Create project
    project_data = {"name": "To Delete", "room_width": 10.0, "room_height": 3.0, "room_depth": 8.0}
    create_response = client.post("/api/v1/projects", json=project_data, headers=auth_headers)
    project_id = create_response.json()["id"]

    # Delete project
    response = client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)

    assert response.status_code == 204

    # Verify deletion
    get_response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert get_response.status_code == 404


def test_unauthorized_project_access(client, auth_headers):
    """Test accessing non-existent project."""
    response = client.get("/api/v1/projects/99999", headers=auth_headers)

    assert response.status_code == 404
