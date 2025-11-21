# 빠른 시작 가이드

5분 안에 3D 가구 배치 플랫폼을 실행하세요!

## 사전 요구사항 확인

```bash
# Python 버전 확인 (3.9.18이어야 함)
python --version

# Node.js 버전 확인 (18+ 이어야 함)
node --version

# conda 환경 확인
conda env list | grep furniture-backend
```

## 1단계: 백엔드 설정 (2분)

```bash
# 백엔드로 이동
cd furniture-platform/backend

# Conda 환경 활성화
conda activate furniture-backend

# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 설정
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 서버 시작
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

**확인:** http://localhost:8000/docs 열기 - Swagger UI가 보여야 합니다

## 2단계: 프론트엔드 설정 (2분)

새 터미널 열기:

```bash
# 프론트엔드로 이동
cd furniture-platform/frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

**확인:** http://localhost:3000 열기 - 랜딩 페이지가 보여야 합니다

## 3단계: 플랫폼 테스트 (1분)

1. **계정 등록:**
   - "회원가입" 클릭
   - 이메일 입력: `test@example.com`
   - 비밀번호 입력: `password123`
   - "회원가입" 클릭

2. **프로젝트 생성:**
   - 프로젝트 페이지로 자동 이동
   - "+ 새 프로젝트" 클릭
   - 이름: "내 첫 방"
   - 방 크기: 10m × 3m × 8m
   - "생성" 클릭

3. **에디터 열기:**
   - 프로젝트 클릭
   - 3D 에디터와 그리드가 보여야 합니다

4. **컨트롤 테스트:**
   - 마우스 왼쪽 드래그: 카메라 회전
   - 스크롤 휠: 줌
   - `T` 키: 이동 모드
   - `R` 키: 회전 모드
   - `S` 키: 크기 모드

## 4단계: 실시간 협업 테스트

1. **두 번째 브라우저 창 열기** (또는 시크릿 모드)
2. **두 번째 계정 등록:** `test2@example.com`
3. **같은 이름의 프로젝트 생성**
4. **양쪽 프로젝트를 에디터에서 열기**
5. **실시간 업데이트 확인** (좌측 상단 연결 상태 확인)

## 문제 해결

### 백엔드가 시작되지 않음
```bash
# 포트 8000의 프로세스 종료
lsof -ti:8000 | xargs kill -9

# 다시 시도
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드가 시작되지 않음
```bash
# 클린 설치
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 데이터베이스 문제
```bash
# 데이터베이스 재설정
rm dev.db
alembic upgrade head
```

## 테스트 실행

```bash
cd furniture-platform/backend
pytest tests/ -v
```

예상 결과: 모든 테스트 통과 ✅

## 다음 단계

- 전체 [README.md](README.md)에서 상세 문서 확인
- [CHECKLIST.md](CHECKLIST.md)에서 구현 상태 확인
- http://localhost:8000/docs에서 API 탐색
- 가구 레이아웃 만들기 시작!

## 일반적인 문제

**"Module not found" 에러:**
- 올바른 conda 환경에 있는지 확인
- `pip install -r requirements.txt` 다시 실행

**"Cannot connect to WebSocket":**
- 백엔드가 포트 8000에서 실행 중인지 확인
- 브라우저 콘솔에서 에러 확인

**"401 Unauthorized":**
- JWT 토큰이 만료되었을 수 있음
- 로그아웃 후 다시 로그인

## 지원

문제나 질문이 있으면:
1. README.md의 문제 해결 섹션 확인
2. 터미널의 에러 로그 검토
3. 프론트엔드 에러는 브라우저 콘솔 확인

즐거운 개발 되세요! 🏠✨
