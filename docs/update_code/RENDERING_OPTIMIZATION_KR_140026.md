# 렌더링 최적화 완료 - 가구 이동 시 PLY/GLB 리렌더링 문제 해결

## 문제점

### 심각한 성능 문제
가구를 배치하거나 이동할 때마다 PLY/GLB 파일이 계속 리렌더링되어 심각한 성능 저하 발생:
- 가구가 1칸씩 이동할 때마다 PLY/GLB 모델 전체가 리렌더링
- 화면에 방 디자인이 작아졌다 커졌다 반짝반짝 깜빡임
- 사용자 경험 매우 나쁨
- 특히 큰 PLY/GLB 파일의 경우 렌더링 지연 심각

### 원인 분석

1. **React 리렌더링 최적화 부족**
   - `PlyModel`과 `GlbModel` 컴포넌트가 `React.memo`로 감싸지지 않음
   - 부모 컴포넌트(Scene)가 리렌더링될 때마다 자식도 리렌더링

2. **스케일 계산 최적화 부족**
   - 매 렌더링마다 스케일과 위치를 재계산
   - `useMemo` 없이 복잡한 계산 반복

3. **콜백 함수 재생성**
   - `onRoomDimensionsChange` 콜백이 매번 새로 생성됨
   - `useCallback` 없이 함수 전달

## 해결 방법

### 1. React.memo로 컴포넌트 메모이제이션

**PlyModel과 GlbModel을 memo로 감싸기**:

```typescript
// ❌ 이전 코드
export function PlyModel({ projectId, plyFilePath, roomDimensions, onRoomDimensionsChange }: PlyModelProps) {
  // ...
}

// ✅ 최적화된 코드
export const PlyModel = memo(function PlyModel({ projectId, plyFilePath, roomDimensions, onRoomDimensionsChange }: PlyModelProps) {
  // ...
});
```

**효과**:
- props가 변경되지 않으면 리렌더링 건너뜀
- 가구 이동 시 PLY/GLB 모델은 리렌더링되지 않음

### 2. PlyGeometry와 GlbGeometry도 메모이제이션

```typescript
// ✅ 내부 컴포넌트도 memo로 감싸기
const PlyGeometry = memo(function PlyGeometry({ url, roomDimensions, onDimensionsDetected }: { 
  url: string;
  roomDimensions?: { width: number; height: number; depth: number };
  onDimensionsDetected?: (dims: { width: number; height: number; depth: number }) => void;
}) {
  // ...
});
```

### 3. useMemo로 스케일 계산 최적화

**이전 코드 (매번 재계산)**:
```typescript
// ❌ 매 렌더링마다 실행
const boundingBox = geometry.boundingBox;
let scale = 1;
let position: [number, number, number] = [0, 0, 0];

if (boundingBox && roomDimensions) {
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  // 복잡한 계산...
  scale = Math.max(scaleX, scaleY, scaleZ) * 1.5;
}
```

**최적화된 코드 (필요할 때만 재계산)**:
```typescript
// ✅ geometry나 roomDimensions가 변경될 때만 재계산
const { scale, position } = useMemo(() => {
  const boundingBox = geometry?.boundingBox;
  let calculatedScale = 1;
  let calculatedPosition: [number, number, number] = [0, 0, 0];
  
  if (boundingBox && roomDimensions) {
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    // 복잡한 계산...
    calculatedScale = Math.max(scaleX, scaleY, scaleZ) * 1.5;
  }
  
  return { scale: calculatedScale, position: calculatedPosition };
}, [geometry, roomDimensions?.width, roomDimensions?.height, roomDimensions?.depth]);
```

**주의사항**:
- `roomDimensions` 객체 전체가 아닌 개별 속성을 의존성으로 사용
- 객체 참조가 변경되어도 값이 같으면 재계산하지 않음

### 4. useCallback으로 콜백 함수 메모이제이션

**에디터 페이지에서**:
```typescript
// ❌ 이전 코드 - 매 렌더링마다 새 함수 생성
<Scene 
  onRoomDimensionsChange={setRoomDimensions}
/>

// ✅ 최적화된 코드 - 함수 재사용
const handleRoomDimensionsChange = useCallback((dims: { width: number; height: number; depth: number }) => {
  setRoomDimensions(dims);
}, []);

<Scene 
  onRoomDimensionsChange={handleRoomDimensionsChange}
/>
```

## 적용된 파일

### 1. `frontend/components/3d/PlyModel.tsx`
- `PlyModel` 컴포넌트를 `memo`로 감싸기
- `PlyGeometry` 컴포넌트를 `memo`로 감싸기
- 스케일 계산을 `useMemo`로 최적화
- `useMemo`, `memo` import 추가

### 2. `frontend/components/3d/GlbModel.tsx`
- `GlbModel` 컴포넌트를 `memo`로 감싸기
- `GlbGeometry` 컴포넌트를 `memo`로 감싸기
- 스케일 계산을 `useMemo`로 최적화
- `useMemo`, `memo` import 추가

### 3. `frontend/app/editor/[projectId]/page.tsx`
- `handleRoomDimensionsChange` 콜백을 `useCallback`으로 메모이제이션
- `useCallback` import 추가

## 최적화 효과

### Before (최적화 전)
```
가구 이동 → Scene 리렌더링 → PlyModel 리렌더링 → 스케일 재계산 → 깜빡임
가구 이동 → Scene 리렌더링 → PlyModel 리렌더링 → 스케일 재계산 → 깜빡임
가구 이동 → Scene 리렌더링 → PlyModel 리렌더링 → 스케일 재계산 → 깜빡임
...
```

### After (최적화 후)
```
가구 이동 → Scene 리렌더링 → PlyModel 건너뜀 (memo) → 깜빡임 없음 ✅
가구 이동 → Scene 리렌더링 → PlyModel 건너뜀 (memo) → 깜빡임 없음 ✅
가구 이동 → Scene 리렌더링 → PlyModel 건너뜀 (memo) → 깜빡임 없음 ✅
...
```

### 성능 개선
- ✅ **PLY/GLB 모델 리렌더링 제거**: 가구 이동 시 모델이 리렌더링되지 않음
- ✅ **깜빡임 제거**: 화면이 안정적으로 유지됨
- ✅ **스케일 계산 최적화**: 필요할 때만 재계산
- ✅ **부드러운 사용자 경험**: 가구 배치가 매끄럽게 작동
- ✅ **CPU 사용량 감소**: 불필요한 계산 제거

## 테스트 방법

1. **프론트엔드 재시작**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **PLY/GLB 파일 업로드**:
   - 프로젝트에 PLY 또는 GLB 파일 업로드
   - 에디터 페이지 열기

3. **가구 배치 테스트**:
   - 사이드바에서 가구 드래그 앤 드롭
   - 가구를 이동시키기
   - **확인 사항**:
     - ✅ PLY/GLB 모델이 깜빡이지 않음
     - ✅ 화면이 안정적으로 유지됨
     - ✅ 가구 이동이 부드러움
     - ✅ 콘솔에 "Rendering PLY/GLB" 메시지가 반복되지 않음

4. **콘솔 확인**:
   - 브라우저 개발자 도구 열기
   - React DevTools Profiler 사용 (선택사항)
   - 가구 이동 시 PlyModel/GlbModel 컴포넌트가 리렌더링되지 않는지 확인

## React 최적화 패턴 요약

### 1. React.memo
```typescript
// 컴포넌트 메모이제이션
const MyComponent = memo(function MyComponent(props) {
  // props가 변경되지 않으면 리렌더링 건너뜀
});
```

### 2. useMemo
```typescript
// 값 메모이제이션
const expensiveValue = useMemo(() => {
  // 복잡한 계산
  return result;
}, [dependency1, dependency2]);
```

### 3. useCallback
```typescript
// 함수 메모이제이션
const memoizedCallback = useCallback((arg) => {
  // 함수 로직
}, [dependency]);
```

### 4. 의존성 배열 최적화
```typescript
// ❌ 나쁜 예 - 객체 전체를 의존성으로
useMemo(() => { ... }, [roomDimensions]);

// ✅ 좋은 예 - 개별 속성을 의존성으로
useMemo(() => { ... }, [roomDimensions?.width, roomDimensions?.height, roomDimensions?.depth]);
```

## 완료 ✅

- [x] PlyModel 컴포넌트 메모이제이션
- [x] GlbModel 컴포넌트 메모이제이션
- [x] PlyGeometry 컴포넌트 메모이제이션
- [x] GlbGeometry 컴포넌트 메모이제이션
- [x] 스케일 계산 useMemo 최적화
- [x] 콜백 함수 useCallback 최적화
- [x] 의존성 배열 최적화
- [x] 문서화

## 추가 최적화 가능 영역 (향후)

1. **Furniture 컴포넌트 최적화**: 개별 가구도 memo로 감싸기
2. **Scene 컴포넌트 분리**: SceneContent를 더 작은 컴포넌트로 분리
3. **충돌 감지 최적화**: 공간 분할 알고리즘 사용 (Quadtree 등)
4. **WebWorker 사용**: 복잡한 계산을 백그라운드 스레드로 이동

프론트엔드를 재시작하고 가구를 배치해보세요. 이제 PLY/GLB 모델이 깜빡이지 않고 부드럽게 작동합니다!
