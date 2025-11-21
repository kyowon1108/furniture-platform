# 3D 가구 배치 플랫폼 - 전체 완성 ✅

실시간 협업이 가능한 3D 가구 배치 플랫폼입니다.

## 🎉 전체 마일스톤 완료!

### Milestone 1: 기본 기능 ✅
- 사용자 인증, 프로젝트 관리, 3D 렌더링, 실시간 협업, 충돌 감지

### Milestone 2: 필수 기능 ✅
- 자동 저장, 가구 카탈로그, 드래그 앤 드롭, PNG 내보내기, 한글 UI

### Milestone 3: 고급 기능 ✅
- Undo/Redo, 측정 도구, 조명 시뮬레이션, 복사/붙여넣기, PLY 파일 업로드

## 📚 문서

- **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** - 최종 완성 보고서 ⭐
- **[docs/](docs/)** - 상세 개발 가이드 (6개 문서)
- **[MILESTONE1.md](MILESTONE1.md)** - Milestone 1 상세
- **[MILESTONE2.md](MILESTONE2.md)** - Milestone 2 상세
- **[MILESTONE3.md](MILESTONE3.md)** - Milestone 3 상세

## Tech Stack

### Backend
- FastAPI + SQLite
- Python 3.9.18
- Socket.IO for real-time communication
- SQLAlchemy ORM
- JWT authentication

### Frontend
- Next.js 14 + React
- Three.js + React Three Fiber
- TypeScript
- Zustand for state management
- Socket.IO client

## Prerequisites

- Python 3.9.18 (Conda environment: `furniture-backend`)
- Node.js 18+ and npm
- Conda (already configured)

## Setup Instructions

### Backend Setup

1. **Activate Conda environment:**
```bash
conda activate furniture-backend
```

2. **Navigate to backend directory:**
```bash
cd furniture-platform/backend
```

3. **Install Python dependencies:**
```bash
# pip install -r requirements.txt
```

4. **Run database migrations:**
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

5. **Start the backend server:**
```bash
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd furniture-platform/frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The frontend will be available at: http://localhost:3000

## Testing

### Backend Tests

```bash
cd furniture-platform/backend
pytest tests/ -v
```

### Test Coverage

- Authentication (register, login, JWT)
- Project CRUD operations
- Layout management
- Collision detection system

## Usage Guide

### 1. Register & Login

1. Visit http://localhost:3000
2. Click "Sign Up" and create an account
3. Login with your credentials

### 2. Create a Project

1. After login, you'll see the Projects page
2. Click "New Project"
3. Choose creation mode:
   - **Manual Input**: Enter room dimensions manually
   - **PLY File Upload**: Upload a 3D scanned room file (.ply, no size limit)
4. Enter project details (name, room dimensions)
5. If using PLY mode, select your PLY file
6. Click "Create"

### 3. Use the 3D Editor

**Navigation:**
- Left mouse drag: Rotate camera
- Right mouse drag: Pan camera
- Scroll wheel: Zoom in/out

**Keyboard Shortcuts:**
- `T`: Translate mode
- `R`: Rotate mode
- `S`: Scale mode
- `Ctrl+S`: Save layout
- `Delete/Backspace`: Delete selected furniture

**Furniture Operations:**
- Click to select furniture
- Ctrl+Click for multi-select
- Drag to move (in translate mode)

### 4. Real-time Collaboration

1. Open the same project in multiple browser windows
2. Login with different accounts
3. Changes made in one window appear in real-time in others
4. Collision detection alerts appear when furniture overlaps

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects` - List user's projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Files
- `POST /api/v1/files/upload-ply/{project_id}` - Upload PLY file
- `GET /api/v1/files/ply/{project_id}` - Get PLY file info
- `DELETE /api/v1/files/ply/{project_id}` - Delete PLY file

### Layouts
- `GET /api/v1/projects/{id}/layouts/current` - Get current layout
- `POST /api/v1/projects/{id}/layouts` - Save new layout version
- `GET /api/v1/projects/{id}/layouts` - List all layout versions
- `POST /api/v1/projects/{id}/layouts/{layout_id}/restore` - Restore previous version
- `POST /api/v1/validate` - Validate furniture layout

### WebSocket Events

**Client → Server:**
- `join_project` - Join project room
- `furniture_move` - Move furniture
- `furniture_add` - Add furniture
- `furniture_delete` - Delete furniture
- `validate_furniture` - Validate layout

**Server → Client:**
- `user_joined` - User joined project
- `user_left` - User left project
- `furniture_updated` - Furniture position updated
- `furniture_added` - Furniture added
- `furniture_deleted` - Furniture deleted
- `validation_result` - Validation result
- `collision_detected` - Collision detected

## Project Structure

```
furniture-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── core/            # Security & collision detection
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database connection
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   ├── tests/               # Test suite
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
└── frontend/
    ├── app/                 # Next.js pages
    ├── components/          # React components
    ├── hooks/               # Custom hooks
    ├── lib/                 # API & Socket clients
    ├── store/               # Zustand stores
    ├── types/               # TypeScript types
    └── package.json         # Node dependencies
```

## Features Implemented

### Backend ✅
- [x] User authentication with JWT
- [x] Project CRUD operations
- [x] Layout versioning system
- [x] Collision detection (2D XZ plane)
- [x] Boundary checking
- [x] WebSocket real-time sync
- [x] SQLite database with migrations
- [x] Comprehensive test suite

### Frontend ✅
- [x] User authentication UI
- [x] Project management UI
- [x] 3D scene with Three.js
- [x] Furniture rendering
- [x] Camera controls (OrbitControls)
- [x] Keyboard shortcuts
- [x] Real-time collaboration
- [x] Toast notifications
- [x] Connection status indicator

## Database Schema

### Users
- id, email, password_hash, full_name, is_active, created_at, updated_at

### Projects
- id, owner_id, name, description, room_width, room_height, room_depth, has_ply_file, ply_file_path, ply_file_size, created_at, updated_at

### Layouts
- id, project_id, version, furniture_state (JSON), is_current, created_at

### History
- id, layout_id, user_id, change_type, before_state (JSON), after_state (JSON), timestamp

## Future Extensibility

### Database
The codebase is designed for easy database migration:
- All models use SQLAlchemy ORM (DB-independent)
- JSON storage uses TEXT type (compatible with all DBs)
- Configuration centralized in `config.py` and `database.py`

To add PostgreSQL/MySQL:
1. Update `DATABASE_URL` in `.env`
2. Modify engine creation in `database.py`
3. No model changes required

### Features for Future Milestones
- 3D Gaussian Splatting integration
- PLY file rendering in 3D scene
- Automatic room dimension extraction from PLY
- PLY file preview before upload
- Cloud storage integration (S3)
- User permissions & sharing

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Database locked:**
```bash
rm backend/dev.db
alembic upgrade head
```

### Frontend Issues

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**WebSocket connection failed:**
- Ensure backend is running on port 8000
- Check CORS settings in backend

## License

MIT License - See LICENSE file for details
