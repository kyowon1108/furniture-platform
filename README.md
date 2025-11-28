# 🏠 방구석 전문가 (Room Expert)

> **"상상을 현실로, 당신만의 공간을 디자인하세요."**

**방구석 전문가**는 누구나 쉽고 재미있게 자신만의 인테리어를 3D로 구현할 수 있는 웹 플랫폼입니다.  
복잡한 CAD 툴 없이도, 웹 브라우저에서 클릭 몇 번으로 가구를 배치하고, 벽지를 바꾸고, 조명을 조절하며 꿈꾸던 방을 미리 만들어보세요.

---

## ✨ 프로젝트 소개

이 프로젝트는 **"누구나 쉽게 사용할 수 있는 3D 인테리어 툴"**을 목표로 시작되었습니다.  
기존의 인테리어 프로그램들은 너무 무겁거나 배우기 어려웠습니다. 우리는 **웹 기술(Three.js, R3F)**을 활용하여 설치 없이 바로 실행 가능하고, **직관적인 UI**로 누구나 바로 시작할 수 있는 서비스를 만들었습니다.

특히, **실시간 협업 기능**을 통해 친구나 가족과 함께 방을 꾸미거나, 전문가의 조언을 실시간으로 받을 수 있는 경험을 제공합니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 🎨 나만의 방 만들기 (Room Builder)
- **다양한 템플릿**: 원룸, 투룸, 복도형 등 한국적인 주거 환경을 반영한 템플릿을 제공합니다.
- **자유로운 커스터마이징**: 방의 크기(가로, 세로)를 0.5m 단위로 정밀하게 조절할 수 있습니다.
- **마감재 변경**: 벽지와 바닥재를 클릭 한 번으로 변경하여 다양한 분위기를 연출해보세요.
- **정확한 치수**: 3D 파일 분석 기술(`trimesh`)을 도입하여, 설계한 방의 크기가 정확하게 저장되고 구현됩니다.

### 2. 🛋️ 3D 가구 배치 (Furniture Placement)
- **드래그 앤 드롭**: 카탈로그에서 가구를 끌어다 놓기만 하면 배치가 끝납니다.
- **스마트 충돌 방지**: 가구가 벽을 뚫거나 겹치지 않도록 정교한 충돌 감지 로직이 적용되어 있습니다.
- **정밀 조작**: 회전, 이동 기능을 통해 가구를 원하는 위치에 정확하게 놓을 수 있습니다.
- **다양한 가구**: 침대, 책상, 의자, 조명 등 수십 종의 고퀄리티 3D 가구 모델을 제공합니다. (AWS S3 연동)

### 3. 🤝 실시간 협업 (Real-time Collaboration)
- **함께 꾸미기**: 친구를 초대하여 같은 방을 동시에 꾸밀 수 있습니다.
- **실시간 동기화**: 내가 가구를 옮기면 친구의 화면에서도 즉시 움직입니다. (WebSocket & Socket.IO)
- **충돌 방지 (Locking)**: 내가 편집 중인 가구는 다른 사람이 건들지 못하도록 잠금 처리되어 혼선을 막습니다.
- **사용자 커서**: 친구가 어디를 보고 있는지 실시간 커서와 닉네임으로 확인할 수 있습니다.

### 4. 💡 생생한 시각 효과
- **시간대별 조명**: 아침, 점심, 저녁, 밤의 조명 변화를 시뮬레이션하여 방의 분위기를 미리 확인하세요.
- **스마트 월 하이딩**: 방 안을 볼 때 앞쪽 벽이 시야를 가리지 않도록 자동으로 투명해집니다.

---

## 🛠️ 기술 스택 (Tech Stack)

이 프로젝트는 최신 웹 기술을 적극적으로 도입하여 개발되었습니다.

| 영역 | 기술 스택 | 설명 |
|------|-----------|------|
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss) | 빠르고 반응성 높은 UI 구현 |
| **3D Graphics** | ![Three.js](https://img.shields.io/badge/Three.js-black?style=flat-square&logo=three.js) ![R3F](https://img.shields.io/badge/R3F-black?style=flat-square) | 웹 기반 고성능 3D 렌더링 |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi) ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python) | 고성능 비동기 API 서버 |
| **Database** | ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite) ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=flat-square) | 데이터 영속성 관리 |
| **Storage** | ![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?style=flat-square&logo=amazon-s3) | 3D 모델 및 텍스처 파일 관리 |
| **Real-time** | ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io) | 실시간 양방향 통신 |

---

## 💻 시작하기 (Getting Started)

로컬 환경에서 프로젝트를 실행하는 방법입니다.

### 1. Backend 실행
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 서버 실행 (포트 8008)
python -m uvicorn app.main:socket_app --reload --port 8008 --host 0.0.0.0
```

### 2. Frontend 실행
```bash
cd frontend
npm install

# 개발 서버 실행 (포트 3008)
npm run dev
```

---

## 📂 프로젝트 구조

```
furniture-platform/
├── backend/                 # FastAPI 서버
│   ├── app/
│   │   ├── api/            # REST API & WebSocket 엔드포인트
│   │   ├── core/           # 설정 및 보안 로직
│   │   ├── models/         # DB 스키마 (SQLAlchemy)
│   │   └── utils/          # 유틸리티 (GLB 분석 등)
│   └── ...
│
└── frontend/               # Next.js 클라이언트
    ├── app/                # 페이지 라우팅
    ├── components/
    │   ├── 3d/             # 3D 씬 및 모델 컴포넌트
    │   ├── room-builder/   # 방 생성 관련 UI
    │   └── ui/             # 공통 UI 컴포넌트
    ├── store/              # 전역 상태 관리 (Zustand)
    └── lib/                # API 클라이언트 및 유틸리티
```

---

## 📬 문의 및 기여

버그 제보나 기능 제안은 언제나 환영합니다!  
GitHub Issues를 통해 의견을 남겨주세요.
