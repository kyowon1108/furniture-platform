# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Furniture Placement Platform with real-time collaboration. Monorepo structure with Python backend and TypeScript frontend.

## Development Commands

### Backend (FastAPI + Python)

```bash
# Activate conda environment
conda activate furniture-backend

# Start backend server (port 8008)
cd backend
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8008

# Run tests
pytest tests/ -v

# Run single test file
pytest tests/test_auth.py -v

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Frontend (Next.js + React)

```bash
cd frontend
npm install
npm run dev      # Development server (port 3008)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Backend (`backend/`)

- **`app/main.py`**: FastAPI app wrapped with Socket.IO (`socket_app` is the ASGI entry point)
- **`app/api/v1/`**: API routers
  - `auth.py`: JWT authentication (register, login)
  - `projects.py`: Project CRUD
  - `layouts.py`: Layout versioning and validation
  - `files.py`: PLY file handling with Gaussian Splatting conversion
  - `files_3d.py`: GLB/3D file support
  - `websocket.py`: Socket.IO event handlers for real-time sync
- **`app/core/`**: Security (JWT) and collision detection logic
- **`app/models/`**: SQLAlchemy ORM models (User, Project, Layout, History)
- **`app/schemas/`**: Pydantic schemas for request/response validation
- **Database**: SQLite (`dev.db`) with Alembic migrations

### Frontend (`frontend/`)

- **`app/`**: Next.js 14 App Router pages
  - `auth/`: Login/Register pages
  - `projects/`: Project list and management
  - `editor/[id]/`: 3D editor for specific project
- **`components/3d/`**: Three.js components
  - `Scene.tsx`: Main 3D scene container (orchestrates all 3D elements)
  - `Room.tsx`: Room boundaries and floor
  - `Furniture.tsx`: Furniture item rendering with transform controls
  - `PlyModel.tsx`: PLY point cloud/mesh rendering
  - `GlbModel.tsx`: GLB model loading and rendering
- **`store/`**: Zustand state management
  - `editorStore.ts`: Furniture state, selection, undo/redo history
  - `authStore.ts`: Authentication state
  - `materialStore.ts`: Material/texture management
- **`lib/`**: Utilities
  - `api.ts`: Axios API client
  - `socket.ts`: Socket.IO client
  - `plyParser.ts`: Client-side PLY parsing

### Real-time Collaboration

Socket.IO events flow: Client → `websocket.py` → Broadcast to room → All clients update via Zustand stores.

### Key Patterns

- Backend uses dependency injection via `app/api/deps.py` for database sessions and current user
- Frontend 3D scene uses React Three Fiber with `@react-three/drei` helpers
- Collision detection happens server-side in `app/core/collision.py`
- PLY files can be Gaussian Splatting format (auto-converted to RGB) or standard format

## Environment Setup

Backend: Copy `backend/.env.example` to `backend/.env`
Frontend: Copy `frontend/.env.local.example` to `frontend/.env.local`

## Deployment

Scripts in `deployment/`:
- `deploy.sh`: Full deployment to EC2
- `quick_update.sh`: Fast code update
- Nginx config and systemd service files included
