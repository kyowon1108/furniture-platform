"""Tests for catalog admin authorization."""

from app.api.v1 import catalog as catalog_api
from app.models.catalog_item import CatalogItem


def seed_catalog_item(db_session):
    """Insert a catalog item for update/delete tests."""
    item = CatalogItem(
        id="test-chair",
        name="Test Chair",
        type="chair",
        category="living",
        width=1.0,
        height=1.0,
        depth=1.0,
        thumbnail="/furniture/test-chair.png",
        color="#ffffff",
        price=1000,
        tags=["chair"],
        mount_type="floor",
        glb_key="catalog/models/test-chair.glb",
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


def test_catalog_sync_requires_auth(client):
    """Manual catalog sync should require authentication."""
    response = client.post("/api/v1/catalog/sync")
    assert response.status_code == 401


def test_catalog_sync_requires_admin(client, auth_headers):
    """Authenticated non-admin users should not be able to sync the catalog."""
    response = client.post("/api/v1/catalog/sync", headers=auth_headers)
    assert response.status_code == 403


def test_catalog_update_requires_admin(client, auth_headers, db_session):
    """Catalog metadata updates should be denied to non-admin users."""
    seed_catalog_item(db_session)
    response = client.put(
        "/api/v1/catalog/test-chair",
        params={"name": "Unauthorized Update"},
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_catalog_update_allows_admin(client, admin_headers, db_session, monkeypatch):
    """Allowlisted admins should be able to update catalog metadata."""
    seed_catalog_item(db_session)
    monkeypatch.setattr(catalog_api, "get_s3_client", lambda: object())
    monkeypatch.setattr(
        catalog_api,
        "generate_presigned_url",
        lambda _client, key: f"https://example.com/{key}",
    )

    response = client.put(
        "/api/v1/catalog/test-chair",
        params={"name": "Admin Updated Chair", "price": 2000},
        headers=admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Admin Updated Chair"
    assert data["price"] == 2000


def test_catalog_list_glb_requires_admin(client, auth_headers):
    """Raw S3 key listing should be restricted to admins."""
    response = client.get("/api/v1/catalog/list-glb", headers=auth_headers)
    assert response.status_code == 403
