"""Pytest configuration and fixtures."""

import os

os.environ.setdefault("ENABLE_CATALOG_SYNC_ON_STARTUP", "false")

import pytest
import app.main as main_module
from app.config import settings
from app.database import Base, get_db
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """Create test client with in-memory database."""
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    original_engine = main_module.engine
    main_module.engine = engine

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        main_module.engine = original_engine

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def db_session():
    """Provide a raw testing DB session for direct seeding/assertions."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(client):
    """Create a test user and return user data."""
    user_data = {"email": "test@example.com", "password": "testpassword123", "full_name": "Test User"}

    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201

    return user_data


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers with JWT token."""
    login_data = {"username": test_user["email"], "password": test_user["password"]}

    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client, test_user):
    """Get authentication headers for a user temporarily allowlisted as an admin."""
    original_admin_emails = settings.ADMIN_EMAILS
    settings.ADMIN_EMAILS = test_user["email"]

    try:
        login_data = {"username": test_user["email"], "password": test_user["password"]}
        response = client.post("/api/v1/auth/login", data=login_data)
        assert response.status_code == 200
        token = response.json()["access_token"]
        yield {"Authorization": f"Bearer {token}"}
    finally:
        settings.ADMIN_EMAILS = original_admin_emails
