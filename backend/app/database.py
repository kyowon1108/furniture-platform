"""
Database connection and session management.
Supports both SQLite (development) and PostgreSQL (production).
"""

from app.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Determine database type from URL
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
is_postgres = settings.DATABASE_URL.startswith("postgresql")

# Configure engine based on database type
if is_sqlite:
    # SQLite specific configuration
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        echo=False,
        poolclass=StaticPool,  # Better for SQLite
    )
elif is_postgres:
    # PostgreSQL configuration with connection pooling
    engine = create_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=5,           # Number of connections to keep open
        max_overflow=10,       # Additional connections when pool is full
        pool_timeout=30,       # Seconds to wait for connection
        pool_recycle=1800,     # Recycle connections after 30 minutes
        pool_pre_ping=True,    # Verify connection before using
    )
else:
    # Fallback for other databases
    engine = create_engine(settings.DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_info() -> dict:
    """Get database connection info for health checks."""
    if is_sqlite:
        return {"type": "SQLite", "url": "file-based"}
    elif is_postgres:
        # Extract host from URL (hide password)
        try:
            from urllib.parse import urlparse
            parsed = urlparse(settings.DATABASE_URL)
            return {
                "type": "PostgreSQL",
                "host": parsed.hostname,
                "port": parsed.port,
                "database": parsed.path.lstrip("/"),
            }
        except:
            return {"type": "PostgreSQL", "url": "connected"}
    else:
        return {"type": "Unknown", "url": settings.DATABASE_URL[:20] + "..."}
