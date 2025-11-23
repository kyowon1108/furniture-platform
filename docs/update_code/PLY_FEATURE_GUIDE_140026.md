# PLY 파일 업로드 기능 가이드

## 개요

이 기능은 사용자가 3D 스캔된 방의 PLY 파일을 업로드하고, 해당 3D 모델을 배경으로 사용하여 가구를 배치할 수 있도록 합니다.

## 주요 기능

### 1. 프로젝트 생성 방식 선택
- **수동 입력**: 방 크기를 직접 입력하여 기본 3D 방 생성
- **PLY 파일 업로드**: 3D 스캔 파일을 업로드하여 실제 방 모델 사용

### 2. PLY 파일 지원
- 파일 형식: `.ply` (Point Cloud Data)
- 파일 크기 제한: 없음 (개발/시연용)
- 검증: 자동으로 vertex 데이터 확인

### 3. 방 크기 입력
- PLY 파일을 사용하는 경우에도 방 크기 입력 필요
- 입력된 크기는 가구 배치 시 참고 치수로 사용

## 백엔드 구현

### 데이터베이스 스키마 변경

**Project 모델에 추가된 필드:**
```python
has_ply_file = Column(Boolean, default=False, nullable=False)
ply_file_path = Column(String, nullable=True)
ply_file_size = Column(Integer, nullable=True)  # bytes
```

### API 엔드포인트

#### 1. PLY 파일 업로드
```
POST /api/v1/files/upload-ply/{project_id}
Content-Type: multipart/form-data

Parameters:
- file: PLY 파일 (required)

Response:
{
  "message": "PLY file uploaded successfully",
  "filename": "project_1_room.ply",
  "file_size": 1234567,
  "vertex_count": 50000,
  "project_id": 1
}
```

#### 2. PLY 파일 정보 조회
```
GET /api/v1/files/ply/{project_id}

Response:
{
  "has_ply_file": true,
  "file_path": "uploads/ply_files/project_1_room.ply",
  "file_size": 1234567,
  "project_id": 1
}
```

#### 3. PLY 파일 삭제
```
DELETE /api/v1/files/ply/{project_id}

Response:
{
  "message": "PLY file deleted successfully",
  "project_id": 1
}
```

### 파일 검증

업로드된 PLY 파일은 다음 항목을 검증합니다:
1. 파일 확장자가 `.ply`인지 확인
2. PLY 파일 형식이 유효한지 확인 (plyfile 라이브러리 사용)
3. vertex 데이터가 존재하는지 확인

**참고**: 개발/시연 목적으로 파일 크기 제한이 없습니다. 프로덕션 환경에서는 인프라에 맞게 크기 제한을 추가하는 것을 권장합니다.

## 프론트엔드 구현

### CreateProjectModal 컴포넌트

**생성 방식 선택 UI:**
- 두 가지 모드 토글: "수동 입력" / "PLY 파일 업로드"
- PLY 모드 선택 시 파일 업로드 필드 표시

**폼 필드:**
- 프로젝트 이름 (필수)
- PLY 파일 (PLY 모드에서 필수)
- 방 크기: 폭, 높이, 깊이 (항상 필수)
- 설명 (선택)

**업로드 프로세스:**
1. 프로젝트 생성
2. PLY 파일 업로드 (PLY 모드인 경우)
3. 에디터 페이지로 이동

### Scene 컴포넌트

**PLY 모델 렌더링:**
- `has_ply_file`이 true인 경우 PLY 모델 표시
- 그렇지 않으면 기본 Room 컴포넌트 표시

```tsx
{hasPlyFile && projectId && plyFilePath ? (
  <PlyModel projectId={projectId} plyFilePath={plyFilePath} />
) : (
  <Room />
)}
```

### API 클라이언트

**filesAPI 추가:**
```typescript
export const filesAPI = {
  uploadPly: async (projectId: number, file: File) => { ... },
  getPlyInfo: async (projectId: number) => { ... },
  deletePly: async (projectId: number) => { ... },
};
```

## 사용자 플로우

### 1. PLY 파일로 프로젝트 생성

1. 대시보드에서 "새 프로젝트" 클릭
2. "PLY 파일 업로드" 모드 선택
3. 프로젝트 이름 입력
4. PLY 파일 선택 (파일 크기 확인)
5. 방 크기 입력 (폭, 높이, 깊이)
6. "생성" 버튼 클릭
7. 업로드 진행 상황 표시:
   - "프로젝트 생성 중..."
   - "PLY 파일 업로드 중..."
   - "완료!"
8. 에디터 페이지로 자동 이동

### 2. 수동 입력으로 프로젝트 생성

1. 대시보드에서 "새 프로젝트" 클릭
2. "수동 입력" 모드 선택 (기본값)
3. 프로젝트 이름 입력
4. 방 크기 입력
5. "생성" 버튼 클릭
6. 에디터 페이지로 자동 이동

### 3. 에디터에서 가구 배치

- PLY 파일이 있는 경우: 3D 스캔 모델이 배경으로 표시
- PLY 파일이 없는 경우: 기본 방 모델 표시
- 입력된 방 크기를 기준으로 가구 배치
- 충돌 감지 및 검증은 동일하게 작동

## 테스트 시나리오

### 백엔드 테스트 (test_files.py)

1. **test_upload_ply_file**: 정상적인 PLY 파일 업로드
2. **test_upload_invalid_file_type**: 잘못된 파일 형식 업로드 시도
3. **test_upload_invalid_ply_content**: 유효하지 않은 PLY 내용
4. **test_get_ply_file_info**: PLY 파일 정보 조회
5. **test_get_ply_file_not_found**: 존재하지 않는 PLY 파일 조회
6. **test_delete_ply_file**: PLY 파일 삭제
7. **test_upload_unauthorized_project**: 권한 없는 프로젝트 접근
8. **test_large_file_upload**: 크기 제한 초과 파일 업로드
9. **test_project_creation_with_ply_flag**: PLY 플래그로 프로젝트 생성

### 프론트엔드 테스트 (수동)

1. **모드 전환 테스트**
   - 수동 입력 ↔ PLY 업로드 모드 전환
   - UI 변경 확인

2. **파일 선택 테스트**
   - PLY 파일 선택
   - 파일 크기 표시 확인
   - 잘못된 파일 형식 선택 시 에러 메시지

3. **업로드 프로세스 테스트**
   - 프로젝트 생성 및 PLY 업로드
   - 진행 상황 메시지 확인
   - 에디터로 이동 확인

4. **에디터 렌더링 테스트**
   - PLY 파일이 있는 프로젝트 로드
   - PLY 파일이 없는 프로젝트 로드
   - 가구 배치 기능 정상 작동 확인

## 데이터베이스 마이그레이션

마이그레이션 파일: `001_add_ply_support.py`

```bash
# 마이그레이션 적용
alembic upgrade head

# 마이그레이션 롤백
alembic downgrade -1
```

## 파일 저장 구조

```
furniture-platform/backend/
└── uploads/
    └── ply_files/
        ├── project_1_room.ply
        ├── project_2_scan.ply
        └── ...
```

## 에러 처리

### 백엔드 에러

- **400 Bad Request**: 잘못된 파일 형식, 크기 초과, 유효하지 않은 PLY
- **403 Forbidden**: 프로젝트 접근 권한 없음
- **404 Not Found**: 프로젝트 또는 PLY 파일 없음

### 프론트엔드 에러

- 파일 선택 시 즉시 검증 (확장자, 크기)
- 업로드 실패 시 에러 메시지 표시
- 네트워크 에러 처리

## 향후 개선 사항

1. **PLY 파일 다운로드 API**: 사용자가 업로드한 PLY 파일 다운로드
2. **PLY 파일 미리보기**: 업로드 전 3D 미리보기
3. **자동 방 크기 추출**: PLY 파일에서 자동으로 방 크기 계산
4. **PLY 파일 최적화**: 대용량 파일 자동 압축 및 최적화
5. **다중 PLY 파일 지원**: 여러 각도의 스캔 파일 병합
6. **텍스처 지원**: PLY 파일의 색상 및 텍스처 정보 활용

## 기존 기능과의 호환성

### 유지되는 기능

- ✅ 프로젝트 CRUD
- ✅ 레이아웃 저장/로드
- ✅ 가구 배치 및 이동
- ✅ 충돌 감지
- ✅ 실시간 협업 (WebSocket)
- ✅ 자동 저장
- ✅ 측정 도구
- ✅ 조명 설정

### 추가된 기능

- ✅ PLY 파일 업로드
- ✅ 3D 스캔 모델 배경
- ✅ 프로젝트 생성 방식 선택

## 결론

이 기능은 기존의 수동 방 생성 방식을 유지하면서, 3D 스캔 파일을 활용한 더 현실적인 가구 배치를 가능하게 합니다. 모든 기존 기능은 정상적으로 작동하며, 사용자는 자신의 필요에 따라 적절한 방식을 선택할 수 있습니다.
