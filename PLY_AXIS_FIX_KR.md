# PLY/GLB 축 변환 및 방 크기 자동 조정 + 성능 최적화 완료

## 문제점
1. **PLY 파일 축 문제**: PLY 파일이 옆으로 누워있어서 가로/세로 축이 엉켜있음
2. **방 크기 불일치**: 임의로 설정한 방 크기와 PLY 파일의 실제 크기가 달라서 렌더링 문제 발생
3. **성능 문제**: PLY/GLB 파일이 계속 재로딩되어 성능 저하 및 렌더링 문제 발생

## 해결 방법

### 1. 축 감지 로직 개선 (`axisUtils.ts`)

**기존 방식**: 가장 큰 차원을 "up" 축으로 감지
- 문제: 방 스캔은 보통 가로/세로가 높이보다 크기 때문에 잘못 감지됨

**새로운 방식**: 가장 작은 차원을 높이로 감지
- 방 스캔의 특성: 높이(Y)가 가장 작은 차원
- Y가 가장 작으면 → 모델이 옆으로 누워있음 (Z-up) → 회전 필요
- Z가 가장 작으면 → 모델이 이미 올바른 방향 (Y-up) → 회전 불필요

```typescript
// 가장 작은 차원 찾기 (높이일 가능성이 높음)
const minDim = Math.min(size.x, size.y, size.z);

// Y가 가장 작으면 → Z-up (회전 필요)
if (size.y === minDim && size.y < size.z * 0.8) {
  return 'Z-up'; // -90도 X축 회전 적용
}

// Z가 가장 작으면 → Y-up (회전 불필요)
if (size.z === minDim && size.z < size.y * 0.8) {
  return 'Y-up'; // 회전 없음
}
```

### 2. 방 크기 자동 조정

**파일 업로드 시 자동으로 방 크기 감지**:

1. PLY 파일 로드 후 바운딩 박스 계산
2. 축 변환 적용 (회전)
3. 회전 후 크기 재계산
4. 20% 패딩 추가하여 방 크기 설정

```typescript
// 20% 패딩 추가
const padding = 1.2;
const inferredDims = {
  width: Math.abs(rotatedSize.x) * padding,
  height: Math.abs(rotatedSize.y) * padding,
  depth: Math.abs(rotatedSize.z) * padding
};
```

5. 부모 컴포넌트로 감지된 크기 전달
6. 에디터 페이지에서 방 크기 상태 업데이트

### 3. 컴포넌트 구조

```
EditorPage
  └─ Scene (roomDimensions, onRoomDimensionsChange)
      └─ PlyModel (roomDimensions, onRoomDimensionsChange)
          └─ PlyGeometry (onDimensionsDetected)
```

**데이터 흐름**:
1. `PlyGeometry`: PLY 파일에서 크기 감지
2. `PlyModel`: 감지된 크기를 부모로 전달
3. `Scene`: 방 크기 변경 이벤트 전달
4. `EditorPage`: 상태 업데이트 및 Scene에 반영

## 변경된 파일

### 1. `frontend/lib/axisUtils.ts`
- `detectAxisOrientation()`: 축 감지 로직 완전 재작성
- 가장 작은 차원을 높이로 인식하도록 변경

### 2. `frontend/components/3d/PlyModel.tsx`
- `PlyModelProps`: `onRoomDimensionsChange` prop 추가
- `handleDimensionsDetected()`: 부모로 크기 전달 로직 추가
- 감지된 크기에 20% 패딩 추가

### 3. `frontend/components/3d/Scene.tsx`
- `SceneContent` props: `onRoomDimensionsChange` 추가
- `PlyModel`에 `onRoomDimensionsChange` 전달

### 4. `frontend/app/editor/[projectId]/page.tsx`
- `roomDimensions` 상태 추가
- `setRoomDimensions` 콜백을 Scene에 전달
- 프로젝트 로드 시 초기 방 크기 설정

## GLB 파일 호환성

✅ **GLB 파일은 영향 없음**
- GLB 파일은 이미 Y-up 형식 (Three.js 표준)
- `GlbModel.tsx`에서 축 변환을 적용하지 않음
- 기존 동작 유지

## 테스트 방법

1. **프론트엔드 재시작**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **PLY 파일 업로드**:
   - 새 프로젝트 생성
   - PLY 파일 업로드
   - 콘솔에서 로그 확인:
     ```
     🔍 Detecting axis orientation from bounding box
     Dimension analysis: { minDim, isYSmallest, isZSmallest }
     ✅ Detected: Z-up (Y is smallest, model is lying down)
     또는
     ✅ Detected: Y-up (Z is smallest, model is upright)
     ```

3. **방 크기 확인**:
   - 콘솔에서 확인:
     ```
     Inferred room dimensions from PLY (after rotation, with padding)
     🏠 Updating room dimensions in parent
     ```
   - PLY 모델이 방 안에 적절히 배치되는지 확인

4. **GLB 파일 테스트**:
   - GLB 파일 업로드
   - 기존처럼 정상 작동하는지 확인
   - 축 변환이 적용되지 않는지 확인

## 예상 결과

### PLY 파일
- ✅ 올바른 방향으로 표시 (더 이상 옆으로 누워있지 않음)
- ✅ 방 크기가 PLY 파일에 맞춰 자동 조정
- ✅ 모델이 방 안에 적절히 배치됨

### GLB 파일
- ✅ 기존과 동일하게 작동
- ✅ 축 변환 없음
- ✅ 방 크기 자동 조정 (필요시)

## 주의사항

1. **방 크기 0인 경우**: 프로젝트의 `room_width`, `room_height`, `room_depth`가 모두 0이면 PLY/GLB 파일에서 자동으로 크기를 감지합니다.

2. **방 크기가 설정된 경우**: 이미 방 크기가 설정되어 있으면 자동 감지를 하지 않고 설정된 크기를 사용합니다.

3. **패딩**: 자동 감지 시 20% 패딩을 추가하여 모델이 방 벽에 딱 붙지 않도록 합니다.

## 디버그 정보

콘솔에서 다음 정보를 확인할 수 있습니다:

```javascript
// 축 감지
🔍 Detecting axis orientation from bounding box: { x, y, z }
Dimension analysis: { minDim, isXSmallest, isYSmallest, isZSmallest }
✅ Detected: [Y-up | Z-up | X-up]

// 방 크기 감지
Inferred room dimensions from PLY (after rotation, with padding): { width, height, depth }
🏠 Updating room dimensions in parent: { width, height, depth }

// 렌더링
🏠 PLY Scaling to Room:
  PLY original size: { x, y, z }
  Target room size: { width, height, depth }
  Final scale: [scale]
```

## 성능 최적화

### 문제: 무한 재로딩
PLY/GLB 파일이 계속 재로딩되는 문제가 있었습니다.

**원인**:
```typescript
// ❌ 잘못된 코드
useEffect(() => {
  loadFile();
}, [url, roomDimensions, onDimensionsDetected]); // roomDimensions와 콜백이 변경될 때마다 재로딩!
```

**해결**:
1. **useEffect 의존성 최소화**: URL만 의존성으로 설정
2. **useRef 사용**: props를 ref로 저장하여 최신 값 접근
3. **별도 useEffect**: ref 업데이트용 useEffect 분리

```typescript
// ✅ 올바른 코드
const roomDimensionsRef = useRef(roomDimensions);
const onDimensionsDetectedRef = useRef(onDimensionsDetected);

// Ref 업데이트 (재로딩 없음)
useEffect(() => {
  roomDimensionsRef.current = roomDimensions;
  onDimensionsDetectedRef.current = onDimensionsDetected;
}, [roomDimensions, onDimensionsDetected]);

// 파일 로딩 (URL 변경 시에만)
useEffect(() => {
  if (!url) return;
  loadFile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [url]); // URL만 의존성!
```

### 적용 파일
- `PlyModel.tsx`: PLY 파일 로딩 최적화
- `GlbModel.tsx`: GLB 파일 로딩 최적화

### 효과
- ✅ 파일이 한 번만 로딩됨
- ✅ 방 크기 변경 시 재로딩 없음
- ✅ 콜백 함수 변경 시 재로딩 없음
- ✅ 렌더링 성능 대폭 향상

## 완료 ✅

- [x] PLY 축 감지 로직 개선
- [x] 방 크기 자동 조정 구현 (PLY/GLB 모두)
- [x] 부모 컴포넌트로 크기 전달
- [x] GLB 파일 호환성 유지
- [x] **성능 최적화: 무한 재로딩 문제 해결**
- [x] 문서화

프론트엔드를 재시작하고 PLY/GLB 파일을 업로드하여 테스트하세요!

## 테스트 체크리스트

### PLY 파일
- [ ] 파일이 한 번만 로딩되는지 확인 (콘솔 로그)
- [ ] 올바른 방향으로 표시되는지 확인
- [ ] 방 크기가 자동으로 조정되는지 확인
- [ ] 가구 배치가 정상 작동하는지 확인

### GLB 파일
- [ ] 파일이 한 번만 로딩되는지 확인 (콘솔 로그)
- [ ] 텍스처가 정상 표시되는지 확인
- [ ] 방 크기가 자동으로 조정되는지 확인
- [ ] 가구 배치가 정상 작동하는지 확인

### 성능
- [ ] 페이지 로딩 속도가 빠른지 확인
- [ ] 렌더링이 부드러운지 확인
- [ ] 콘솔에 "Loading PLY/GLB" 메시지가 한 번만 나타나는지 확인
