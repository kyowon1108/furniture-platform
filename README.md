# 🏠 3D 가구 배치 플랫폼 (Furniture Platform)

## 📋 프로젝트 개요
실시간 협업이 가능한 3D 가구 배치 및 인테리어 디자인 웹 플랫폼

## 🚨 중요 정보 (세션 초기화 시 필수 확인)

### 🔌 포트 정보
- **Frontend**: `3008` (Next.js)
- **Backend**: `8008` (FastAPI/Uvicorn)
- **Database**: SQLite (`backend/furniture_platform.db`)
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
- **GLB 파일 저장**: `backend/uploads/glb_files/`

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
│   ├── uploads/
│   │   └── glb_files/     # GLB 파일 저장소
│   ├── .env               # 환경변수
│   └── furniture_platform.db  # SQLite DB
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
│   │   │   └── PlyModel.tsx
│   │   ├── room-builder/  # Room Builder UI
│   │   │   ├── RoomScene.tsx
│   │   │   ├── RoomTemplateSelector.tsx
│   │   │   └── types.ts
│   │   └── ui/            # UI 컴포넌트
│   ├── utils/
│   │   ├── optimizedTextureAtlas.ts  # 텍스처 최적화
│   │   └── advancedTextureOptimizer.ts
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
- 충돌 감지 시스템
- 가구 회전/이동/삭제
- PLY/GLB 모델 지원
- TransformControls 기반 정밀 조작

### 3. Room Builder (`/room-builder/[projectId]`)
- **지원 방 템플릿**:
  - 일자형 원룸 (3m × 4m)
  - 소형 스튜디오 (2.5m × 3m)
  - 정사각형 원룸 (4m × 4m)
  - 복도형 원룸 (6m × 2.5m)
  - 사용자 정의 (2m~10m 조절 가능)
- **타일 기반 텍스처 시스템**
- 벽/바닥 개별 텍스처 적용
- 실시간 3D 미리보기
- GLB 파일 자동 생성 및 저장

### 4. 가구 충돌 감지
- 실시간 충돌 감지
- 벽 경계 체크
- 가구 간 충돌 방지
- Y축 자동 조정 (바닥 정렬)

### 5. 실시간 협업
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
DATABASE_URL=sqlite:///./furniture_platform.db
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

### 데이터베이스 초기화
```bash
cd backend
rm -f furniture_platform.db
# 서버 재시작시 자동으로 새 DB 생성
```

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
POST   /api/v1/room-builder/upload-glb  # GLB 파일 업로드
GET    /api/v1/room-builder/download-glb/{project_id}  # GLB 다운로드
WS     /ws/{project_id}            # WebSocket 연결
```

## 🔧 문제 해결

### CORS 에러
- Backend `.env`의 `ALLOWED_ORIGINS`에 프론트엔드 URL 추가
- AWS 배포 시 Public IP 추가 필요

### 로그인 실패
- `/api/v1/auth/login`은 form-data 형식 사용
- `username` 필드에 이메일 입력

### 가구가 바닥에서 뜨는 문제
- `Scene.tsx`의 Y축 threshold 값 조정 (현재: 0.1)
- 충돌 감지 마진 조정

### WebSocket 연결 실패
- 실시간 협업 기능에만 영향
- 기본 기능은 정상 작동

### 캐시 문제 발생 시
```bash
# Frontend 캐시 삭제
cd frontend
rm -rf .next
npm run dev

# 브라우저 캐시 삭제
# Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)
```

## 📝 최근 변경사항 (2025-11-26)

### 🚫 L자/ㄱ자 방 구조 완전 제거
- **제거된 템플릿**: L자형(lshaped), U자형(ushaped)
- **제거된 파일/코드**:
  - `types.ts`: L자/U자 템플릿 정의 제거
  - `RoomScene.tsx`: L자/U자 렌더링 로직 제거
  - `page.tsx`: L자/U자 타일 생성 로직 제거
  - `optimizedTextureAtlas.ts`, `advancedTextureOptimizer.ts`: wall-inner 참조 제거
  - `catalog.ts`: L자형 책상 제거

### ✅ 개선사항
- 가구 충돌 감지 정확도 향상
- 가구 Y축 위치 안정화 (바닥 정렬)
- 텍스처 시스템 안정화
- GLB 파일 생성 최적화

## 🔑 중요 파일 위치

- **충돌 감지**: `frontend/components/3d/Scene.tsx` (checkCollision 함수)
- **Room 템플릿**: `frontend/components/room-builder/types.ts`
- **Room 렌더링**: `frontend/components/room-builder/RoomScene.tsx`
- **인증 로직**: `backend/app/core/security.py`
- **GLB 업로드**: `backend/app/api/v1/room_builder.py`
- **배포 스크립트**: `deployment/deploy.sh`

## 📞 지원

문제 발생 시 확인 순서:
1. 포트 확인 (Frontend: 3008, Backend: 8008)
2. 환경변수 확인 (.env, .env.local)
3. 데이터베이스/캐시 초기화
4. 서비스 상태 확인 (systemctl status)
5. 로그 확인 (journalctl)
6. CORS 설정 확인
7. 브라우저 캐시 삭제

---

**Last Updated**: 2025-11-26
**Current Deployment**: 13.125.249.5
**Development Status**: Active