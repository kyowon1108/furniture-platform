#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script

Usage:
    1. Make sure PostgreSQL is running (docker compose up -d postgres)
    2. Run: python scripts/migrate_sqlite_to_postgres.py

This script:
    - Reads all data from SQLite (dev.db)
    - Creates tables in PostgreSQL
    - Migrates all data with proper type conversions
"""

import os
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import sqlite3
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configuration
SQLITE_PATH = Path(__file__).parent.parent / "dev.db"
POSTGRES_URL = os.getenv(
    "POSTGRES_URL",
    "postgresql://furniture:furniture123@localhost:5433/furniture_db"
)


def get_sqlite_connection():
    """Get SQLite connection."""
    if not SQLITE_PATH.exists():
        print(f"SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)
    return sqlite3.connect(SQLITE_PATH)


def get_postgres_engine():
    """Get PostgreSQL engine."""
    return create_engine(POSTGRES_URL)


def migrate_users(sqlite_conn, pg_session):
    """Migrate users table."""
    print("\nMigrating users...")
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT id, email, password_hash, full_name, is_active, created_at, updated_at FROM users")
    rows = cursor.fetchall()

    for row in rows:
        pg_session.execute(
            text("""
                INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at)
                VALUES (:id, :email, :password_hash, :full_name, :is_active, :created_at, :updated_at)
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    full_name = EXCLUDED.full_name,
                    is_active = EXCLUDED.is_active,
                    updated_at = EXCLUDED.updated_at
            """),
            {
                "id": row[0],
                "email": row[1],
                "password_hash": row[2],
                "full_name": row[3],
                "is_active": bool(row[4]),
                "created_at": row[5],
                "updated_at": row[6],
            }
        )

    print(f"  Migrated {len(rows)} users")
    return len(rows)


def migrate_projects(sqlite_conn, pg_session):
    """Migrate projects table."""
    print("\nMigrating projects...")
    cursor = sqlite_conn.cursor()
    cursor.execute("""
        SELECT id, owner_id, name, description, room_width, room_height, room_depth,
               is_shared, has_3d_file, file_type, file_path, file_size,
               has_ply_file, ply_file_path, ply_file_size,
               room_structure, build_mode, created_at, updated_at
        FROM projects
    """)
    rows = cursor.fetchall()

    for row in rows:
        pg_session.execute(
            text("""
                INSERT INTO projects (id, owner_id, name, description, room_width, room_height, room_depth,
                                     is_shared, has_3d_file, file_type, file_path, file_size,
                                     has_ply_file, ply_file_path, ply_file_size,
                                     room_structure, build_mode, created_at, updated_at)
                VALUES (:id, :owner_id, :name, :description, :room_width, :room_height, :room_depth,
                       :is_shared, :has_3d_file, :file_type, :file_path, :file_size,
                       :has_ply_file, :ply_file_path, :ply_file_size,
                       :room_structure, :build_mode, :created_at, :updated_at)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    updated_at = EXCLUDED.updated_at
            """),
            {
                "id": row[0],
                "owner_id": row[1],
                "name": row[2],
                "description": row[3],
                "room_width": row[4],
                "room_height": row[5],
                "room_depth": row[6],
                "is_shared": bool(row[7]),
                "has_3d_file": bool(row[8]),
                "file_type": row[9],
                "file_path": row[10],
                "file_size": row[11],
                "has_ply_file": bool(row[12]),
                "ply_file_path": row[13],
                "ply_file_size": row[14],
                "room_structure": row[15],  # Already TEXT/JSON
                "build_mode": row[16] or "template",
                "created_at": row[17],
                "updated_at": row[18],
            }
        )

    print(f"  Migrated {len(rows)} projects")
    return len(rows)


def migrate_layouts(sqlite_conn, pg_session):
    """Migrate layouts table."""
    print("\nMigrating layouts...")
    cursor = sqlite_conn.cursor()
    cursor.execute("""
        SELECT id, project_id, version, furniture_state, is_current, created_at, tile_state
        FROM layouts
    """)
    rows = cursor.fetchall()

    for row in rows:
        pg_session.execute(
            text("""
                INSERT INTO layouts (id, project_id, version, furniture_state, is_current, created_at, tile_state)
                VALUES (:id, :project_id, :version, :furniture_state, :is_current, :created_at, :tile_state)
                ON CONFLICT (id) DO UPDATE SET
                    furniture_state = EXCLUDED.furniture_state,
                    is_current = EXCLUDED.is_current
            """),
            {
                "id": row[0],
                "project_id": row[1],
                "version": row[2],
                "furniture_state": row[3],  # Already TEXT/JSON
                "is_current": bool(row[4]),
                "created_at": row[5],
                "tile_state": row[6],  # Already TEXT/JSON
            }
        )

    print(f"  Migrated {len(rows)} layouts")
    return len(rows)


def migrate_history(sqlite_conn, pg_session):
    """Migrate history table."""
    print("\nMigrating history...")
    cursor = sqlite_conn.cursor()
    cursor.execute("""
        SELECT id, layout_id, user_id, change_type, before_state, after_state, timestamp
        FROM history
    """)
    rows = cursor.fetchall()

    for row in rows:
        pg_session.execute(
            text("""
                INSERT INTO history (id, layout_id, user_id, change_type, before_state, after_state, timestamp)
                VALUES (:id, :layout_id, :user_id, :change_type, :before_state, :after_state, :timestamp)
                ON CONFLICT (id) DO NOTHING
            """),
            {
                "id": row[0],
                "layout_id": row[1],
                "user_id": row[2],
                "change_type": row[3],
                "before_state": row[4],
                "after_state": row[5],
                "timestamp": row[6],
            }
        )

    print(f"  Migrated {len(rows)} history entries")
    return len(rows)


def migrate_catalog_items(sqlite_conn, pg_session):
    """Migrate catalog_items table."""
    print("\nMigrating catalog_items...")
    cursor = sqlite_conn.cursor()
    cursor.execute("""
        SELECT id, name, type, category, width, height, depth,
               thumbnail, color, price, tags, mount_type, glb_key,
               created_at, updated_at
        FROM catalog_items
    """)
    rows = cursor.fetchall()

    for row in rows:
        # Parse tags if it's a string
        tags = row[10]
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except:
                tags = []

        pg_session.execute(
            text("""
                INSERT INTO catalog_items (id, name, type, category, width, height, depth,
                                          thumbnail, color, price, tags, mount_type, glb_key,
                                          created_at, updated_at)
                VALUES (:id, :name, :type, :category, :width, :height, :depth,
                       :thumbnail, :color, :price, :tags, :mount_type, :glb_key,
                       :created_at, :updated_at)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    depth = EXCLUDED.depth,
                    updated_at = EXCLUDED.updated_at
            """),
            {
                "id": row[0],
                "name": row[1],
                "type": row[2],
                "category": row[3],
                "width": row[4],
                "height": row[5],
                "depth": row[6],
                "thumbnail": row[7],
                "color": row[8],
                "price": row[9],
                "tags": json.dumps(tags) if tags else "[]",
                "mount_type": row[11],
                "glb_key": row[12],
                "created_at": row[13],
                "updated_at": row[14],
            }
        )

    print(f"  Migrated {len(rows)} catalog items")
    return len(rows)


def reset_sequences(pg_session):
    """Reset PostgreSQL sequences to max ID + 1."""
    print("\nResetting sequences...")

    tables = [
        ("users", "id"),
        ("projects", "id"),
        ("layouts", "id"),
        ("history", "id"),
    ]

    for table, column in tables:
        pg_session.execute(text(f"""
            SELECT setval(pg_get_serial_sequence('{table}', '{column}'),
                         COALESCE((SELECT MAX({column}) FROM {table}), 0) + 1, false)
        """))
        print(f"  Reset sequence for {table}")


def main():
    print("=" * 60)
    print("SQLite to PostgreSQL Migration")
    print("=" * 60)

    print(f"\nSource: {SQLITE_PATH}")
    print(f"Target: {POSTGRES_URL.split('@')[1] if '@' in POSTGRES_URL else POSTGRES_URL}")

    # Connect to databases
    print("\nConnecting to databases...")
    sqlite_conn = get_sqlite_connection()
    pg_engine = get_postgres_engine()

    # Test PostgreSQL connection
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  PostgreSQL connection successful")
    except Exception as e:
        print(f"  PostgreSQL connection failed: {e}")
        print("\n  Make sure PostgreSQL is running:")
        print("    docker compose up -d postgres")
        sys.exit(1)

    # Create tables using Alembic or SQLAlchemy
    print("\nCreating tables...")
    from app.database import Base
    from app.models import User, Project, Layout, History, CatalogItem
    Base.metadata.create_all(bind=pg_engine)
    print("  Tables created")

    # Migrate data
    Session = sessionmaker(bind=pg_engine)
    session = Session()

    try:
        # Migrate in order (respecting foreign keys)
        users_count = migrate_users(sqlite_conn, session)
        projects_count = migrate_projects(sqlite_conn, session)
        layouts_count = migrate_layouts(sqlite_conn, session)
        history_count = migrate_history(sqlite_conn, session)
        catalog_count = migrate_catalog_items(sqlite_conn, session)

        # Reset sequences
        reset_sequences(session)

        # Commit transaction
        session.commit()

        print("\n" + "=" * 60)
        print("Migration Summary")
        print("=" * 60)
        print(f"  Users:         {users_count}")
        print(f"  Projects:      {projects_count}")
        print(f"  Layouts:       {layouts_count}")
        print(f"  History:       {history_count}")
        print(f"  Catalog Items: {catalog_count}")
        print("\nMigration completed successfully!")

    except Exception as e:
        session.rollback()
        print(f"\nMigration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        session.close()
        sqlite_conn.close()


if __name__ == "__main__":
    main()
