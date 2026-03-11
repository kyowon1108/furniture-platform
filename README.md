# 방구석 전문가

웹 브라우저에서 방 구조를 만들고, 3D 가구를 배치하고, 실시간 협업까지 할 수 있는 인테리어 편집 플랫폼입니다. 코디세이 텀 프로젝트로 시작했지만, 현재 저장소는 공개 베타를 염두에 둔 보안/운영 정비를 포함한 구조로 정리되고 있습니다.

## 현재 상태

- Frontend: Next.js 14, React 18, TypeScript, React Three Fiber
- Backend: FastAPI, Socket.IO, SQLAlchemy, Alembic
- 저장소/카탈로그: PostgreSQL 지원, AWS S3 카탈로그 연동
- 주요 기능:
  - Room Builder / Free Build
  - 3D 가구 배치와 충돌 감지
  - 프로젝트/레이아웃 저장
  - 실시간 협업, 잠금, presence
  - GLB/PLY 업로드와 보호된 다운로드

## 로컬 실행

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8008
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:3008`
- Backend API: `http://localhost:8008/api/v1`
- Swagger UI: `http://localhost:8008/docs`

## 환경 변수 핵심값

`backend/.env`

- `DATABASE_URL`: SQLite 또는 PostgreSQL 연결 문자열
- `SECRET_KEY`: JWT 서명 키
- `ALLOWED_ORIGINS`: 허용할 프론트엔드 origin 목록
- `ADMIN_EMAILS`: 카탈로그 관리 API 접근을 허용할 이메일 목록

`frontend/.env.local`

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

## 보안 메모

- 카탈로그 수정/동기화 API는 `ADMIN_EMAILS`에 포함된 사용자만 접근할 수 있습니다.
- Socket.IO 연결은 JWT 토큰이 있어야 수락됩니다.
- 업로드 파일은 인증된 다운로드 엔드포인트로만 접근해야 하며, Nginx에서 `/uploads/`를 직접 공개하지 않습니다.
- 배포 템플릿은 HTTPS 전제를 기준으로 작성됩니다.

## 문서

- 전체 인덱스: [docs/README.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/docs/README.md)
- API 사양: [docs/05_API_문서.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/docs/05_API_문서.md)
- 개발 가이드: [docs/06_개발_가이드.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/docs/06_개발_가이드.md)
- 배포 안내: [deployment/README.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/deployment/README.md)

`docs/update_code/`는 변경 보고서 아카이브이며, 현재 운영 기준의 source of truth는 위 문서들입니다.
