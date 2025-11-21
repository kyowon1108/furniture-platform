# System Architecture

## Overview

The 3D Furniture Platform is a full-stack application with real-time collaboration capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App (React 18 + TypeScript)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pages      │  │  Components  │  │    Stores    │          │
│  │  - Landing   │  │  - 3D Scene  │  │  - Auth      │          │
│  │  - Auth      │  │  - Furniture │  │  - Editor    │          │
│  │  - Projects  │  │  - UI        │  │  - Toast     │          │
│  │  - Editor    │  │  - Toolbar   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Hooks      │  │     Lib      │  │    Types     │          │
│  │  - Keyboard  │  │  - API       │  │  - Furniture │          │
│  │  - Socket    │  │  - Socket    │  │  - API       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI + Socket.IO (Python 3.9)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API Routes  │  │  WebSocket   │  │    Core      │          │
│  │  - Auth      │  │  - Events    │  │  - Security  │          │
│  │  - Projects  │  │  - Rooms     │  │  - Collision │          │
│  │  - Layouts   │  │  - Broadcast │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Models     │  │   Schemas    │  │  Middleware  │          │
│  │  - User      │  │  - Pydantic  │  │  - CORS      │          │
│  │  - Project   │  │  - Validation│  │  - Auth      │          │
│  │  - Layout    │  │              │  │              │          │
│  │  - History   │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQLAlchemy ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  SQLite (Development) / PostgreSQL (Production)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    users     │  │   projects   │  │   layouts    │          │
│  │  - id        │  │  - id        │  │  - id        │          │
│  │  - email     │  │  - owner_id  │  │  - project_id│          │
│  │  - password  │  │  - name      │  │  - version   │          │
│  │  - ...       │  │  - room_*    │  │  - state     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐                                                │
│  │   history    │                                                │
│  │  - id        │                                                │
│  │  - layout_id │                                                │
│  │  - changes   │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Communication Flow

### 1. REST API Flow (HTTP)

```
User Action (Frontend)
    │
    ├─→ Login/Register
    │       │
    │       ├─→ POST /api/v1/auth/login
    │       │       │
    │       │       ├─→ Verify credentials
    │       │       ├─→ Generate JWT token
    │       │       └─→ Return token
    │       │
    │       └─→ Store token in localStorage
    │
    ├─→ Create Project
    │       │
    │       ├─→ POST /api/v1/projects
    │       │       │
    │       │       ├─→ Verify JWT token
    │       │       ├─→ Create project in DB
    │       │       ├─→ Create initial layout
    │       │       └─→ Return project data
    │       │
    │       └─→ Update UI
    │
    └─→ Save Layout
            │
            ├─→ POST /api/v1/projects/{id}/layouts
            │       │
            │       ├─→ Verify JWT token
            │       ├─→ Validate furniture state
            │       ├─→ Save to database
            │       └─→ Return layout data
            │
            └─→ Show success toast
```

### 2. WebSocket Flow (Real-time)

```
User A: Move Furniture
    │
    ├─→ Update local state (Zustand)
    │
    ├─→ Emit 'furniture_move' event
    │       │
    │       └─→ Socket.IO Client
    │               │
    │               └─→ WebSocket Connection
    │                       │
    │                       └─→ Backend Socket.IO Server
    │                               │
    │                               ├─→ Validate event
    │                               │
    │                               └─→ Broadcast to room
    │                                       │
    │                                       ├─→ User B receives event
    │                                       │       │
    │                                       │       └─→ Update furniture position
    │                                       │
    │                                       └─→ User C receives event
    │                                               │
    │                                               └─→ Update furniture position
    │
    └─→ Render updated 3D scene
```

### 3. Collision Detection Flow

```
Furniture Movement
    │
    ├─→ Update position in store
    │
    ├─→ Emit to WebSocket
    │
    ├─→ Backend receives event
    │       │
    │       ├─→ Get all furniture in layout
    │       │
    │       ├─→ Create bounding boxes
    │       │
    │       ├─→ Check collisions (O(n²))
    │       │       │
    │       │       ├─→ For each pair:
    │       │       │   ├─→ Get 2D bounds (XZ plane)
    │       │       │   ├─→ Check intersection
    │       │       │   └─→ Record collision
    │       │       │
    │       │       └─→ Check boundaries
    │       │
    │       └─→ Emit 'validation_result'
    │
    └─→ Frontend receives result
            │
            ├─→ If collision detected:
            │   ├─→ Mark furniture as colliding
            │   ├─→ Change color to red
            │   └─→ Show toast notification
            │
            └─→ Update 3D scene
```

## Component Architecture

### Frontend Component Tree

```
App
├── Layout (Root)
│   ├── Metadata
│   └── Global Styles
│
├── Landing Page
│   ├── Hero Section
│   └── CTA Buttons
│
├── Auth Pages
│   ├── Login
│   │   ├── Form
│   │   └── Error Display
│   └── Register
│       ├── Form
│       └── Error Display
│
├── Projects Page
│   ├── Project List
│   └── Create Button
│
└── Editor Page
    ├── Scene (3D Canvas)
    │   ├── Camera
    │   ├── Lights
    │   ├── Grid
    │   ├── Room
    │   ├── Furniture[]
    │   └── OrbitControls
    │
    ├── Toolbar
    │   ├── Transform Buttons
    │   └── Grid Snap Toggle
    │
    ├── ConnectionStatus
    │
    ├── ToastContainer
    │   └── Toast[]
    │
    └── Save Button
```

### Backend Module Structure

```
app/
├── main.py (FastAPI + Socket.IO)
│
├── config.py (Settings)
│
├── database.py (SQLAlchemy)
│
├── models/
│   ├── user.py
│   ├── project.py
│   ├── layout.py
│   └── history.py
│
├── schemas/
│   ├── user.py
│   ├── project.py
│   └── layout.py
│
├── api/
│   ├── deps.py (Auth dependency)
│   └── v1/
│       ├── auth.py
│       ├── projects.py
│       ├── layouts.py
│       └── websocket.py
│
└── core/
    ├── security.py (JWT, passwords)
    └── collision.py (Detection logic)
```

## Data Models

### User Model
```
User
├── id: int (PK)
├── email: str (unique, indexed)
├── password_hash: str
├── full_name: str (optional)
├── is_active: bool
├── created_at: datetime
├── updated_at: datetime
└── Relationships:
    ├── projects: List[Project]
    └── history_entries: List[History]
```

### Project Model
```
Project
├── id: int (PK)
├── owner_id: int (FK → User)
├── name: str
├── description: str (optional)
├── room_width: float
├── room_height: float
├── room_depth: float
├── has_ply_file: bool
├── ply_file_path: str (optional)
├── ply_file_size: int (optional)
├── created_at: datetime
├── updated_at: datetime
└── Relationships:
    ├── owner: User
    └── layouts: List[Layout]
```

### Layout Model
```
Layout
├── id: int (PK)
├── project_id: int (FK → Project)
├── version: int
├── furniture_state: JSON {
│   └── furnitures: [
│       {
│         id: str,
│         type: str,
│         position: {x, y, z},
│         rotation: {x, y, z},
│         scale: {x, y, z},
│         dimensions: {width, height, depth},
│         color: str (optional)
│       }
│   ]
│ }
├── is_current: bool
├── created_at: datetime
└── Relationships:
    ├── project: Project
    └── history_entries: List[History]
```

## State Management (Zustand)

### Auth Store
```typescript
{
  user: User | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (email, password) => Promise<void>,
  logout: () => void,
  fetchUser: () => Promise<void>
}
```

### Editor Store
```typescript
{
  projectId: number | null,
  furnitures: FurnitureItem[],
  selectedIds: string[],
  transformMode: TransformMode,
  isGridSnap: boolean,
  setProjectId: (id) => void,
  setFurnitures: (furnitures) => void,
  addFurniture: (furniture) => void,
  updateFurniture: (id, updates) => void,
  deleteFurniture: (id) => void,
  selectFurniture: (id, multiSelect) => void,
  clearSelection: () => void,
  setTransformMode: (mode) => void,
  toggleGridSnap: () => void
}
```

### Toast Store
```typescript
{
  toasts: Toast[],
  addToast: (message, type) => void,
  removeToast: (id) => void
}
```

## Security Architecture

### Authentication Flow
```
1. User submits credentials
   ↓
2. Backend verifies password (bcrypt)
   ↓
3. Generate JWT token (HS256)
   ↓
4. Return token to client
   ↓
5. Client stores in localStorage
   ↓
6. Client includes in Authorization header
   ↓
7. Backend verifies token on each request
   ↓
8. Extract user from token
   ↓
9. Check user permissions
   ↓
10. Process request
```

### Authorization Layers
```
Request
  ↓
CORS Middleware (check origin)
  ↓
JWT Verification (check token)
  ↓
User Extraction (get user from token)
  ↓
Ownership Check (verify resource access)
  ↓
Process Request
```

## Scalability Considerations

### Current Architecture (Milestone 1)
- Single server instance
- SQLite database
- In-memory WebSocket rooms
- Suitable for: Development, small teams

### Future Scaling Path
```
Load Balancer
    │
    ├─→ App Server 1 ─┐
    ├─→ App Server 2 ─┼─→ Redis (Session/Socket state)
    └─→ App Server 3 ─┘
            │
            └─→ PostgreSQL (Primary)
                    │
                    └─→ PostgreSQL (Replica)
```

### Optimization Opportunities
1. **Database:**
   - Add indexes on frequently queried fields
   - Implement connection pooling
   - Use read replicas for scaling

2. **WebSocket:**
   - Use Redis adapter for Socket.IO
   - Implement room sharding
   - Add message queuing

3. **Frontend:**
   - Implement code splitting
   - Add service worker for offline support
   - Use CDN for static assets

4. **Caching:**
   - Redis for session data
   - Browser caching for 3D assets
   - API response caching

## Technology Choices Rationale

### Why FastAPI?
- Modern, fast Python framework
- Automatic API documentation (Swagger)
- Native async support
- Type hints and validation
- Easy WebSocket integration

### Why Next.js?
- Server-side rendering capability
- File-based routing
- Built-in optimization
- TypeScript support
- Large ecosystem

### Why Three.js?
- Industry standard for WebGL
- Rich ecosystem
- React Three Fiber for declarative 3D
- Performance optimized
- Extensive documentation

### Why Zustand?
- Minimal boilerplate
- No providers needed
- TypeScript friendly
- Small bundle size
- Easy to test

### Why SQLite (Development)?
- Zero configuration
- File-based (easy backup)
- Fast for development
- Easy migration to PostgreSQL

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN                                  │
│                    (Static Assets)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Frontend │  │ Frontend │  │ Frontend │
        │ Server 1 │  │ Server 2 │  │ Server 3 │
        └──────────┘  └──────────┘  └──────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Backend  │  │ Backend  │  │ Backend  │
        │ Server 1 │  │ Server 2 │  │ Server 3 │
        └──────────┘  └──────────┘  └──────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Redis   │  │PostgreSQL│  │  S3      │
        │ (Cache)  │  │(Database)│  │(Storage) │
        └──────────┘  └──────────┘  └──────────┘
```

---

This architecture provides a solid foundation for the 3D Furniture Platform with clear separation of concerns, scalability paths, and maintainability.
