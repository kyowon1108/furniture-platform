"""Main FastAPI application with Socket.IO integration."""

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, files, files_3d, layouts, projects, websocket
from app.config import settings

# Create FastAPI app
app = FastAPI(title="Furniture Platform API", version="1.0.0", description="3D Furniture Placement Platform Backend")

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
app.include_router(files_3d.router, prefix="/api/v1/files", tags=["3d-files"])  # New 3D file support

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
