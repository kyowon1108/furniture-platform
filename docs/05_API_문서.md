# API 문서

## 📋 목차
1. [기본 정보](#기본-정보)
2. [인증 API](#인증-api)
3. [프로젝트 API](#프로젝트-api)
4. [레이아웃 API](#레이아웃-api)
5. [파일 API](#파일-api)
6. [WebSocket 이벤트](#websocket-이벤트)
7. [에러 코드](#에러-코드)

---

## 기본 정보

**Base URL**: `http://localhost:8000/api/v1`

**인증 방식**: JWT Bearer Token

**Content-Type**: `application/json`

**Swagger UI**: `http://localhost:8000/docs`

---

## 인증 API

### 1. 회원가입

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "홍길동"  // 선택사항
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "홍길동",
  "is_active": true,
  "created_at": "2025-11-20T10:00:00Z"
}
```

**에러**:
- `400`: 이메일 중복

---

### 2. 로그인

**Endpoint**: `POST /auth/login`

**Request Body** (Form Data):
```
username=user@example.com
password=securepassword123
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**에러**:
- `401`: 잘못된 이메일 또는 비밀번호

---

### 3. 현재 사용자 조회

**Endpoint**: `GET /auth/me`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "홍길동",
  "is_active": true,
  "created_at": "2025-11-20T10:00:00Z"
}
```

**에러**:
- `401`: 유효하지 않은 토큰

---

## 프로젝트 API

### 1. 프로젝트 목록 조회

**Endpoint**: `GET /projects`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `skip` (int, optional): 건너뛸 개수 (기본값: 0)
- `limit` (int, optional): 최대 개수 (기본값: 100)

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "owner_id": 1,
    "name": "내 방 레이아웃",
    "description": "침실 가구 배치",
    "room_width": 5.0,
    "room_height": 3.0,
    "room_depth": 4.0,
    "created_at": "2025-11-20T10:00:00Z",
    "updated_at": "2025-11-20T10:00:00Z"
  }
]
```

---

### 2. 프로젝트 생성

**Endpoint**: `POST /projects`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body**:
```json
{
  "name": "내 방 레이아웃",
  "description": "침실 가구 배치",  // 선택사항
  "room_width": 5.0,
  "room_height": 3.0,
  "room_depth": 4.0,
  "has_ply_file": false  // 선택사항, 기본값: false
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "내 방 레이아웃",
  "description": "침실 가구 배치",
  "room_width": 5.0,
  "room_height": 3.0,
  "room_depth": 4.0,
  "has_ply_file": false,
  "ply_file_path": null,
  "ply_file_size": null,
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-20T10:00:00Z"
}
```

**참고**: 프로젝트 생성 시 자동으로 빈 레이아웃(version=1)이 생성됩니다.

---

### 3. 프로젝트 상세 조회

**Endpoint**: `GET /projects/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "내 방 레이아웃",
  "description": "침실 가구 배치",
  "room_width": 5.0,
  "room_height": 3.0,
  "room_depth": 4.0,
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-20T10:00:00Z",
  "current_layout": {
    "furnitures": [
      {
        "id": "bed-single-1234567890",
        "type": "bed",
        "position": {"x": 0, "y": 0.25, "z": 0},
        "rotation": {"x": 0, "y": 0, "z": 0},
        "scale": {"x": 1, "y": 1, "z": 1},
        "dimensions": {"width": 1.0, "height": 0.5, "depth": 2.0},
        "color": "#8B4513"
      }
    ]
  }
}
```

**에러**:
- `404`: 프로젝트를 찾을 수 없음
- `403`: 접근 권한 없음

---

### 4. 프로젝트 수정

**Endpoint**: `PUT /projects/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body** (모든 필드 선택사항):
```json
{
  "name": "수정된 이름",
  "description": "수정된 설명",
  "room_width": 6.0,
  "room_height": 3.5,
  "room_depth": 5.0
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "수정된 이름",
  ...
}
```

---

### 5. 프로젝트 삭제

**Endpoint**: `DELETE /projects/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (204 No Content)

**참고**: 프로젝트 삭제 시 관련된 모든 레이아웃과 히스토리도 함께 삭제됩니다 (CASCADE).

---

## 레이아웃 API

### 1. 현재 레이아웃 조회

**Endpoint**: `GET /projects/{project_id}/layouts/current`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "project_id": 1,
  "version": 3,
  "furniture_state": {
    "furnitures": [...]
  },
  "is_current": true,
  "created_at": "2025-11-20T10:00:00Z"
}
```

---

### 2. 레이아웃 저장

**Endpoint**: `POST /projects/{project_id}/layouts`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body**:
```json
{
  "furniture_state": {
    "furnitures": [
      {
        "id": "bed-single-1234567890",
        "type": "bed",
        "position": {"x": 1.5, "y": 0.25, "z": 2.0},
        "rotation": {"x": 0, "y": 45, "z": 0},
        "scale": {"x": 1, "y": 1, "z": 1},
        "dimensions": {"width": 1.0, "height": 0.5, "depth": 2.0},
        "color": "#8B4513"
      }
    ]
  }
}
```

**Response** (201 Created):
```json
{
  "id": 4,
  "project_id": 1,
  "version": 4,
  "furniture_state": {...},
  "is_current": true,
  "created_at": "2025-11-20T11:00:00Z"
}
```

**참고**: 
- 기존의 모든 레이아웃은 `is_current=false`로 변경됩니다.
- 새 레이아웃의 버전은 자동으로 증가합니다.

---

### 3. 레이아웃 목록 조회

**Endpoint**: `GET /projects/{project_id}/layouts`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
[
  {
    "id": 4,
    "project_id": 1,
    "version": 4,
    "furniture_state": {...},
    "is_current": true,
    "created_at": "2025-11-20T11:00:00Z"
  },
  {
    "id": 3,
    "project_id": 1,
    "version": 3,
    "furniture_state": {...},
    "is_current": false,
    "created_at": "2025-11-20T10:30:00Z"
  }
]
```

**참고**: 버전 내림차순으로 정렬됩니다.

---

### 4. 레이아웃 복원

**Endpoint**: `POST /projects/{project_id}/layouts/{layout_id}/restore`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 3,
  "project_id": 1,
  "version": 3,
  "furniture_state": {...},
  "is_current": true,
  "created_at": "2025-11-20T10:30:00Z"
}
```

**참고**: 선택한 레이아웃이 `is_current=true`로 변경됩니다.

---

### 5. 레이아웃 검증

**Endpoint**: `POST /validate`

**Request Body**:
```json
{
  "furniture_state": {
    "furnitures": [...]
  },
  "room_dimensions": {
    "width": 5.0,
    "height": 3.0,
    "depth": 4.0
  }
}
```

**Response** (200 OK):
```json
{
  "valid": false,
  "collisions": [
    {
      "id1": "bed-single-123",
      "id2": "desk-basic-456"
    }
  ],
  "out_of_bounds": [
    "wardrobe-large-789"
  ]
}
```

**참고**: 
- `valid`: 충돌 및 경계 위반이 없으면 `true`
- `collisions`: 충돌하는 가구 쌍 목록
- `out_of_bounds`: 방 밖으로 나간 가구 ID 목록

---

## 파일 API

### 1. PLY 파일 업로드

**Endpoint**: `POST /files/upload-ply/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body** (Form Data):
```
file: <PLY 파일>
```

**Response** (200 OK):
```json
{
  "message": "PLY file uploaded successfully",
  "filename": "project_1_room.ply",
  "file_size": 1234567,
  "vertex_count": 50000,
  "project_id": 1
}
```

**에러**:
- `400`: 잘못된 파일 형식, 크기 초과, 유효하지 않은 PLY
- `403`: 프로젝트 접근 권한 없음
- `404`: 프로젝트를 찾을 수 없음

**제한사항**:
- 파일 형식: `.ply`만 허용
- 파일 크기 제한: 없음 (개발/시연용)
- PLY 파일은 vertex 데이터를 포함해야 함

**참고**: 프로덕션 환경에서는 서버 인프라에 맞게 파일 크기 제한을 추가하는 것을 권장합니다.

---

### 2. PLY 파일 정보 조회

**Endpoint**: `GET /files/ply/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "has_ply_file": true,
  "file_path": "uploads/ply_files/project_1_room.ply",
  "file_size": 1234567,
  "project_id": 1
}
```

**에러**:
- `404`: PLY 파일을 찾을 수 없음

---

### 3. PLY 파일 삭제

**Endpoint**: `DELETE /files/ply/{project_id}`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "message": "PLY file deleted successfully",
  "project_id": 1
}
```

**에러**:
- `403`: 프로젝트 접근 권한 없음
- `404`: PLY 파일을 찾을 수 없음

**참고**: 파일 삭제 시 디스크의 파일과 데이터베이스 레코드가 모두 삭제됩니다.

---

## WebSocket 이벤트

**연결 URL**: `ws://localhost:8000/socket.io`

**Transport**: `websocket`

### 클라이언트 → 서버

#### 1. join_project
```json
{
  "project_id": 1,
  "user_id": 1
}
```

#### 2. furniture_move
```json
{
  "project_id": 1,
  "furniture_id": "bed-single-123",
  "position": {"x": 1.5, "y": 0.25, "z": 2.0},
  "rotation": {"x": 0, "y": 45, "z": 0}
}
```

#### 3. furniture_add
```json
{
  "project_id": 1,
  "furniture": {
    "id": "desk-basic-456",
    "type": "desk",
    ...
  }
}
```

#### 4. furniture_delete
```json
{
  "project_id": 1,
  "furniture_id": "bed-single-123"
}
```

#### 5. validate_furniture
```json
{
  "project_id": 1,
  "furniture_state": {...},
  "room_dimensions": {...}
}
```

### 서버 → 클라이언트

#### 1. user_joined
```json
{
  "user_id": 2,
  "sid": "abc123"
}
```

#### 2. user_left
```json
{
  "sid": "abc123"
}
```

#### 3. furniture_updated
```json
{
  "furniture_id": "bed-single-123",
  "position": {"x": 1.5, "y": 0.25, "z": 2.0},
  "rotation": {"x": 0, "y": 45, "z": 0}
}
```

#### 4. furniture_added
```json
{
  "furniture": {
    "id": "desk-basic-456",
    ...
  }
}
```

#### 5. furniture_deleted
```json
{
  "furniture_id": "bed-single-123"
}
```

#### 6. validation_result
```json
{
  "valid": false,
  "collisions": [...],
  "out_of_bounds": [...]
}
```

#### 7. collision_detected
```json
{
  "collisions": [...],
  "out_of_bounds": [...]
}
```

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 (내용 없음) |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 오류 |

---

## 다음 단계

- [개발 가이드](./06_개발_가이드.md)로 시작하기
