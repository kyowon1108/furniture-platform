# 🏠 3D 가구 배치 플랫폼 (Furniture Platform)

## 📋 프로젝트 개요
실시간 협업이 가능한 3D 가구 배치 및 인테리어 디자인 웹 플랫폼

## 🚨 중요 정보 (세션 초기화 시 필수 확인)

### 🔌 포트 정보
- **Frontend**: `3008` (Next.js)
- **Backend**: `8008` (FastAPI/Uvicorn)
- **Database**: SQLite (`backend/dev.db`)
- **WebSocket**: `8008` (실시간 협업)

### 🌐 AWS 배포 정보
- **EC2 Instance IP**: `13.125.249.5`
- **Instance Type**: t3a.large (ap-northeast-2)
- **SSH Key**: `deployment/furniture-platform-key.pem`
- **접속 명령**:
  ```bash
  ssh -i deployment/furniture-platform-key.pem ubuntu@13.125.249.5
  ```

### 📁 핵심 파일 경로
- **Backend 환경변수**: `backend/.env`
- **Frontend 환경변수**: `frontend/.env.local`
- **AWS 인증정보**: `~/.aws/credentials`
- **배포 스크립트**: `deployment/deploy.sh`

## 🏗️ 프로젝트 구조

```
furniture-platform/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 앱 엔트리포인트
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py         # 인증 API
│   │   │       ├── projects.py     # 프로젝트 관리
│   │   │       ├── room_builder.py # Room Builder API
│   │   │       ├── catalog.py      # 가구 카탈로그
│   │   │       └── websocket.py    # 실시간 협업
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── schemas/        # Pydantic 스키마
│   │   └── core/
│   │       ├── security.py # 보안/인증
│   │       └── collision.py # 충돌 감지
│   ├── .env               # 환경변수
│   └── dev.db             # SQLite DB
│
├── frontend/               # Next.js 프론트엔드
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # 메인 페이지
│   │   ├── auth/
│   │   │   ├── login/     # 로그인
│   │   │   └── register/  # 회원가입
│   │   ├── projects/      # 프로젝트 목록
│   │   ├── editor/[projectId]/    # 3D 에디터
│   │   └── room-builder/[projectId]/ # Room Builder
│   ├── components/
│   │   ├── 3d/           # Three.js 컴포넌트
│   │   │   ├── Scene.tsx
│   │   │   ├── Room.tsx
│   │   │   ├── Furniture.tsx
│   │   │   ├── GlbModel.tsx
│   │   │   ├── CollisionDummy.tsx # L자 방 충돌
│   │   │   └── PlyModel.tsx
│   │   ├── room-builder/  # Room Builder UI
│   │   └── ui/            # UI 컴포넌트
│   ├── store/             # Zustand 상태관리
│   │   ├── useProjectStore.ts
│   │   ├── useLayoutStore.ts
│   │   └── materialStore.ts
│   └── .env.local         # 환경변수
│
└── deployment/            # AWS 배포
    ├── deploy.sh         # 메인 배포 스크립트
    ├── nginx.conf        # Nginx 설정
    └── furniture-platform-key.pem # SSH 키

```

## 🎯 주요 기능

### 1. 인증 시스템
- **회원가입**: `/api/v1/auth/register`
- **로그인**: `/api/v1/auth/login` (OAuth2 form-data)
- **JWT 토큰 기반 인증**

### 2. 3D 에디터 (`/editor/[projectId]`)
- 실시간 3D 가구 배치
- 드래그 앤 드롭
- 충돌 감지
- 가구 회전/이동/삭제
- PLY/GLB 모델 지원

### 3. Room Builder (`/room-builder/[projectId]`)
- 방 템플릿 선택 (기본, L자형, U자형)
- 벽/바닥 재질 변경
- AI 기반 타일 생성 (AWS Bedrock)
- 실시간 미리보기

### 4. 실시간 협업
- WebSocket 기반
- 다중 사용자 동시 편집
- 실시간 커서/선택 동기화

## 🛠️ 로컬 개발 환경

### Backend 실행
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8008 --host 0.0.0.0
```

### Frontend 실행
```bash
cd frontend
npm install
npm run dev  # 포트 3008에서 실행
```

### 환경변수 설정

#### Backend (.env)
```env
DATABASE_URL=sqlite:///./dev.db
SECRET_KEY=your-secret-key-change-this-in-production-must-be-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3008,http://127.0.0.1:3008
HOST=0.0.0.0
PORT=8008
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8008/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8008
```

## 🚀 AWS 배포

### 배포 명령
```bash
cd deployment
./deploy.sh 13.125.249.5
```

### 배포 후 접속 URL
- **Frontend**: http://13.125.249.5
- **Backend API**: http://13.125.249.5:8008
- **API Docs**: http://13.125.249.5:8008/docs

### 서비스 관리
```bash
# SSH 접속
ssh -i deployment/furniture-platform-key.pem ubuntu@13.125.249.5

# 서비스 상태 확인
sudo systemctl status furniture-backend
sudo systemctl status furniture-frontend
sudo systemctl status nginx

# 로그 확인
sudo journalctl -u furniture-backend -f
sudo journalctl -u furniture-frontend -f
```

## 📊 데이터베이스

### SQLite 구조
- **users**: 사용자 정보
- **projects**: 프로젝트 메타데이터
- **layouts**: 가구 배치 정보 (JSON)
- **catalog_items**: 가구 카탈로그
- **history**: 변경 이력

### 주요 엔드포인트
```
POST   /api/v1/auth/register       # 회원가입
POST   /api/v1/auth/login          # 로그인
GET    /api/v1/projects            # 프로젝트 목록
POST   /api/v1/projects            # 프로젝트 생성
GET    /api/v1/projects/{id}       # 프로젝트 조회
PUT    /api/v1/projects/{id}       # 프로젝트 수정
DELETE /api/v1/projects/{id}       # 프로젝트 삭제
GET    /api/v1/catalog             # 가구 카탈로그
POST   /api/v1/materials/ai-tile   # AI 타일 생성
WS     /ws/{project_id}            # WebSocket 연결
```

## 🔧 문제 해결

### CORS 에러
- Backend `.env`의 `ALLOWED_ORIGINS`에 프론트엔드 URL 추가
- AWS 배포 시 Public IP 추가 필요

### 로그인 실패
- `/api/v1/auth/login`은 form-data 형식 사용
- `username` 필드에 이메일 입력

### CSS 로딩 실패
- Frontend 포트 확인 (3008)
- Nginx 설정 확인

### AWS Bedrock 에러
- AWS 자격증명 확인: `~/.aws/credentials`
- EC2에 credentials 파일 복사 필요

## 📝 개발 메모

### 현재 작업 중
- L자형 방 충돌 감지 (CollisionDummy.tsx)
- Room Builder 통합
- AI 타일 생성 기능

### 알려진 이슈
- L자형 방 충돌 감지 미완성
- AWS 배포 시 CSS 로딩 문제
- 데이터베이스 초기화 필요 시 있음

## 🔑 중요 파일 위치

- **충돌 감지**: `frontend/components/3d/CollisionDummy.tsx`
- **Room 렌더링**: `frontend/components/3d/Room.tsx`
- **인증 로직**: `backend/app/core/security.py`
- **WebSocket**: `backend/app/api/v1/websocket.py`
- **배포 스크립트**: `deployment/deploy.sh`
- **Nginx 설정**: `deployment/nginx.conf`

## 📞 지원

문제 발생 시 확인 순서:
1. 포트 확인 (Frontend: 3008, Backend: 8008)
2. 환경변수 확인 (.env, .env.local)
3. 서비스 상태 확인 (systemctl status)
4. 로그 확인 (journalctl)
5. CORS 설정 확인

---

**Last Updated**: 2025-11-26
**Current Deployment**: 13.125.249.5
**Development Status**: Active