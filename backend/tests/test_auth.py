"""Tests for authentication endpoints."""

import pytest


def test_register_user(client):
    """Test user registration."""
    user_data = {"email": "newuser@example.com", "password": "securepassword123", "full_name": "New User"}

    response = client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email fails."""
    response = client.post("/api/v1/auth/register", json=test_user)

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login(client, test_user):
    """Test user login and token generation."""
    login_data = {"username": test_user["email"], "password": test_user["password"]}

    response = client.post("/api/v1/auth/login", data=login_data)

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, test_user):
    """Test login with invalid credentials fails."""
    login_data = {"username": test_user["email"], "password": "wrongpassword"}

    response = client.post("/api/v1/auth/login", data=login_data)

    assert response.status_code == 401


def test_get_me(client, auth_headers):
    """Test getting current user information."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


def test_get_me_unauthorized(client):
    """Test getting current user without authentication fails."""
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
