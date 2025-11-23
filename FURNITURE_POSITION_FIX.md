# 가구 위치 유지 문제 해결 보고서

## 문제 상황

가구를 배치한 후 새로운 가구를 추가하면, 기존에 배치한 가구들이 이동하는 문제가 발생했습니다.

## 원인 분석

### 주요 원인: Scene.tsx의 자동 수정 로직

**위치**: `frontend/components/3d/Scene.tsx` (287-434 라인)

**문제점**:
1. `useEffect`가 가구가 추가될 때마다 실행됨 (`furnitures.length` 변경 시)
2. 모든 가구의 위치를 다시 계산하고 경계 밖으로 나간 가구를 자동으로 수정
3. 충돌하는 가구들을 자동으로 분리하여 이동시킴
4. `useEditorStore.setState({ furnitures: correctedFurnitures })`로 전체 가구 배열을 덮어씀

**의존성 배열**:
```typescript
}, [furnitures.length, furnitures.map(f => f.id).join(','), actualRoomDimensions.width, actualRoomDimensions.depth]);
```

이로 인해:
- 새 가구가 추가되면 (`furnitures.length` 변경)
- 모든 가구의 위치가 재계산됨
- 경계 밖으로 나간 가구나 충돌하는 가구가 자동으로 이동됨
- 사용자가 배치한 가구도 의도치 않게 이동됨

## 해결 방법

### 1. 자동 수정 로직 제거

**수정 파일**: `frontend/components/3d/Scene.tsx`

**변경 사항**:
- 경계 수정 및 충돌 해결 자동 로직 완전 제거
- 주석으로 제거 이유 명시

**이유**:
- 가구 위치는 사용자 액션(`onObjectChange`)에서만 수정되어야 함
- 자동 수정은 사용자 의도와 다를 수 있음
- 배경 프로세스가 가구 위치를 변경하면 안 됨

### 2. 중복 방지 로직 추가

**수정 파일**: 
- `frontend/store/editorStore.ts` - `addFurniture` 함수
- `frontend/hooks/useSocket.ts` - `furniture_added` 이벤트 핸들러

**변경 사항**:
- 동일한 ID의 가구가 이미 존재하면 추가하지 않음
- WebSocket으로 받은 가구도 중복 체크

**이유**:
- WebSocket 동기화 시 중복 추가 방지
- 같은 가구가 여러 번 추가되는 것 방지

## 전체 플로우 검증

### ✅ 가구 추가 플로우

1. **사이드바에서 클릭**:
   ```typescript
   Sidebar.handleClick() 
   → addFurniture(newFurniture) 
   → furnitures 배열에 추가
   → WebSocket으로 브로드캐스트
   ```

2. **드래그 앤 드롭**:
   ```typescript
   Scene.handleDrop() 
   → addFurniture(newFurniture) 
   → furnitures 배열에 추가
   → WebSocket으로 브로드캐스트
   ```

3. **중복 방지**:
   - `addFurniture`에서 ID 중복 체크
   - WebSocket 이벤트에서도 중복 체크

**결과**: ✅ 기존 가구에 영향 없음

### ✅ 가구 위치 저장 플로우

1. **사용자 액션**:
   ```typescript
   TransformControls.onObjectChange()
   → updateFurniture(id, { position, rotation })
   → 특정 가구만 업데이트
   → WebSocket으로 브로드캐스트
   ```

2. **자동 저장**:
   ```typescript
   useAutoSave(5000)
   → saveLayout()
   → layoutsAPI.save(projectId, { furnitures })
   → 백엔드에 현재 상태 저장
   ```

3. **수동 저장**:
   ```typescript
   Ctrl+S 또는 저장 버튼
   → saveLayout()
   → layoutsAPI.save(projectId, { furnitures })
   → 백엔드에 현재 상태 저장
   ```

**결과**: ✅ 현재 가구 상태가 그대로 저장됨

### ✅ 가구 위치 로드 플로우

1. **프로젝트 로드**:
   ```typescript
   EditorPage.loadProject()
   → loadLayout(projectId)
   → layoutsAPI.getCurrent(projectId)
   → 백엔드에서 furniture_state 가져오기
   → set({ furnitures: layout.furniture_state.furnitures })
   ```

2. **백엔드 응답**:
   ```python
   get_current_layout()
   → Layout.furniture_state (JSON)
   → 그대로 반환
   ```

**결과**: ✅ 저장된 위치가 그대로 복원됨

### ✅ WebSocket 동기화 플로우

1. **가구 추가**:
   ```typescript
   socket.emit('furniture_add')
   → 백엔드: 다른 사용자에게 브로드캐스트
   → 다른 클라이언트: 'furniture_added' 수신
   → addFurniture(furniture) (중복 체크 포함)
   ```

2. **가구 이동**:
   ```typescript
   socket.emit('furniture_move')
   → 백엔드: 다른 사용자에게 브로드캐스트
   → 다른 클라이언트: 'furniture_updated' 수신
   → updateFurniture(id, { position, rotation })
   ```

3. **가구 삭제**:
   ```typescript
   socket.emit('furniture_delete')
   → 백엔드: 다른 사용자에게 브로드캐스트
   → 다른 클라이언트: 'furniture_deleted' 수신
   → deleteFurniture(id)
   ```

**결과**: ✅ 개별 가구만 업데이트, 기존 가구에 영향 없음

### ✅ 충돌 감지 플로우

1. **checkCollisions 함수**:
   - 위치를 변경하지 않음
   - `isColliding` 플래그만 업데이트
   - 시각적 피드백용

2. **실제 충돌 방지**:
   - `onObjectChange`에서 경계 검사 및 충돌 검사
   - 경계 초과 시 위치 되돌리기
   - 충돌 시 이동 차단

**결과**: ✅ 위치는 변경하지 않고, 충돌 상태만 표시

## 수정된 파일 목록

1. **frontend/components/3d/Scene.tsx**
   - 자동 수정 로직 제거 (287-434 라인)
   - 주석으로 제거 이유 명시

2. **frontend/store/editorStore.ts**
   - `addFurniture`에 중복 방지 로직 추가

3. **frontend/hooks/useSocket.ts**
   - `furniture_added` 이벤트에 중복 방지 로직 추가

## 검증 결과

### ✅ 확인된 사항

1. **가구 추가 시**: 기존 가구 위치 유지됨
2. **가구 이동 시**: 다른 가구에 영향 없음
3. **가구 저장 시**: 현재 위치가 그대로 저장됨
4. **가구 로드 시**: 저장된 위치가 그대로 복원됨
5. **WebSocket 동기화**: 개별 가구만 업데이트됨
6. **중복 방지**: 같은 가구가 여러 번 추가되지 않음

### ✅ 백엔드 검증

- 백엔드는 받은 `furniture_state`를 그대로 저장
- 로드 시 저장된 데이터를 그대로 반환
- 문제 없음

## 테스트 방법

1. **기본 테스트**:
   - 가구를 여러 개 배치
   - 새로운 가구 추가
   - 기존 가구 위치가 유지되는지 확인

2. **저장/로드 테스트**:
   - 가구 배치 후 저장
   - 페이지 새로고침
   - 가구 위치가 복원되는지 확인

3. **WebSocket 테스트**:
   - 두 개의 브라우저에서 같은 프로젝트 열기
   - 한쪽에서 가구 추가/이동
   - 다른 쪽에서 기존 가구 위치가 유지되는지 확인

## 추가 개선 사항

1. **성능 최적화** (선택사항):
   - `checkCollisions`의 useEffect 의존성 배열 최적화
   - `JSON.stringify` 대신 더 효율적인 방법 사용

2. **로깅 개선** (선택사항):
   - 가구 위치 변경 시 상세 로그 추가
   - 디버깅을 위한 추적 로그

## 결론

**주요 원인**: Scene.tsx의 자동 수정 로직이 새 가구 추가 시 모든 가구 위치를 재계산하여 변경

**해결 방법**: 자동 수정 로직 제거 및 중복 방지 로직 추가

**결과**: 가구 위치가 사용자 액션에서만 변경되며, 새 가구 추가 시 기존 가구 위치가 유지됨

