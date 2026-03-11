# API 문서

## 기본 정보

- Base URL: `http://localhost:8008/api/v1`
- 인증 방식:
  - REST API: `Authorization: Bearer <token>`
  - Socket.IO: 연결 시 `auth.token`
- 주요 포트:
  - Frontend `3008`
  - Backend `8008`
- 업로드 제한:
  - PLY 최대 `100MB`
  - GLB 최대 `50MB`

## 인증 API

### `POST /auth/register`

사용자 등록.

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "홍길동"
}
```

### `POST /auth/login`

OAuth2 form login.

```text
username=user@example.com
password=securepassword123
```

응답:

```json
{
  "access_token": "jwt",
  "token_type": "bearer"
}
```

### `GET /auth/me`

현재 로그인 사용자 조회.

## 프로젝트 API

### `GET /projects`

내 프로젝트 목록 조회.

### `POST /projects`

프로젝트 생성.

```json
{
  "name": "내 방",
  "description": "침실 레이아웃",
  "room_width": 5.0,
  "room_height": 3.0,
  "room_depth": 4.0,
  "build_mode": "template",
  "room_structure": null
}
```

### `GET /projects/{project_id}`

프로젝트 상세 조회. 내부 파일 시스템 경로는 노출하지 않고, 필요 시 `download_url`만 제공합니다.

응답 예시:

```json
{
  "id": 1,
  "owner_id": 1,
  "name": "내 방",
  "room_width": 5.0,
  "room_height": 3.0,
  "room_depth": 4.0,
  "has_3d_file": true,
  "file_type": "glb",
  "download_url": "/api/v1/files-3d/download-3d/1",
  "file_size": 123456,
  "has_ply_file": false,
  "ply_file_size": null,
  "build_mode": "free_build",
  "room_structure": {
    "mode": "free_build"
  },
  "is_shared": false,
  "current_layout": {
    "furnitures": []
  }
}
```

### `PUT /projects/{project_id}`

프로젝트 메타데이터 수정.

### `POST /projects/{project_id}/share`

공유 상태 토글.

### `DELETE /projects/{project_id}`

프로젝트와 연결된 레이아웃/업로드 파일 삭제.

## 레이아웃 API

### `POST /projects/{project_id}/layouts`

새 버전 저장.

### `GET /projects/{project_id}/layouts/current`

현재 레이아웃 조회.

### `GET /projects/{project_id}/layouts`

버전 목록 조회.

### `POST /projects/{project_id}/layouts/{layout_id}/restore`

이전 버전 복원.

### `POST /validate`

저장 없이 충돌/경계 검사.

## 파일 API

### Legacy PLY

- `POST /files/upload-ply/{project_id}`
- `GET /files/ply/{project_id}`
- `GET /files/ply-info/{project_id}`
- `GET /files/download-ply/{project_id}`
- `DELETE /files/ply/{project_id}`

`GET /files/ply/{project_id}` 응답은 내부 경로 대신 `download_url`을 반환합니다.

### Unified 3D Files

- `POST /files-3d/upload-3d/{project_id}`
- `GET /files-3d/3d-file/{project_id}`
- `GET /files-3d/download-3d/{project_id}`
- `DELETE /files-3d/3d-file/{project_id}`

## Room Builder API

- `POST /room-builder/upload-glb/{project_id}`
- `POST /room-builder/generate-texture`
- `GET /room-builder/dimensions/{project_id}`

`upload-glb` 응답도 내부 파일 경로 대신 `download_url`을 반환합니다.

## Catalog API

### 읽기

- `GET /catalog`
- `GET /catalog/{item_id}`
- `GET /catalog/glb/{item_id}`

### 관리자 전용

`ADMIN_EMAILS`에 포함된 사용자만 호출 가능:

- `POST /catalog/sync`
- `GET /catalog/list-glb`
- `PUT /catalog/{item_id}`
- `DELETE /catalog/{item_id}`
- `POST /catalog/glb/{item_id}`

## WebSocket 이벤트

### 연결

클라이언트는 Socket.IO 연결 시 JWT를 `auth.token`으로 전달해야 합니다.

### 주요 이벤트

- Client → Server
  - `join_project`
  - `furniture_move`
  - `furniture_add`
  - `furniture_delete`
  - `validate_furniture`
  - `request_lock`
  - `release_lock`
  - `update_presence`
- Server → Client
  - `current_users`
  - `user_joined`
  - `user_left`
  - `furniture_updated`
  - `furniture_added`
  - `furniture_deleted`
  - `validation_result`
  - `collision_detected`
  - `object_locked`
  - `object_unlocked`
  - `lock_rejected`
  - `presence_updated`
  - `join_error`

서버는 클라이언트가 보낸 `user_id`를 신뢰하지 않고, 토큰 기준 사용자/권한으로 room join 을 검증합니다.
