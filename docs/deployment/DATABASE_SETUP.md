# 데이터베이스 세팅 가이드

## 현재 데이터베이스 구성

### 사용 중인 DB
- **Database**: SQLite
- **파일 위치**: `backend/dev.db`
- **ORM**: SQLAlchemy
- **마이그레이션 도구**: Alembic

### DB 연결 설정
**위치**: `backend/.env`
```env
DATABASE_URL=sqlite:///./dev.db
```

**코드 위치**: `backend/app/database.py`

---

## 데이터베이스 스키마

### 1. Users 테이블
사용자 인증 및 소유권 관리

**컬럼**:
- `id` (Integer, PK): 사용자 ID
- `email` (String, Unique): 이메일 (로그인용)
- `password_hash` (String): 암호화된 비밀번호
- `full_name` (String, Nullable): 사용자 이름
- `is_active` (Boolean): 활성화 상태
- `created_at` (DateTime): 생성 시간
- `updated_at` (DateTime): 수정 시간

**관계**:
- → Projects (1:N)
- → History (1:N)

---

### 2. Projects 테이블
프로젝트 및 방 정보 저장

**컬럼**:
- `id` (Integer, PK): 프로젝트 ID
- `owner_id` (Integer, FK → users.id): 소유자 ID
- `name` (String): 프로젝트 이름
- `description` (String, Nullable): 프로젝트 설명
- `room_width` (Float): 방 너비
- `room_height` (Float): 방 높이
- `room_depth` (Float): 방 깊이
- `has_3d_file` (Boolean): 3D 파일 존재 여부
- `file_type` (String, Nullable): 파일 타입 ('ply' 또는 'glb')
- `file_path` (String, Nullable): 파일 경로
- `file_size` (Integer, Nullable): 파일 크기 (bytes)
- `has_ply_file` (Boolean): PLY 파일 존재 여부 (legacy)
- `ply_file_path` (String, Nullable): PLY 파일 경로 (legacy)
- `ply_file_size` (Integer, Nullable): PLY 파일 크기 (legacy)
- `created_at` (DateTime): 생성 시간
- `updated_at` (DateTime): 수정 시간

**관계**:
- → User (N:1)
- → Layouts (1:N)

---

### 3. Layouts 테이블
가구 배치 버전 관리

**컬럼**:
- `id` (Integer, PK): 레이아웃 ID
- `project_id` (Integer, FK → projects.id): 프로젝트 ID
- `version` (Integer): 버전 번호
- `furniture_state` (JSON/Text): 가구 배치 상태 (JSON)
- `is_current` (Boolean): 현재 활성 버전 여부
- `created_at` (DateTime): 생성 시간

**관계**:
- → Project (N:1)
- → History (1:N)

---

### 4. History 테이블
변경 이력 추적

**컬럼**:
- `id` (Integer, PK): 이력 ID
- `layout_id` (Integer, FK → layouts.id): 레이아웃 ID
- `user_id` (Integer, FK → users.id): 사용자 ID
- `change_type` (String): 변경 타입
- `before_state` (JSON/Text): 변경 전 상태
- `after_state` (JSON/Text): 변경 후 상태
- `timestamp` (DateTime): 변경 시간

**관계**:
- → Layout (N:1)
- → User (N:1)

---

## 데이터베이스 초기화 방법

### 이미 완료된 초기화
프로젝트 세팅 시 이미 다음 작업이 완료되었습니다:
```bash
# 1. 데이터베이스 마이그레이션 적용 (완료됨)
alembic upgrade head
```

현재 적용된 마이그레이션:
- `014ea31b324f` - Initial migration
- `fcc45089e83b` - Initial migration
- `978ad20bee30` - Initial migration
- `3f8308d86dc1` - Add GLB file support

### 데이터베이스 확인
```bash
cd backend

# DB 파일 확인
ls -lh dev.db

# SQLite CLI로 접속 (선택사항)
sqlite3 dev.db

# 테이블 목록 확인
.tables

# 스키마 확인
.schema users
.schema projects
.schema layouts
.schema history

# 종료
.quit
```

---

## 마이그레이션 관리

### 새로운 마이그레이션 생성
모델 변경 후 마이그레이션 생성:
```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "설명"
```

### 마이그레이션 적용
```bash
alembic upgrade head
```

### 마이그레이션 롤백
```bash
# 한 단계 롤백
alembic downgrade -1

# 특정 버전으로 롤백
alembic downgrade <revision_id>

# 처음으로 롤백
alembic downgrade base
```

### 마이그레이션 이력 확인
```bash
alembic history
alembic current
```

---

## 데이터베이스 리셋 방법

### 전체 초기화 (주의!)
모든 데이터가 삭제됩니다:
```bash
cd backend

# 1. DB 파일 삭제
rm dev.db

# 2. 마이그레이션 재적용
source venv/bin/activate
alembic upgrade head
```

### 특정 테이블만 초기화
SQLite CLI 사용:
```bash
sqlite3 dev.db
DELETE FROM users;
DELETE FROM projects;
DELETE FROM layouts;
DELETE FROM history;
.quit
```

---

## 다른 데이터베이스로 마이그레이션

현재 코드는 SQLAlchemy ORM을 사용하므로 다른 DB로 쉽게 마이그레이션 가능합니다.

### PostgreSQL로 변경

1. **PostgreSQL 설치 및 DB 생성**
```bash
# PostgreSQL 설치 (macOS)
brew install postgresql
brew services start postgresql

# DB 생성
createdb furniture_platform
```

2. **Python 드라이버 설치**
```bash
pip install psycopg2-binary
```

3. **.env 파일 수정**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/furniture_platform
```

4. **database.py 수정** (필요시)
```python
# backend/app/database.py
# connect_args는 PostgreSQL에서 불필요하므로 조건 분기 확인
```

5. **마이그레이션 실행**
```bash
alembic upgrade head
```

### MySQL로 변경

1. **MySQL 설치 및 DB 생성**
```bash
# MySQL 설치 (macOS)
brew install mysql
brew services start mysql

# DB 생성
mysql -u root -p
CREATE DATABASE furniture_platform;
```

2. **Python 드라이버 설치**
```bash
pip install pymysql
```

3. **.env 파일 수정**
```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/furniture_platform
```

4. **마이그레이션 실행**
```bash
alembic upgrade head
```

---

## 백업 및 복원

### SQLite 백업
```bash
# 단순 파일 복사
cp dev.db dev.db.backup

# 날짜 포함 백업
cp dev.db "dev.db.backup.$(date +%Y%m%d_%H%M%S)"
```

### SQLite 복원
```bash
cp dev.db.backup dev.db
```

### 데이터 Export (CSV)
```bash
sqlite3 dev.db
.headers on
.mode csv
.output users.csv
SELECT * FROM users;
.output projects.csv
SELECT * FROM projects;
.quit
```

---

## 트러블슈팅

### Database is locked 에러
```bash
# 모든 연결 종료 후 재시작
pkill -f uvicorn
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8008
```

### Migration 충돌
```bash
# 마이그레이션 이력 확인
alembic history

# 특정 버전으로 이동 후 재시도
alembic downgrade <revision_id>
alembic upgrade head
```

### DB 파일 권한 문제
```bash
chmod 664 dev.db
```

---

## 개발 환경별 DB 설정

### 개발 환경 (Development)
```env
DATABASE_URL=sqlite:///./dev.db
```

### 테스트 환경 (Testing)
```env
DATABASE_URL=sqlite:///./test.db
```

### 프로덕션 환경 (Production)
PostgreSQL 권장:
```env
DATABASE_URL=postgresql://user:pass@host:5432/furniture_platform
```

---

## 참고 파일 위치

- **DB 설정**: `backend/app/database.py`
- **모델 정의**: `backend/app/models/`
  - `user.py` - User 모델
  - `project.py` - Project 모델
  - `layout.py` - Layout 모델
  - `history.py` - History 모델
- **마이그레이션**: `backend/alembic/versions/`
- **마이그레이션 설정**: `backend/alembic.ini`
- **환경 변수**: `backend/.env`
