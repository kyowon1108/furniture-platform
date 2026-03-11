# 방구석 전문가

웹 브라우저에서 방 구조를 만들고, 3D 가구를 배치하고, 여러 명이 동시에 편집할 수 있는 인테리어 편집기입니다.

<p align="center">
  <img src="docs/assets/pdf-pages/page-01.png" alt="방구석 전문가 대표 화면" width="960" />
</p>

## 제공 기능

- 방 구조 설계와 가구 배치를 하나의 웹 편집 흐름으로 묶는 것을 목표로 했습니다.
- 설치형 툴 없이 브라우저에서 바로 시작할 수 있게 구성했습니다.
- 한국형 원룸 템플릿, 직접 설정 가능한 Room Builder, 협업 편집 흐름을 함께 제공합니다.

## 기술 스택

- Frontend: Next.js 15, React 18, TypeScript, React Three Fiber, Zustand
- Backend: FastAPI, Socket.IO, SQLAlchemy, Alembic
- Storage: SQLite 빠른 시작 가능, PostgreSQL 로컬/운영 지원, AWS S3 카탈로그 연동
- Security: JWT 인증, Socket.IO `auth.token`, 보호된 다운로드 엔드포인트, 관리자 allowlist

## 대표 화면

<p align="center">
  <img src="docs/assets/pdf-pages/page-06.png" alt="방 템플릿 선택" width="47%" />
  <img src="docs/assets/pdf-pages/page-08.png" alt="Room Builder 화면" width="47%" />
</p>

<p align="center">
  <img src="docs/assets/pdf-pages/page-09.png" alt="실시간 협업 화면" width="47%" />
  <img src="docs/assets/pdf-pages/page-10.png" alt="충돌 방지 화면" width="47%" />
</p>

<p align="center">
  <img src="docs/assets/pdf-pages/page-11.png" alt="조명 시뮬레이션 화면" width="47%" />
  <img src="docs/assets/pdf-pages/page-12.png" alt="비용 계산 화면" width="47%" />
</p>

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

## 문서

- 프로젝트 개요: [docs/01_프로젝트_개요.md](docs/01_프로젝트_개요.md)
- 백엔드 구조: [docs/02_백엔드_구조.md](docs/02_백엔드_구조.md)
- 프론트엔드 구조: [docs/03_프론트엔드_구조.md](docs/03_프론트엔드_구조.md)
- 데이터 흐름: [docs/04_데이터_흐름.md](docs/04_데이터_흐름.md)
- API 사양: [docs/05_API_문서.md](docs/05_API_문서.md)
- 개발 가이드: [docs/06_개발_가이드.md](docs/06_개발_가이드.md)
- 기술 의사결정: [docs/09_기술_의사결정.md](docs/09_기술_의사결정.md)
