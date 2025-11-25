"""Main FastAPI application with Socket.IO integration."""

import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, catalog, files, files_3d, layouts, logs, projects, room_builder, websocket
from app.api.v1.catalog import sync_catalog_from_s3
from app.config import settings
from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print("🚀 Server starting up...")

    # Create database tables (including new CatalogItem table)
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

    logs.initialize_log_file()
    print("✅ Log file initialized")

    # Sync catalog from S3 to DB
    sync_catalog_from_s3()

    yield

    # Shutdown
    print("🛑 Server shutting down...")
    logs.finalize_log_file()
    print("✅ Log file finalized")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Furniture Platform API",
    version="1.0.0",
    description="3D Furniture Placement Platform Backend",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Health check endpoint."""
    return {"status": "ok", "database": "SQLite"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {"message": "Furniture Platform API", "version": "1.0.0", "docs": "/docs"}
