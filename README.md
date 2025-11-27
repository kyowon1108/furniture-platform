# 방구석 전문가 (Room Expert)

## 🏠 프로젝트 개요
**방구석 전문가**는 사용자가 직접 3D 공간에서 가구를 배치하고 인테리어를 디자인할 수 있는 웹 플랫폼입니다. 실시간 협업, 정밀한 치수 측정, 그리고 직관적인 UI를 통해 누구나 쉽게 자신만의 공간을 꾸밀 수 있습니다.

## 🚀 주요 기능

### 1. 3D 에디터 (Editor)
- **실시간 가구 배치**: 드래그 앤 드롭으로 가구를 자유롭게 배치하고 이동할 수 있습니다.
- **스마트 벽 숨김 (Smart Wall Hiding)**: 
  - **Dual-Pass Rendering** 기술을 적용하여, 방 외부에서 볼 때 벽이 시야를 가리지 않도록 자동으로 반투명(30%) 처리됩니다.
  - 내부는 불투명하게 유지되어 몰입감을 해치지 않습니다.
- **정밀 조작**: `TransformControls`를 통해 가구를 정밀하게 회전하고 이동할 수 있습니다.
- **완료 버튼**: 툴바의 체크(✅) 버튼으로 가구 배치를 손쉽게 완료(선택 해제)할 수 있습니다.
- **조명 시뮬레이션**: 아침, 오후, 저녁, 밤 시간대별 조명 변화를 시뮬레이션할 수 있습니다.
- **거리 측정**: 가구 간의 거리나 벽과의 거리를 정밀하게 측정할 수 있습니다.

### 2. UI/UX 디자인
- **반응형 사이드바**: 가구 카탈로그 사이드바를 접고 펼 수 있어 작업 공간을 넓게 활용할 수 있습니다.
- **다크 퍼플 테마**: 눈이 편안하고 세련된 'Natural Dark Purple' 테마와 Glassmorphism 디자인을 적용했습니다.
- **직관적인 툴바**: 실행 취소(Undo), 다시 실행(Redo), 저장, 삭제 등의 기능을 툴바에서 바로 접근할 수 있습니다.

### 3. Room Builder
- **다양한 템플릿**: 원룸, 스튜디오, 복도형 등 다양한 방 구조 템플릿을 제공합니다.
- **커스텀 크기**: 사용자가 원하는 크기(2m~10m)로 방을 생성할 수 있습니다.
- **텍스처 커스터마이징**: 벽과 바닥의 재질을 개별적으로 변경할 수 있습니다.

### 4. 실시간 협업
- **WebSocket 연동**: 여러 사용자가 동시에 접속하여 가구를 배치하고 수정할 수 있습니다.
- **공유 링크 (Share Link)**: 프로젝트 소유자는 공유 링크를 생성하여 다른 사용자를 초대할 수 있습니다. (소유자 전용 기능)
- **객체 잠금 (Object Locking)**: 한 사용자가 가구를 선택하면 해당 가구는 잠금 상태가 되어, 다른 사용자가 동시에 수정할 수 없습니다.
- **사용자 목록 (User Presence)**: 현재 접속 중인 사용자의 목록과 상태(CONNECTED)를 실시간으로 확인할 수 있습니다.
- **닉네임 지원**: 접속한 사용자의 닉네임(ID)과 고유 색상이 표시되어 누가 작업 중인지 식별할 수 있습니다.

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **3D Graphics** | Three.js, @react-three/fiber, @react-three/drei |
| **State Mgmt** | Zustand |
| **Backend** | FastAPI, Python, SQLite |
| **Real-time** | Socket.IO |
| **Deployment** | AWS EC2 (Docker) |

---

## 💻 로컬 실행 방법

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
npm run dev
```
브라우저에서 `http://localhost:3008`로 접속하세요.

---

## 📂 프로젝트 구조

```
furniture-platform/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 엔드포인트
│   │   ├── core/           # 핵심 로직 (보안, 설정)
│   │   ├── models/         # DB 모델
│   │   └── ...
│   └── ...
│
├── frontend/               # Next.js 프론트엔드
│   ├── app/                # App Router 페이지
│   ├── components/
│   │   ├── 3d/             # 3D 관련 컴포넌트 (Scene, GlbModel 등)
│   │   ├── ui/             # UI 컴포넌트 (Sidebar, Toolbar 등)
│   │   └── ...
│   ├── store/              # 상태 관리 (editorStore 등)
│   └── ...
└── ...
```

## 🔗 배포 정보
- **Frontend**: `http://13.125.249.5:3008`
- **Backend API**: `http://13.125.249.5:8008`

---
Last Updated: 2025-11-27
