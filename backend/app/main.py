"""Main FastAPI application with Socket.IO integration."""

import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, catalog, files, files_3d, layouts, logs, projects, room_builder, websocket
from app.api.v1.catalog import sync_catalog_from_s3
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger
from app.database import engine, Base

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Server starting up...")

    # Create database tables (including new CatalogItem table)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    logs.initialize_log_file()
    logger.info("Log file initialized")

    # Sync catalog from S3 to DB
    sync_catalog_from_s3()

    yield

    # Shutdown
    logger.info("Server shutting down...")
    logs.finalize_log_file()
    logger.info("Log file finalized")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Furniture Platform API",
    version="1.0.0",
    description="3D Furniture Placement Platform Backend",
    lifespan=lifespan
)

# Register global exception handlers
register_exception_handlers(app)

# Configure CORS with specific methods and headers for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(layouts.router, prefix="/api/v1", tags=["layouts"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])  # Legacy PLY support
app.include_router(files_3d.router, prefix="/api/v1/files-3d", tags=["3d-files"])  # New 3D file support
app.include_router(room_builder.router, prefix="/api/v1/room-builder", tags=["room-builder"])  # Room builder support
app.include_router(logs.router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(catalog.router, prefix="/api/v1", tags=["catalog"])

# Wrap FastAPI app with Socket.IO
socket_app = socketio.ASGIApp(websocket.sio, app, socketio_path="socket.io")


@app.get("/health")
async def health_check():
    """Health check endpoint with database connection verification."""
    from app.database import get_db_info, SessionLocal
    from sqlalchemy import text

    db_info = get_db_info()

    # Actually test database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_info,
        "db_connection": db_status
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {"message": "Furniture Platform API", "version": "1.0.0", "docs": "/docs"}
