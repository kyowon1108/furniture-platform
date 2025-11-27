# 3D 가구 배치 플랫폼

## 프로젝트 개요
실시간 협업이 가능한 3D 가구 배치 및 인테리어 디자인 웹 플랫폼

## 포트 및 서버 정보

| 서비스 | 포트 | 비고 |
|--------|------|------|
| Frontend | 3008 | Next.js |
| Backend | 8008 | FastAPI/Uvicorn |
| Database | - | SQLite (backend/dev.db) |
| WebSocket | 8008 | 실시간 협업 |

### AWS 배포 정보
- EC2 Instance IP: `13.125.249.5`
- Instance Type: t3a.large (ap-northeast-2)
- SSH Key: `deployment/furniture-platform-key.pem`

```bash
# SSH 접속
ssh -i deployment/furniture-platform-key.pem ubuntu@13.125.249.5
```

## 프로젝트 구조

```
furniture-platform/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 앱 엔트리포인트
│   │   ├── api/v1/
│   │   │   ├── auth.py         # 인증 API
│   │   │   ├── projects.py     # 프로젝트 관리
│   │   │   ├── room_builder.py # Room Builder API
│   │   │   ├── files_3d.py     # 3D 파일 업로드/다운로드
│   │   │   ├── catalog.py      # 가구 카탈로그
│   │   │   └── websocket.py    # 실시간 협업
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── schemas/        # Pydantic 스키마
│   │   └── core/
│   │       ├── security.py # 보안/인증
│   │       └── collision.py # 충돌 감지
│   ├── uploads/glb_files/  # GLB 파일 저장소
│   └── dev.db              # SQLite DB
│
├── frontend/               # Next.js 프론트엔드
│   ├── app/
│   │   ├── page.tsx        # 메인 페이지
│   │   ├── theme.css       # 전역 테마 스타일
│   │   ├── auth/           # 로그인/회원가입
│   │   ├── projects/       # 프로젝트 목록
│   │   ├── editor/[projectId]/      # 3D 에디터
│   │   └── room-builder/[projectId]/ # Room Builder
│   ├── components/
│   │   ├── 3d/             # Three.js 컴포넌트
│   │   │   ├── Scene.tsx
│   │   │   ├── Room.tsx
│   │   │   ├── Furniture.tsx
│   │   │   ├── GlbModel.tsx
│   │   │   └── PlyModel.tsx
│   │   ├── room-builder/   # Room Builder UI
│   │   └── ui/             # UI 컴포넌트
│   │       ├── Toolbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── CameraControls.tsx
│   ├── store/              # Zustand 상태관리
│   └── .env.local          # 환경변수
│
└── deployment/             # AWS 배포
    ├── deploy.sh           # 배포 스크립트
    └── furniture-platform-key.pem
```

## 주요 기능

### 1. 인증 시스템
- 회원가입/로그인 (JWT 토큰 기반)
- OAuth2 form-data 방식 로그인

### 2. 3D 에디터 (/editor/[projectId])
- 실시간 3D 가구 배치
- 드래그 앤 드롭
- 충돌 감지 시스템
- 가구 회전/이동/삭제
- PLY/GLB 모델 지원
- TransformControls 기반 정밀 조작
- 조명 시뮬레이션 (아침/오후/저녁/밤)
- 거리 측정 도구

### 3. Room Builder (/room-builder/[projectId])
지원 방 템플릿:
- 일자형 원룸 (3m x 4m)
- 소형 스튜디오 (2.5m x 3m)
- 정사각형 원룸 (4m x 4m)
- 복도형 원룸 (6m x 2.5m)
- 사용자 정의 (2m~10m)

기능:
- 타일 기반 텍스처 시스템
- 벽/바닥 개별 텍스처 적용
- 실시간 3D 미리보기
- GLB 파일 자동 생성

### 4. UI/UX
- Dark Purple 테마
- Glassmorphism 스타일 플로팅 툴바
- 온캔버스 카메라 컨트롤 (줌, 뷰 프리셋)
- 반응형 사이드바

### 5. 실시간 협업
- WebSocket 기반 다중 사용자 동시 편집

## 로컬 개발 환경

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8008 --host 0.0.0.0
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # 포트 3008
```

### 환경변수

Backend (.env):
```env
DATABASE_URL=sqlite:///./dev.db
SECRET_KEY=your-secret-key-change-this-in-production-must-be-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ALLOWED_ORIGINS=http://localhost:3008,http://127.0.0.1:3008
HOST=0.0.0.0
PORT=8008
```

Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:8008/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8008
```

## AWS 배포

### 배포 명령
```bash
cd deployment
./deploy.sh 13.125.249.5
```

### 접속 URL
- Frontend: http://13.125.249.5:3008
- Backend API: http://13.125.249.5:8008
- API Docs: http://13.125.249.5:8008/docs

### 서비스 관리
```bash
# 서비스 상태 확인
sudo systemctl status furniture-backend
sudo systemctl status furniture-frontend

# 로그 확인
sudo journalctl -u furniture-backend -f
sudo journalctl -u furniture-frontend -f

# 서비스 재시작
sudo systemctl restart furniture-backend
sudo systemctl restart furniture-frontend
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/v1/auth/register | 회원가입 |
| POST | /api/v1/auth/login | 로그인 (form-data) |
| GET | /api/v1/auth/me | 현재 사용자 정보 |
| GET | /api/v1/projects | 프로젝트 목록 |
| POST | /api/v1/projects | 프로젝트 생성 |
| GET | /api/v1/projects/{id} | 프로젝트 조회 |
| PUT | /api/v1/projects/{id} | 프로젝트 수정 |
| DELETE | /api/v1/projects/{id} | 프로젝트 삭제 |
| GET | /api/v1/catalog | 가구 카탈로그 |
| POST | /api/v1/files-3d/upload-3d/{project_id} | GLB 파일 업로드 |
| GET | /api/v1/files-3d/download-3d/{project_id} | GLB 파일 다운로드 |
| POST | /api/v1/room-builder/generate-texture | 텍스처 생성 |
| WS | /socket.io/ | WebSocket 연결 |

## 데이터베이스

### 테이블 구조
- users: 사용자 정보
- projects: 프로젝트 메타데이터
- layouts: 가구 배치 정보 (JSON)
- catalog_items: 가구 카탈로그

### 초기화
```bash
cd backend
rm -f dev.db
# 서버 재시작시 자동으로 새 DB 생성
```

## 문제 해결

### CORS 에러
Backend `.env`의 `ALLOWED_ORIGINS`에 프론트엔드 URL 추가

### 로그인 실패
- `/api/v1/auth/login`은 form-data 형식 사용
- `username` 필드에 이메일 입력

### WebSocket 연결 실패
실시간 협업 기능에만 영향, 기본 기능은 정상 작동

### 캐시 문제
```bash
# Frontend 캐시 삭제
cd frontend
rm -rf .next
npm run build
npm start -p 3008

# 브라우저 캐시 삭제
# Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)
```

## 파일 위치 참조

| 기능 | 파일 |
|------|------|
| 충돌 감지 | frontend/components/3d/Scene.tsx |
| Room 템플릿 | frontend/components/room-builder/types.ts |
| Room 렌더링 | frontend/components/room-builder/RoomScene.tsx |
| GLB 모델 로더 | frontend/components/3d/GlbModel.tsx |
| 인증 로직 | backend/app/core/security.py |
| 3D 파일 API | backend/app/api/v1/files_3d.py |
| 테마 스타일 | frontend/app/theme.css |

---

Last Updated: 2025-11-27
