# 프로젝트 삭제 시 파일 자동 정리 구현

## 🎯 문제 상황

### 기존 동작
- 프로젝트 삭제 시 데이터베이스 레코드만 삭제
- `uploads/` 폴더의 PLY/GLB 파일은 그대로 남음
- 디스크 공간 낭비
- 고아 파일(orphaned files) 누적

### 예시
```
1. 사용자가 프로젝트 생성 + PLY 파일 업로드
   → uploads/project_1_scan.ply (100MB)

2. 사용자가 프로젝트 삭제
   → 데이터베이스에서만 삭제됨
   → uploads/project_1_scan.ply 여전히 존재 ❌

3. 시간이 지나면서 고아 파일 누적
   → uploads/ 폴더 크기 계속 증가
   → 디스크 공간 낭비
```

## ✅ 해결 방법

### 프로젝트 삭제 시 파일도 함께 삭제

```python
@router.delete("/{project_id}")
def delete_project(...):
    # 1. 프로젝트 조회 및 권한 확인
    project = db.query(Project).filter(Project.id == project_id).first()
    
    # 2. PLY 파일 삭제
    if project.ply_file_path:
        ply_path = Path(project.ply_file_path)
        if ply_path.exists():
            os.remove(ply_path)
    
    # 3. GLB 파일 삭제
    if project.glb_file_path:
        glb_path = Path(project.glb_file_path)
        if glb_path.exists():
            os.remove(glb_path)
    
    # 4. 데이터베이스에서 프로젝트 삭제
    db.delete(project)
    db.commit()
```

## 🔧 구현 세부사항

### 1. 파일 존재 확인
```python
if project.ply_file_path:  # DB에 경로가 있는지 확인
    ply_path = Path(project.ply_file_path)
    if ply_path.exists():  # 실제 파일이 있는지 확인
        os.remove(ply_path)
```

**이유**:
- DB에 경로가 있어도 파일이 없을 수 있음
- 파일이 이미 삭제되었거나 이동되었을 수 있음
- 에러 방지

### 2. 예외 처리
```python
try:
    os.remove(ply_path)
    print(f"✅ Deleted PLY file: {ply_path}")
except Exception as e:
    print(f"⚠️ Failed to delete PLY file {ply_path}: {e}")
```

**이유**:
- 파일 삭제 실패해도 프로젝트 삭제는 진행
- 권한 문제, 파일 잠금 등의 상황 대응
- 로그로 문제 추적 가능

### 3. 삭제 순서
```
1. 프로젝트 조회 및 권한 확인
2. PLY 파일 삭제 (있으면)
3. GLB 파일 삭제 (있으면)
4. 데이터베이스에서 프로젝트 삭제
```

**이유**:
- 파일 먼저 삭제 후 DB 삭제
- DB 삭제 실패 시 파일은 이미 삭제됨 (일관성)
- 롤백 불가능하지만 고아 파일 방지가 우선

## 📊 삭제 시나리오

### 시나리오 1: PLY 파일만 있는 프로젝트
```
프로젝트 삭제 요청
  ↓
PLY 파일 확인 → 존재함
  ↓
PLY 파일 삭제 ✅
  ↓
GLB 파일 확인 → 없음
  ↓
DB에서 프로젝트 삭제 ✅
  ↓
완료
```

### 시나리오 2: GLB 파일만 있는 프로젝트
```
프로젝트 삭제 요청
  ↓
PLY 파일 확인 → 없음
  ↓
GLB 파일 확인 → 존재함
  ↓
GLB 파일 삭제 ✅
  ↓
DB에서 프로젝트 삭제 ✅
  ↓
완료
```

### 시나리오 3: 파일 없는 프로젝트
```
프로젝트 삭제 요청
  ↓
PLY 파일 확인 → 없음
  ↓
GLB 파일 확인 → 없음
  ↓
DB에서 프로젝트 삭제 ✅
  ↓
완료
```

### 시나리오 4: 파일 삭제 실패
```
프로젝트 삭제 요청
  ↓
PLY 파일 확인 → 존재함
  ↓
PLY 파일 삭제 시도 → 실패 (권한 문제) ⚠️
  ↓
로그 출력: "Failed to delete PLY file"
  ↓
DB에서 프로젝트 삭제 ✅ (계속 진행)
  ↓
완료 (파일은 남아있음)
```

## 🔍 로그 출력

### 성공 케이스
```
✅ Deleted PLY file: uploads/project_123_scan.ply
✅ Deleted GLB file: uploads/project_123_model.glb
🗑️ Project 123 deleted with 2 file(s)
```

### 파일 없는 케이스
```
🗑️ Project 123 deleted (no files to remove)
```

### 파일 없는 케이스 (개선됨)
```
ℹ️ PLY file not found (already deleted or moved): uploads/project_123_scan.ply
✅ Project 123 deleted from database
🗑️ Project 123 deletion complete: 1 file(s) not found (already deleted)
```

### 실패 케이스
```
⚠️ Failed to delete PLY file uploads/project_123_scan.ply: Permission denied
✅ Project 123 deleted from database
🗑️ Project 123 deletion complete: 0 file(s) deleted
```

## 🧪 테스트 시나리오

### 테스트 1: PLY 파일 프로젝트 삭제
1. PLY 파일로 프로젝트 생성
2. `uploads/` 폴더에 파일 존재 확인
3. 프로젝트 삭제
4. ✅ `uploads/` 폴더에서 파일 삭제됨
5. ✅ DB에서 프로젝트 삭제됨

### 테스트 2: GLB 파일 프로젝트 삭제
1. GLB 파일로 프로젝트 생성
2. `uploads/` 폴더에 파일 존재 확인
3. 프로젝트 삭제
4. ✅ `uploads/` 폴더에서 파일 삭제됨
5. ✅ DB에서 프로젝트 삭제됨

### 테스트 3: 파일 없는 프로젝트 삭제
1. 파일 없이 프로젝트 생성
2. 프로젝트 삭제
3. ✅ 에러 없이 삭제됨

### 테스트 4: 권한 없는 사용자
1. 사용자 A가 프로젝트 생성
2. 사용자 B가 삭제 시도
3. ✅ 403 Forbidden 에러
4. ✅ 파일 및 프로젝트 유지됨

## 💾 디스크 공간 절약

### 예상 효과

#### 시나리오: 100명의 사용자
```
각 사용자가 평균 10개 프로젝트 생성/삭제
각 프로젝트당 평균 50MB 파일

수정 전:
- 삭제된 프로젝트 파일 누적: 100 × 10 × 50MB = 50GB 낭비 ❌

수정 후:
- 삭제된 프로젝트 파일 자동 정리: 0GB 낭비 ✅
- 절약: 50GB
```

## 🔒 안전성

### 1. 권한 확인
```python
if project.owner_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized")
```
- 파일 삭제 전에 권한 확인
- 다른 사용자의 파일 삭제 방지

### 2. 트랜잭션
```python
# 파일 삭제는 트랜잭션 외부
os.remove(ply_path)

# DB 삭제는 트랜잭션 내부
db.delete(project)
db.commit()
```
- 파일 삭제는 롤백 불가능
- DB 삭제 실패 시 파일은 이미 삭제됨
- 하지만 고아 파일 방지가 우선

### 3. 예외 처리
```python
try:
    os.remove(ply_path)
except Exception as e:
    print(f"Failed: {e}")
    # 계속 진행 (DB 삭제는 수행)
```
- 파일 삭제 실패해도 프로젝트 삭제 진행
- 사용자 경험 우선

## 📝 수정된 파일

### 백엔드
- `backend/app/api/v1/projects.py`
  - `delete_project()` 함수 수정
  - PLY/GLB 파일 삭제 로직 추가
  - 로그 출력 추가

### 문서
- `FILE_CLEANUP_ON_DELETE_KR.md` - 이 문서

## 🎯 결과

### 수정 전
- ❌ 프로젝트 삭제 시 파일 남음
- ❌ 디스크 공간 낭비
- ❌ 고아 파일 누적
- ❌ 수동 정리 필요

### 수정 후
- ✅ 프로젝트 삭제 시 파일도 삭제
- ✅ 디스크 공간 절약
- ✅ 고아 파일 방지
- ✅ 자동 정리
- ✅ 로그로 추적 가능

## 🔄 향후 개선 사항

### 1. 소프트 삭제 (Soft Delete)
```python
# 즉시 삭제 대신 deleted_at 플래그
project.deleted_at = datetime.now()
db.commit()

# 30일 후 실제 삭제 (크론 작업)
```

### 2. 휴지통 기능
```python
# 파일을 trash/ 폴더로 이동
shutil.move(ply_path, f"trash/{ply_path.name}")

# 30일 후 영구 삭제
```

### 3. 백업
```python
# 삭제 전 백업
shutil.copy(ply_path, f"backups/{ply_path.name}")
os.remove(ply_path)
```

### 4. 배치 정리
```python
# 크론 작업으로 고아 파일 정리
# 매일 자정에 실행
# DB에 없는 uploads/ 파일 찾아서 삭제
```

## ✅ 완료 체크리스트

- [x] 프로젝트 삭제 함수 수정
- [x] PLY 파일 삭제 로직 추가
- [x] GLB 파일 삭제 로직 추가
- [x] 파일 존재 확인
- [x] 예외 처리
- [x] 로그 출력
- [x] 테스트 시나리오 작성
- [x] 문서 작성

---

**구현 완료일**: 2025-11-21  
**상태**: ✅ 완료 및 테스트 준비됨  
**효과**: 디스크 공간 절약, 고아 파일 방지
