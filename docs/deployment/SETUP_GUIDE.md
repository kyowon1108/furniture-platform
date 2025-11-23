# Furniture Platform - 실행 가이드

## 사전 준비사항

- Python 3.12 이상
- Node.js 22.x 이상
- npm 10.x 이상

## Backend 실행하기

### 1. Backend 디렉토리로 이동
```bash
cd backend
```

### 2. Python 가상환경 활성화
```bash
source venv/bin/activate
```

### 3. Backend 서버 실행
```bash
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8008
```

Backend 서버가 `http://localhost:8008`에서 실행됩니다.

### Backend API 문서 확인
서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- Swagger UI: http://localhost:8008/docs
- ReDoc: http://localhost:8008/redoc

---

## Frontend 실행하기

### 1. Frontend 디렉토리로 이동
새 터미널 창을 열고:
```bash
cd frontend
```

### 2. Frontend 개발 서버 실행
```bash
npm run dev
```

Frontend 애플리케이션이 `http://localhost:3008`에서 실행됩니다.

---

## 전체 시스템 실행 순서

1. **터미널 1** - Backend 실행:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8008
   ```

2. **터미널 2** - Frontend 실행:
   ```bash
   cd frontend
   npm run dev
   ```

3. 브라우저에서 `http://localhost:3008` 접속

---

## 환경 설정 정보

### Backend 설정 (backend/.env)
- `DATABASE_URL`: SQLite 데이터베이스 경로 (`sqlite:///./dev.db`)
- `PORT`: Backend 서버 포트 (8008)
- `ALLOWED_ORIGINS`: CORS 허용 오리진 (Frontend URL 포함)
- `SECRET_KEY`: JWT 토큰 암호화 키

### Frontend 설정
- API URL: `http://localhost:8008/api/v1`
- Socket URL: `http://localhost:8008`
- Frontend 포트: 3008

### 데이터베이스
- **DB 종류**: SQLite (로컬 파일 기반)
- **DB 파일**: `backend/dev.db`
- **자동 생성**: 첫 실행 시 자동으로 생성됨
- **상세 정보**: [DATABASE_SETUP.md](DATABASE_SETUP.md) 참조

---

## 문제 해결

### Backend 실행 오류
1. 가상환경이 활성화되었는지 확인: `source venv/bin/activate`
2. 의존성이 설치되었는지 확인: `pip list`
3. 데이터베이스 마이그레이션 확인: `alembic upgrade head`

### Frontend 실행 오류
1. node_modules가 설치되었는지 확인: `ls node_modules/`
2. 필요시 재설치: `npm install`

### 연결 오류
- Backend가 먼저 실행되어 있는지 확인
- 포트 충돌 확인 (8008, 3008)
- 방화벽 설정 확인

---

## 개발 모드 특징

- **Backend**: Hot reload 활성화 (코드 수정 시 자동 재시작)
- **Frontend**: Fast refresh 활성화 (React 컴포넌트 수정 시 즉시 반영)
- **실시간 협업**: WebSocket을 통한 실시간 동기화 지원

---

## 추가 명령어

### Backend
```bash
# 테스트 실행
pytest

# 새로운 마이그레이션 생성
alembic revision --autogenerate -m "마이그레이션 메시지"

# 마이그레이션 적용
alembic upgrade head
```

### Frontend
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트 검사
npm run lint
```
