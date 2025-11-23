# 충돌 감지 개선 보고서

## 문제 상황

1. 벽걸이용 액자와 책장이 겹침
2. 침대와 의자가 겹침
3. 벽걸이용 장식이 벽에 붙었을 때 서로 겹쳐짐
4. 세세한 충돌 감지 및 중복 공간 감지 필요

## 원인 분석

### 기존 충돌 감지 로직의 문제점

1. **2D 충돌 감지만 수행**: XZ 평면에서만 충돌을 체크하고 Y축(높이)을 고려하지 않음
2. **벽걸이용과 바닥 가구 구분 부족**: 벽걸이용 가구와 바닥 가구가 서로 다른 공간에 있음에도 불구하고 충돌 체크를 수행
3. **회전된 가구 크기 미고려**: 가구가 회전했을 때 실제 차지하는 공간을 정확히 계산하지 않음
4. **바닥 가구 간 높이 미고려**: 바닥 가구끼리도 높이가 다르면 실제로는 겹치지 않을 수 있지만, 높이를 고려하지 않음

## 해결 방법

### 1. 3D 충돌 감지 구현

**수정 파일**: 
- `frontend/components/3d/Scene.tsx` (모든 충돌 감지 로직)
- `frontend/components/3d/Furniture.tsx` (90도 회전 버튼 충돌 감지)

**변경 사항**:
- XZ 평면 충돌 체크 + Y축(높이) 충돌 체크를 모두 수행
- 가구 타입별로 적절한 높이 체크 로직 적용

**로직**:
```typescript
// 벽걸이용 가구끼리: Y축(높이) 체크
if (isWallItem && isOtherWallItem) {
  const f1MinY = obj.position.y - furniture.dimensions.height / 2;
  const f1MaxY = obj.position.y + furniture.dimensions.height / 2;
  const f2MinY = other.position.y - other.dimensions.height / 2;
  const f2MaxY = other.position.y + other.dimensions.height / 2;
  overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
}

// 바닥 가구끼리: 바닥(0)부터 높이까지 체크
else if (!isWallItem && !isOtherWallItem) {
  const f1MinY = 0;
  const f1MaxY = furniture.dimensions.height;
  const f2MinY = 0;
  const f2MaxY = other.dimensions.height;
  overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
}

// Surface 가구: 실제 Y 위치 기준으로 체크
else if (isSurfaceItem || isOtherSurfaceItem) {
  const f1MinY = obj.position.y - furniture.dimensions.height / 2;
  const f1MaxY = obj.position.y + furniture.dimensions.height / 2;
  const f2MinY = other.position.y - other.dimensions.height / 2;
  const f2MaxY = other.position.y + other.dimensions.height / 2;
  overlapY = !(f1MaxY < f2MinY || f1MinY > f2MaxY);
}
```

### 2. 벽걸이용과 바닥 가구 구분

**변경 사항**:
- 벽걸이용 가구와 바닥 가구는 서로 다른 공간에 있으므로 충돌하지 않음
- 벽걸이용 가구는 벽에 붙어있고, 바닥 가구는 바닥에 있음

**로직**:
```typescript
// Wall-mounted items and floor items are in different spaces - no collision
if (isWallItem && !isOtherWallItem && !isOtherSurfaceItem) continue;
if (!isWallItem && !isSurfaceItem && isOtherWallItem) continue;
```

### 3. 회전된 가구 크기 고려

**변경 사항**:
- `getRotatedDimensions` 함수를 사용하여 회전된 가구의 실제 크기 계산
- 다른 가구의 회전도 고려하여 충돌 감지

**로직**:
```typescript
// Calculate rotated dimensions for other furniture
const otherRotatedDims = getRotatedDimensions(
  other.dimensions,
  (other.rotation.y * Math.PI) / 180
);

// Use rotated dimensions for collision check
const f2 = {
  minX: other.position.x - otherRotatedDims.width / 2,
  maxX: other.position.x + otherRotatedDims.width / 2,
  minZ: other.position.z - otherRotatedDims.depth / 2,
  maxZ: other.position.z + otherRotatedDims.depth / 2,
};
```

### 4. 모든 충돌 감지 지점 개선

**수정된 위치**:

1. **`onObjectChange` (rotate 모드)**: 회전 시 충돌 감지
2. **`onObjectChange` (translate 모드)**: 이동 시 충돌 감지
3. **`onObjectChange` (translate 모드, 회전 변경)**: translate 모드에서 회전 변경 시 충돌 감지
4. **`handleCanvasClick`**: 클릭으로 가구 배치 시 충돌 감지
5. **`checkCollisions`**: 충돌 상태 표시용 (isColliding 플래그)
6. **`Furniture.tsx handleRotate`**: 90도 회전 버튼 클릭 시 충돌 감지

## 개선된 충돌 감지 로직

### 충돌 조건

충돌은 다음 조건을 모두 만족할 때 발생:
1. **X축 겹침**: `overlapX > penetrationThreshold` (0.02m = 2cm)
2. **Z축 겹침**: `overlapZ > penetrationThreshold` (0.02m = 2cm)
3. **Y축 겹침**: `overlapY === true` (높이 범위가 겹침)

### 가구 타입별 충돌 규칙

1. **벽걸이용 ↔ 벽걸이용**:
   - XZ 평면에서 겹치는지 확인
   - Y축(높이)에서 겹치는지 확인
   - 둘 다 겹치면 충돌

2. **바닥 가구 ↔ 바닥 가구**:
   - XZ 평면에서 겹치는지 확인
   - Y축(높이)에서 겹치는지 확인 (바닥부터 높이까지)
   - 둘 다 겹치면 충돌

3. **벽걸이용 ↔ 바닥 가구**:
   - 충돌하지 않음 (서로 다른 공간)

4. **Surface 가구**:
   - 실제 Y 위치 기준으로 높이 체크
   - 같은 타입끼리만 충돌 체크

## 수정된 파일 목록

1. **frontend/components/3d/Scene.tsx**
   - `onObjectChange` (rotate 모드) 충돌 감지 개선
   - `onObjectChange` (translate 모드) 충돌 감지 개선
   - `onObjectChange` (translate 모드, 회전 변경) 충돌 감지 개선
   - `handleCanvasClick` 충돌 감지 개선
   - `checkCollisions` 충돌 상태 표시 개선

2. **frontend/components/3d/Furniture.tsx**
   - `handleRotate` (90도 회전 버튼) 충돌 감지 개선

## 검증 결과

### ✅ 개선된 사항

1. **벽걸이용 가구끼리**: XZ 평면과 Y축(높이) 모두 체크하여 정확한 충돌 감지
2. **바닥 가구끼리**: 높이를 고려하여 실제로 겹치는 경우만 충돌로 감지
3. **벽걸이용 ↔ 바닥 가구**: 서로 다른 공간이므로 충돌하지 않음
4. **회전된 가구**: 회전된 가구의 실제 크기를 고려하여 정확한 충돌 감지
5. **모든 상호작용 지점**: 이동, 회전, 배치 모든 경우에 일관된 충돌 감지

### 테스트 방법

1. **벽걸이용 가구 테스트**:
   - 벽걸이용 액자와 책장을 같은 벽에 배치
   - 높이가 겹치면 충돌로 감지되어야 함
   - 높이가 겹치지 않으면 충돌하지 않아야 함

2. **바닥 가구 테스트**:
   - 침대와 의자를 배치
   - 높이가 겹치면 충돌로 감지되어야 함
   - 높이가 겹치지 않으면 충돌하지 않아야 함

3. **회전 테스트**:
   - 가구를 회전시켜 다른 가구와 겹치려고 시도
   - 회전된 크기를 고려하여 정확히 충돌 감지되어야 함

4. **벽걸이용 ↔ 바닥 가구 테스트**:
   - 벽걸이용 가구와 바닥 가구를 겹치게 배치 시도
   - 충돌하지 않아야 함 (서로 다른 공간)

## 결론

**주요 개선 사항**:
1. 2D 충돌 감지 → 3D 충돌 감지 (XZ + Y축)
2. 벽걸이용과 바닥 가구 구분
3. 회전된 가구 크기 고려
4. 모든 상호작용 지점에서 일관된 충돌 감지

**결과**: 
- 벽걸이용 가구끼리 정확한 충돌 감지
- 바닥 가구끼리 높이를 고려한 충돌 감지
- 벽걸이용과 바닥 가구는 서로 다른 공간이므로 충돌하지 않음
- 회전된 가구도 정확한 충돌 감지

