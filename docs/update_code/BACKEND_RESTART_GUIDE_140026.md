# 🔄 백엔드 재시작 가이드

## 📅 작업 일자
2024년 11월 21일

## 🎯 수정 사항

### files.py 수정
- `get_ply_info` 엔드포인트의 `current_user` 타입 수정
- `dict` → `User` 객체로 변경
- `current_user["id"]` → `current_user.id`로 수정

## 🔄 백엔드 재시작 방법

### 방법 1: 터미널에서 재시작

1. **현재 실행 중인 백엔드 중지**
   - 백엔드가 실행 중인 터미널에서 `Ctrl+C`

2. **백엔드 재시작**
   ```bash
   cd furniture-platform/backend
   conda activate furniture-backend
   uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
   ```

### 방법 2: 새 터미널에서 시작

백엔드가 실행 중이 아니라면:

```bash
cd furniture-platform/backend
conda activate furniture-backend
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
```

## ✅ 확인 방법

백엔드가 정상적으로 시작되면 다음과 같은 메시지가 표시됩니다:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using StatReload
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 🧪 API 테스트

백엔드가 재시작된 후:

1. **브라우저에서 프론트엔드 새로고침** (Ctrl+R 또는 Cmd+R)
2. **에디터 페이지 열기**
3. **Debug Info 패널에서 "🔍 Check PLY Color Info" 버튼 클릭**
4. **결과 확인**:
   - Alert 메시지에 PLY 정보 표시
   - 콘솔에 상세 정보 출력

## 🔍 예상 결과

### 성공 시
```
Alert:
PLY Info:
Has Colors: true/false
Color Properties: red, green, blue
All Properties: x, y, z, nx, ny, nz, red, green, blue
Check console for details!

Console:
========================================
🎨 PLY FILE INFO FROM BACKEND
========================================
Has Colors: true
Color Properties: ["red", "green", "blue"]
All Properties: ["x", "y", "z", "nx", "ny", "nz", "red", "green", "blue"]
Color Samples: [...]
========================================
```

### 색상 없는 경우
```
Alert:
PLY Info:
Has Colors: false
Color Properties: 
All Properties: x, y, z, nx, ny, nz
Check console for details!
```

## 🚨 문제 해결

### CORS 에러가 계속 발생하는 경우

1. **백엔드 설정 확인**
   ```bash
   cd furniture-platform/backend
   cat app/config.py | grep ORIGINS
   ```

2. **환경 변수 확인**
   ```bash
   cat .env | grep ORIGINS
   ```

3. **기본값 확인**
   - `ORIGINS` 환경 변수에 `http://localhost:3000` 포함되어야 함

### 500 에러가 발생하는 경우

1. **백엔드 로그 확인**
   - 백엔드 터미널에서 에러 메시지 확인

2. **PLY 파일 존재 확인**
   ```bash
   cd furniture-platform/backend
   ls -la uploads/ply_files/
   ```

3. **데이터베이스 확인**
   ```bash
   conda activate furniture-backend
   python -c "from app.database import SessionLocal; from app.models.project import Project; db = SessionLocal(); projects = db.query(Project).filter(Project.has_ply_file == True).all(); print(f'Projects with PLY: {len(projects)}'); [print(f'  - {p.id}: {p.ply_file_path}') for p in projects]"
   ```

## 📝 수정된 코드

### Before
```python
async def get_ply_info(
    project_id: int,
    current_user: dict = Depends(get_current_user),  # ❌ dict
    db: Session = Depends(get_db),
):
    # ...
    if project.owner_id != current_user["id"]:  # ❌ dict access
```

### After
```python
async def get_ply_info(
    project_id: int,
    current_user: User = Depends(get_current_user),  # ✅ User object
    db: Session = Depends(get_db),
):
    # ...
    if project.owner_id != current_user.id:  # ✅ attribute access
```

---

**작업자**: Kiro AI Assistant
**작업 완료일**: 2024년 11월 21일
**상태**: 백엔드 재시작 필요
