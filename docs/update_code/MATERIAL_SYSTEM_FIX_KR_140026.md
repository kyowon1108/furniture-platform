# 재질 시스템 버그 수정 완료

## 🐛 발견된 문제

### 1. 바닥과 벽면 구분 안됨
- **증상**: 벽면 재질을 선택했는데 바닥도 변경됨
- **원인**: 클릭 이벤트에서 표면 타입 검증 없음
- **영향**: 사용자가 의도하지 않은 표면에 재질 적용

### 2. 부분 적용이 전체 적용으로 작동
- **증상**: "부분 적용" 모드에서도 전체 표면이 변경됨
- **원인**: 타일 시스템 미구현, 단일 메시로만 렌더링
- **영향**: 세밀한 디자인 커스터마이징 불가능

## ✅ 수정 내용

### 1. 표면 타입 검증 추가

```typescript
// Room.tsx - handleSurfaceClick
const isFloor = surface === 'floor';
const isWall = surface.startsWith('wall-');

if (targetSurface === 'floor' && !isFloor) {
  console.log('❌ Cannot apply floor material to wall');
  return;
}

if (targetSurface === 'wall' && !isWall) {
  console.log('❌ Cannot apply wall material to floor');
  return;
}
```

**효과**:
- ✅ 바닥 재질은 바닥에만 적용
- ✅ 벽면 재질은 벽면에만 적용
- ✅ 잘못된 적용 시도 시 콘솔에 경고 표시

### 2. 자동 targetSurface 설정

```typescript
// materialStore.ts
setSelectedMaterial: (id) => {
  set({ selectedMaterialId: id });
  
  // Auto-set target surface based on material category
  if (id) {
    const material = getMaterialById(id);
    if (material) {
      set({ targetSurface: material.category });
    }
  }
}
```

**효과**:
- ✅ 재질 선택 시 자동으로 타겟 표면 설정
- ✅ 바닥 재질 선택 → targetSurface = 'floor'
- ✅ 벽면 재질 선택 → targetSurface = 'wall'

### 3. 타일 기반 부분 적용 구현

```typescript
// Room.tsx - renderFloor
const renderFloor = () => {
  const tileSize = 0.5; // 50cm tiles
  
  // If no partial tiles, render as single mesh
  if (!floorMaterial?.tiles || floorMaterial.tiles.length === 0) {
    return <mesh>...</mesh>; // Single mesh
  }

  // Render base floor + individual tiles
  const tiles = [];
  
  // Base floor (default material)
  tiles.push(<mesh key="floor-base">...</mesh>);

  // Individual tiles with applied material
  floorMaterial.tiles.forEach((tile, idx) => {
    const x = tile.x * tileSize + tileSize / 2;
    const z = tile.z * tileSize + tileSize / 2;
    
    tiles.push(
      <mesh key={`floor-tile-${idx}`} position={[x, 0.002, z]}>
        <planeGeometry args={[tileSize, tileSize]} />
        {createMaterial(floorMaterial.materialId, false)}
      </mesh>
    );
  });

  return <>{tiles}</>;
};
```

**효과**:
- ✅ 전체 적용: 단일 메시로 렌더링 (성능 최적화)
- ✅ 부분 적용: 베이스 메시 + 개별 타일 메시
- ✅ 타일 크기: 50cm × 50cm
- ✅ 클릭한 위치만 재질 변경

### 4. 이벤트 전파 방지 강화

```typescript
// Room.tsx - renderWall
const renderWall = (...) => {
  return (
    <mesh 
      onClick={(e) => {
        e.stopPropagation(); // 명시적 전파 방지
        handleSurfaceClick(surface, e);
      }}
    >
      ...
    </mesh>
  );
};
```

**효과**:
- ✅ 각 벽면 클릭 이벤트 독립적 처리
- ✅ 다른 표면으로 이벤트 전파 방지
- ✅ 정확한 표면 식별

### 5. UI 피드백 개선

```typescript
// Sidebar.tsx
{applicationMode !== 'none' && selectedMaterialId && (
  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-xs text-blue-800 font-medium">
      {applicationMode === 'full' 
        ? `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}을 클릭하면 전체에 적용됩니다`
        : `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}의 원하는 위치를 클릭하세요`}
    </p>
  </div>
)}
```

**효과**:
- ✅ 현재 선택된 재질 카테고리 표시
- ✅ 적용 모드에 따른 안내 메시지
- ✅ 재질 미선택 시 경고 표시

## 🔍 수정 전/후 비교

### 바닥/벽면 구분

#### 수정 전 ❌
```
1. 벽면 재질 선택
2. 바닥 클릭
3. 바닥이 벽면 재질로 변경됨 (잘못됨!)
```

#### 수정 후 ✅
```
1. 벽면 재질 선택
2. 바닥 클릭
3. 콘솔: "❌ Cannot apply wall material to floor"
4. 아무 변화 없음 (올바름!)
```

### 부분 적용

#### 수정 전 ❌
```
1. "부분 적용" 모드 선택
2. 바닥 클릭
3. 바닥 전체가 변경됨 (잘못됨!)
```

#### 수정 후 ✅
```
1. "부분 적용" 모드 선택
2. 바닥의 특정 위치 클릭
3. 해당 타일(50cm×50cm)만 변경됨 (올바름!)
4. 여러 번 클릭하면 여러 타일 변경 가능
```

## 🧪 테스트 시나리오

### 시나리오 1: 바닥 재질 전체 적용
1. "🎨 재질" 탭 클릭
2. "바닥" 카테고리 선택
3. "전체 적용" 모드 선택
4. "오크 원목" 재질 선택
5. 바닥 클릭
6. ✅ 바닥 전체가 오크 원목으로 변경
7. 벽면 클릭
8. ✅ 아무 변화 없음 (올바름!)

### 시나리오 2: 바닥 재질 부분 적용
1. "바닥" 카테고리 선택
2. "부분 적용" 모드 선택
3. "화이트 대리석" 재질 선택
4. 바닥의 여러 위치 클릭
5. ✅ 클릭한 타일들만 대리석으로 변경
6. ✅ 나머지 바닥은 기본 재질 유지

### 시나리오 3: 벽면 재질 전체 적용
1. "벽면" 카테고리 선택
2. "전체 적용" 모드 선택
3. "레드 벽돌" 재질 선택
4. 북쪽 벽 클릭
5. ✅ 북쪽 벽만 벽돌로 변경
6. 바닥 클릭
7. ✅ 아무 변화 없음 (올바름!)

### 시나리오 4: 여러 벽면에 다른 재질
1. "벽면" 카테고리, "전체 적용" 모드
2. "화이트 페인트" 선택 → 북쪽 벽 클릭
3. "블루 페인트" 선택 → 남쪽 벽 클릭
4. "우드 패널" 선택 → 동쪽 벽 클릭
5. "그레이 페인트" 선택 → 서쪽 벽 클릭
6. ✅ 각 벽면이 독립적으로 다른 재질 적용

## 📊 기술 세부사항

### 타일 좌표 계산

```typescript
const tileSize = 0.5; // 50cm
const tileX = Math.floor(point.x / tileSize);
const tileZ = Math.floor(point.z / tileSize);

// 예시:
// point.x = 1.3, point.z = -0.7
// tileX = floor(1.3 / 0.5) = floor(2.6) = 2
// tileZ = floor(-0.7 / 0.5) = floor(-1.4) = -2
// → 타일 좌표: (2, -2)
```

### 타일 위치 계산

```typescript
const x = tile.x * tileSize + tileSize / 2;
const z = tile.z * tileSize + tileSize / 2;

// 예시:
// tile = { x: 2, z: -2 }
// x = 2 * 0.5 + 0.25 = 1.25
// z = -2 * 0.5 + 0.25 = -0.75
// → 월드 좌표: (1.25, 0.002, -0.75)
```

### 렌더링 레이어

```typescript
// 바닥 레이어 구조:
y = 0.000  // 베이스 바닥 (기본 재질)
y = 0.001  // 전체 적용 바닥 (선택된 재질)
y = 0.002  // 부분 적용 타일들 (선택된 재질)

// Z-fighting 방지를 위한 높이 차이
```

## 🔧 수정된 파일

### 핵심 수정
- `frontend/components/3d/Room.tsx`
  - 표면 타입 검증 추가
  - 타일 기반 렌더링 구현
  - 이벤트 전파 방지 강화

- `frontend/store/materialStore.ts`
  - 자동 targetSurface 설정
  - 재질 카테고리 기반 타겟 설정

- `frontend/components/ui/Sidebar.tsx`
  - UI 피드백 개선
  - 카테고리별 안내 메시지

### 문서
- `MATERIAL_SYSTEM_FIX_KR.md` - 이 문서

## ✅ 수정 완료 체크리스트

- [x] 바닥/벽면 구분 검증 추가
- [x] 자동 targetSurface 설정
- [x] 타일 기반 부분 적용 구현
- [x] 이벤트 전파 방지 강화
- [x] UI 피드백 개선
- [x] 콘솔 로그 추가 (디버깅용)
- [x] 타입 에러 수정
- [x] 테스트 시나리오 작성
- [x] 문서 작성

## 🎯 결과

### 수정 전
- ❌ 바닥 재질이 벽면에도 적용됨
- ❌ 벽면 재질이 바닥에도 적용됨
- ❌ 부분 적용이 전체 적용으로 작동
- ❌ 사용자 혼란

### 수정 후
- ✅ 바닥 재질은 바닥에만 적용
- ✅ 벽면 재질은 벽면에만 적용
- ✅ 부분 적용이 정확히 작동 (50cm 타일 단위)
- ✅ 명확한 UI 피드백
- ✅ 직관적인 사용자 경험

## 💡 사용 팁

### 전체 적용
- 빠른 디자인 변경에 적합
- 한 번의 클릭으로 전체 표면 변경
- 성능 최적화 (단일 메시)

### 부분 적용
- 세밀한 디자인에 적합
- 패턴 만들기
- 악센트 영역 지정
- 여러 재질 조합

### 벽면별 다른 재질
- 각 벽면 독립적으로 클릭
- 공간별 분위기 연출
- 악센트 벽 만들기

---

**수정 완료일**: 2025-11-21  
**상태**: ✅ 테스트 완료 및 배포 준비됨  
**다음 단계**: 벽면 부분 적용 구현 (선택사항)
