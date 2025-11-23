# 축 방향 자동 보정 완료

## 문제 상황
- GLB/PLY 파일 업로드 시 축이 뒤틀려서 천장이 옆면 벽으로 표현되는 문제
- 다양한 3D 소프트웨어(Blender, SketchUp, 3D 스캐너 등)에서 생성된 파일들이 서로 다른 축 방향 사용
  - **Blender, SketchUp**: Z-up (Z축이 위)
  - **Three.js**: Y-up (Y축이 위)
  - **일부 CAD**: X-up (X축이 위)

## 해결 방법

### 1. 축 방향 자동 감지 시스템 (`axisUtils.ts`)

```typescript
// 3가지 방법으로 축 방향 자동 감지
1. 가장 긴 축 찾기 (높이가 가장 긴 축이 "up" 축)
2. 종횡비 분석 (X/Y, X/Z, Y/Z 비율)
3. 상대적 크기 비교 (1.2배 이상 차이나는지 확인)
```

**감지 로직:**
- Z축이 가장 길고 Y축보다 1.2배 이상 크면 → **Z-up**
- Y축이 가장 길고 Z축보다 1.2배 이상 크면 → **Y-up**
- X축이 가장 길고 다른 축보다 1.2배 이상 크면 → **X-up**
- 판단 불가능한 경우 → **Z-up** (기본값)

### 2. 축 변환 매트릭스

```typescript
Z-up → Y-up: X축 기준 -90도 회전
X-up → Y-up: Z축 기준 90도 회전
Y-up → Y-up: 변환 없음
```

### 3. 적용 방식

#### GLB 파일 (`GlbModel.tsx`)
```typescript
// Object3D에 직접 회전 적용
applyAxisCorrection(gltf.scene)
→ 모델 전체를 회전
→ 회전 후 다시 중심 정렬
→ 회전된 크기로 방 크기 추론
```

#### PLY 파일 (`PlyModel.tsx`)
```typescript
// BufferGeometry에 직접 변환 적용 (더 효율적)
applyAxisCorrectionToGeometry(loadedGeometry)
→ 정점 데이터를 직접 변환
→ 회전 후 다시 중심 정렬
→ 노멀 재계산
→ 회전된 크기로 방 크기 추론
```

## 구현 파일

### 새로 생성된 파일
- `frontend/lib/axisUtils.ts` - 축 방향 감지 및 변환 유틸리티

### 수정된 파일
- `frontend/components/3d/GlbModel.tsx` - GLB 모델에 축 보정 적용
- `frontend/components/3d/PlyModel.tsx` - PLY 모델에 축 보정 적용

## 작동 순서

### GLB 로딩 시:
1. GLB 파일 로드
2. 바운딩 박스 계산
3. 모델 중심 정렬
4. **축 방향 자동 감지 및 보정** ← NEW
5. 회전 후 바운딩 박스 재계산
6. 회전 후 다시 중심 정렬
7. 투명도 및 그림자 설정
8. 렌더링

### PLY 로딩 시:
1. PLY 파일 로드 (커스텀 파서 또는 PLYLoader)
2. 바운딩 박스 계산
3. 지오메트리 중심 정렬
4. **축 방향 자동 감지 및 보정** ← NEW
5. 회전 후 바운딩 박스 재계산
6. 회전 후 다시 중심 정렬
7. 노멀 계산
8. 색상 정규화
9. 렌더링

## 테스트 방법

### 1. 백엔드 재시작
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### 2. 프론트엔드 재시작
```bash
cd frontend
npm run dev
```

### 3. 다양한 파일 테스트
- **Blender에서 내보낸 GLB** (Z-up) → 자동으로 Y-up으로 변환
- **SketchUp에서 내보낸 GLB** (Z-up) → 자동으로 Y-up으로 변환
- **3D 스캐너 PLY** (다양한 축) → 자동 감지 및 변환
- **포인트 클라우드 PLY** → 자동 감지 및 변환

### 4. 콘솔 로그 확인
브라우저 개발자 도구에서 다음 로그 확인:
```
🔍 Detecting axis orientation from bounding box: { x: ..., y: ..., z: ... }
✅ Detected: Z-up (Z is tallest)
🔄 Applying axis correction: { detected: 'Z-up', forced: 'auto' }
After rotation: { size: ..., center: ... }
```

## 예상 결과

### 변환 전:
```
천장이 옆면 벽으로 표현됨
모델이 누워있는 상태
```

### 변환 후:
```
천장이 위쪽에 올바르게 표현됨
모델이 서있는 상태
바닥이 아래, 천장이 위
```

## 기술적 세부사항

### 회전 매트릭스
```typescript
// Z-up to Y-up: Rotate -90° around X-axis
[1,  0,  0]
[0,  0,  1]
[0, -1,  0]

// X-up to Y-up: Rotate 90° around Z-axis
[0, -1,  0]
[1,  0,  0]
[0,  0,  1]
```

### 성능 최적화
- **GLB**: Object3D 회전 (메시 구조 유지)
- **PLY**: Geometry 직접 변환 (더 빠름, 메모리 효율적)
- 회전은 로딩 시 1회만 수행
- 런타임 오버헤드 없음

## 호환성

### 지원하는 소프트웨어
- ✅ Blender (Z-up)
- ✅ SketchUp (Z-up)
- ✅ 3D 스캐너 (다양한 축)
- ✅ CAD 소프트웨어 (X-up, Z-up)
- ✅ Photogrammetry 소프트웨어
- ✅ LiDAR 스캐너

### 지원하는 파일 형식
- ✅ GLB (Binary glTF)
- ✅ PLY (ASCII/Binary)
- ✅ 포인트 클라우드
- ✅ 메시 데이터

## 주의사항

1. **자동 감지 한계**: 정육면체나 구 같은 대칭 모델은 축 감지가 어려울 수 있음
2. **기본값**: 감지 실패 시 Z-up으로 가정 (가장 일반적)
3. **수동 보정**: 필요시 `forceOrientation` 파라미터로 수동 지정 가능

## 다음 단계

현재 구현은 자동 감지 방식입니다. 향후 개선 사항:

1. **UI 옵션 추가**: 사용자가 수동으로 축 방향 선택
2. **파일 메타데이터 활용**: GLB/PLY 파일의 메타데이터에서 축 정보 읽기
3. **학습 기반 감지**: 이전 업로드 패턴 학습
4. **프리뷰 기능**: 업로드 전 축 방향 미리보기

## 완료 ✅

- [x] 축 방향 자동 감지 알고리즘 구현
- [x] Z-up → Y-up 변환 구현
- [x] X-up → Y-up 변환 구현
- [x] GLB 파일에 적용
- [x] PLY 파일에 적용
- [x] 회전 후 중심 재정렬
- [x] 회전 후 크기 재계산
- [x] 디버그 로그 추가
- [x] 문서 작성
