# 가구 회전 시 벽 충돌 감지 완료

## 문제점

### 1. 벽 관통 문제
- 가구를 회전하면 벽을 뚫고 나가는 문제
- 회전 후 가구 크기가 방 경계를 초과해도 회전 허용됨
- 사용자가 잘못된 배치를 할 수 있음

### 2. 브라우저 확장 프로그램 에러
```
content.js:10 Uncaught TypeError: Cannot read properties of undefined (reading 'sendMessage')
content.js:10 Uncaught Error: Extension context invalidated.
```
- 이 에러는 브라우저 확장 프로그램(Chrome Extension) 관련 에러
- 코드와 무관하며 무시해도 됨
- 확장 프로그램을 비활성화하거나 시크릿 모드에서 테스트 가능

## 해결 방법

### 1. 회전된 치수 계산 함수

가구를 회전하면 차지하는 공간이 달라집니다:

```typescript
function getRotatedDimensions(
  dimensions: { width: number; height: number; depth: number },
  rotationY: number
): { width: number; height: number; depth: number } {
  const degrees = ((rotationY * 180) / Math.PI) % 360;
  const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
  
  // 90도 또는 270도 회전 시 width와 depth 교환
  const isNear90 = Math.abs(normalizedDegrees - 90) < 5 || 
                   Math.abs(normalizedDegrees - 270) < 5;
  
  if (isNear90) {
    return {
      width: dimensions.depth,
      height: dimensions.height,
      depth: dimensions.width
    };
  } else {
    // 중간 각도는 대각선 길이 계산
    const radians = Math.abs(rotationY);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    
    return {
      width: dimensions.width * cos + dimensions.depth * sin,
      height: dimensions.height,
      depth: dimensions.width * sin + dimensions.depth * cos
    };
  }
}
```

### 2. 회전 시 벽 충돌 감지

```typescript
if (transformMode === 'rotate') {
  // 회전된 치수 계산
  const rotatedDims = getRotatedDimensions(
    selectedFurniture.dimensions,
    obj.rotation.y
  );
  
  const halfWidth = rotatedDims.width / 2;
  const halfDepth = rotatedDims.depth / 2;
  const roomHalfWidth = actualRoomDimensions.width / 2;
  const roomHalfDepth = actualRoomDimensions.depth / 2;
  
  // 방 경계 초과 확인
  const wouldExceedBounds = 
    obj.position.x - halfWidth < -roomHalfWidth ||
    obj.position.x + halfWidth > roomHalfWidth ||
    obj.position.z - halfDepth < -roomHalfDepth ||
    obj.position.z + halfDepth > roomHalfDepth;
  
  if (wouldExceedBounds) {
    // 회전 취소
    const prevRotation = furnitures.find(f => f.id === selectedFurniture.id)?.rotation.y || 0;
    obj.rotation.y = (prevRotation * Math.PI) / 180;
    
    // 에러 메시지 표시
    useToastStore.getState().addToast('공간이 부족하여 회전할 수 없습니다', 'error');
    return;
  }
}
```

## 작동 방식

### 예시: 2m × 1m 소파

#### 0도 (원래 방향)
```
┌─────────┐
│         │ 1m
│  소파   │
└─────────┘
    2m
```
- 필요 공간: 2m × 1m

#### 90도 회전
```
┌───┐
│   │
│ 소 │ 2m
│ 파 │
│   │
└───┘
 1m
```
- 필요 공간: 1m × 2m (width와 depth 교환)

#### 45도 회전 (대각선)
```
    ╱╲
   ╱  ╲
  ╱ 소 ╲
 ╱  파  ╲
╱________╲
```
- 필요 공간: 약 2.12m × 2.12m (√(2² + 1²))

### 충돌 감지 로직

1. **회전 시작**: 사용자가 회전 핸들을 드래그
2. **치수 계산**: 회전 각도에 따른 새로운 치수 계산
3. **경계 확인**: 회전 후 위치가 방 경계 내에 있는지 확인
4. **결과**:
   - ✅ 공간 충분 → 회전 허용
   - ❌ 공간 부족 → 회전 취소 + 에러 메시지

## 사용자 경험

### Before (수정 전)
```
사용자: 소파를 90도 회전
시스템: 회전 허용 (벽을 뚫고 나감)
결과: ❌ 잘못된 배치
```

### After (수정 후)
```
사용자: 소파를 90도 회전
시스템: 공간 확인 → 벽 초과 감지
시스템: 회전 취소 + "공간이 부족하여 회전할 수 없습니다" 메시지
결과: ✅ 올바른 배치 유지
```

## 에러 메시지 설명

### 코드 관련 에러 (없음)
현재 코드에는 에러가 없습니다.

### 브라우저 확장 프로그램 에러 (무시 가능)
```
content.js:10 Uncaught TypeError: Cannot read properties of undefined (reading 'sendMessage')
content.js:10 Uncaught Error: Extension context invalidated.
```

**원인**:
- Chrome/Edge 브라우저 확장 프로그램이 페이지에 스크립트를 주입
- 확장 프로그램이 업데이트되거나 비활성화되면 에러 발생
- 개발자 도구를 열면 더 자주 발생

**해결 방법**:
1. **무시**: 앱 기능에 영향 없음
2. **확장 프로그램 비활성화**: 개발 중에는 확장 프로그램 끄기
3. **시크릿 모드**: 확장 프로그램 없이 테스트
4. **콘솔 필터**: 개발자 도구에서 `content.js` 에러 필터링

## 테스트 방법

### 1. 좁은 공간에서 회전
```
1. 방 크기: 3m × 3m
2. 소파 배치: 2m × 1m, 벽 근처
3. 90도 회전 시도
4. 예상: "공간이 부족하여 회전할 수 없습니다" 메시지
```

### 2. 넓은 공간에서 회전
```
1. 방 크기: 10m × 10m
2. 소파 배치: 2m × 1m, 중앙
3. 90도 회전 시도
4. 예상: 회전 성공
```

### 3. 코너에서 회전
```
1. 소파를 방 코너에 배치
2. 회전 시도
3. 예상: 벽에 닿으면 회전 불가
```

## 변경된 파일

### `frontend/components/3d/Scene.tsx`
1. `getRotatedDimensions()` 함수 추가
   - 회전 각도에 따른 치수 계산
   - 90도 회전 시 width/depth 교환
   - 중간 각도는 대각선 길이 계산

2. 회전 모드 충돌 감지 추가
   - 회전 후 경계 확인
   - 초과 시 회전 취소
   - 에러 메시지 표시

## 추가 개선 사항 (향후)

1. **가구 간 충돌 감지**: 회전 시 다른 가구와의 충돌도 확인
2. **회전 가능 각도 표시**: UI에서 회전 가능한 각도 범위 시각화
3. **자동 위치 조정**: 회전 시 자동으로 중앙으로 이동하여 공간 확보
4. **회전 프리뷰**: 회전 전에 미리보기 표시

## 완료 ✅

- [x] 회전된 치수 계산 함수 구현
- [x] 회전 시 벽 충돌 감지
- [x] 공간 부족 시 회전 취소
- [x] 에러 메시지 표시
- [x] 브라우저 확장 프로그램 에러 설명
- [x] 문서화

프론트엔드를 재시작하고 가구를 회전해보세요. 이제 벽을 뚫고 나가지 않습니다!
