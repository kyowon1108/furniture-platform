# GLB 실제 스케일 유지 및 자동 감지 완료

## 문제점

### 1. 스케일 왜곡
- GLB 파일에 실제 크기 정보(예: 4m × 2.5m × 3m)가 포함되어 있음
- 하지만 사용자가 입력한 방 크기에 맞춰 강제로 스케일 조정
- 결과: 모델이 왜곡되고 실제 크기와 다르게 표시됨

### 2. 바닥 정렬 문제
- 모델의 절반이 바닥 아래로 들어감
- 가구 배치가 모델에 맞지 않음

### 3. 사용자 혼란
- 실제 크기 정보가 있는데 왜 수동으로 입력해야 하는지 불명확

## 해결 방법

### 1. GLB 파일은 1:1 스케일 유지

**변경 전**:
```typescript
// ❌ 입력된 방 크기에 맞춰 스케일 조정
const scaleX = roomDimensions.width / size.x;
const scaleY = roomDimensions.height / size.y;
const scaleZ = roomDimensions.depth / size.z;
calculatedScale = Math.max(scaleX, scaleY, scaleZ) * 1.5;
```

**변경 후**:
```typescript
// ✅ GLB 파일의 실제 스케일 유지
let calculatedScale = 1; // 항상 1:1 스케일

console.log('GLB Model dimensions:', {
  width: size.x.toFixed(2) + 'm',
  height: size.y.toFixed(2) + 'm',
  depth: size.z.toFixed(2) + 'm',
  scale: '1:1 (preserving real-world scale)'
});
```

### 2. 방 크기 자동 감지

**변경 전**:
```typescript
// ❌ 방 크기가 0일 때만 감지, 패딩 추가
if (roomDimensions.width === 0 && ...) {
  const padding = 1.2;
  const inferredDims = {
    width: size.x * padding,
    height: size.y * padding,
    depth: size.z * padding
  };
}
```

**변경 후**:
```typescript
// ✅ 항상 GLB의 실제 크기 사용, 패딩 없음
if (currentCallback) {
  const actualDims = {
    width: Math.abs(size.x),
    height: Math.abs(size.y),
    depth: Math.abs(size.z)
  };
  console.log('Using GLB dimensions as room dimensions (1:1 scale):', actualDims);
  currentCallback(actualDims);
}
```

### 3. UI 개선

#### 프로젝트 생성 모달
- GLB 파일 선택 시 자동으로 방 크기를 `0, 0, 0`으로 설정
- 명확한 안내 메시지 표시:

```
✨ GLB 파일 자동 감지: GLB 파일에 포함된 실제 크기 정보를 자동으로 사용합니다.
방 크기를 0, 0, 0으로 설정하면 GLB 파일의 실제 크기가 자동으로 적용됩니다.

권장: 방 크기를 모두 0으로 설정하세요. (자동 감지)
GLB 처리: 1:1 스케일 유지 → 텍스처 및 materials 보존 → 반투명 렌더링
```

## 사용 방법

### GLB 파일로 프로젝트 생성

1. **"새 프로젝트" 버튼 클릭**

2. **"3D 파일 업로드" 선택**

3. **GLB 파일 선택**
   - 파일 선택 시 자동으로 방 크기가 `0, 0, 0`으로 설정됨

4. **방 크기 확인**
   - 폭: `0` (자동 감지)
   - 높이: `0` (자동 감지)
   - 깊이: `0` (자동 감지)

5. **"생성" 버튼 클릭**

6. **결과**
   - GLB 파일의 실제 크기가 자동으로 감지됨
   - 예: 4m × 2.5m × 3m
   - 1:1 스케일로 정확하게 표시됨
   - 가구 배치가 모델에 정확히 맞음

## 기술적 세부사항

### 바운딩 박스 계산
```typescript
const box = new THREE.Box3().setFromObject(gltf.scene);
const size = new THREE.Vector3();
box.getSize(size);

// 실제 크기 (미터 단위)
console.log({
  width: size.x,   // 예: 4.0m
  height: size.y,  // 예: 2.5m
  depth: size.z    // 예: 3.0m
});
```

### 센터링 및 정렬
```typescript
// X, Z축: 중심에 정렬
// Y축: 바닥(min.y)을 원점(Y=0)에 정렬
gltf.scene.position.set(-center.x, -box.min.y, -center.z);
```

### 스케일
```typescript
// 항상 1:1 스케일 유지
const scale = 1;
```

## PLY vs GLB 차이

| 특성 | PLY | GLB |
|------|-----|-----|
| **스케일** | 자동 조정 가능 | 1:1 유지 (실제 크기) |
| **방 크기 입력** | 필수 | 자동 감지 (0, 0, 0 권장) |
| **크기 정보** | 불명확 | 정확한 실제 크기 포함 |
| **사용 사례** | 3D 스캔 (Point Cloud) | 3D 모델링 (Blender, SketchUp) |

## 변경된 파일

### 1. `frontend/components/3d/GlbModel.tsx`
- 스케일 계산 로직 제거 → 항상 1:1 스케일
- 방 크기 자동 감지 개선 → 패딩 제거, 실제 크기 사용
- 의존성 최적화 → `roomDimensions` 제거

### 2. `frontend/components/ui/CreateProjectModal.tsx`
- GLB 파일 선택 시 자동으로 방 크기를 0으로 설정
- UI 안내 메시지 개선 → GLB 자동 감지 설명 추가
- 파일 타입별 다른 안내 메시지 표시

## 테스트 방법

### 1. 새 프로젝트 생성
```
1. "새 프로젝트" 클릭
2. "3D 파일 업로드" 선택
3. GLB 파일 선택 (예: room_4x2.5x3.glb)
4. 방 크기가 자동으로 0, 0, 0으로 설정되는지 확인
5. "생성" 클릭
```

### 2. 에디터에서 확인
```
1. 콘솔 로그 확인:
   - "GLB Model dimensions: 4.00m × 2.50m × 3.00m"
   - "Using GLB dimensions as room dimensions (1:1 scale)"
   
2. 시각적 확인:
   - 모델이 바닥 위에 올바르게 표시됨
   - 모델의 절반이 바닥 아래로 들어가지 않음
   - 모델이 왜곡되지 않음
   
3. 가구 배치 테스트:
   - 가구를 드래그하여 배치
   - 가구가 모델의 바닥에 정확히 배치되는지 확인
   - 충돌 감지가 올바르게 작동하는지 확인
```

### 3. 디버그 정보 확인
에디터 페이지 좌측 상단의 Debug Info 패널에서:
```
Room Dimensions: 4.0m × 2.5m × 3.0m (자동 감지됨)
```

## 예상 결과

### Before (수정 전)
```
❌ 사용자 입력: 5m × 3m × 4m
❌ GLB 실제 크기: 4m × 2.5m × 3m
❌ 표시: 왜곡된 크기 (5m × 3m × 4m로 강제 조정)
❌ 결과: 모델이 늘어나거나 압축됨
```

### After (수정 후)
```
✅ 사용자 입력: 0, 0, 0 (자동 감지)
✅ GLB 실제 크기: 4m × 2.5m × 3m
✅ 표시: 정확한 크기 (4m × 2.5m × 3m, 1:1 스케일)
✅ 결과: 모델이 실제 크기대로 표시됨
```

## 완료 ✅

- [x] GLB 파일 1:1 스케일 유지
- [x] 방 크기 자동 감지 개선
- [x] 바닥 정렬 문제 해결
- [x] UI 안내 메시지 개선
- [x] GLB 파일 선택 시 자동으로 방 크기 0 설정
- [x] 문서화

프론트엔드를 재시작하고 GLB 파일로 새 프로젝트를 만들어보세요. 이제 실제 크기대로 정확하게 표시됩니다!
