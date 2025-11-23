# 바닥/벽면 재질 시스템 구현 완료

## 🎯 구현 기능

### 1. 재질 카탈로그
- **바닥 재질** (9종)
  - 오크 원목, 월넛 원목
  - 화이트/블랙 대리석
  - 베이지/그레이 세라믹
  - 콘크리트
  - 그레이/베이지 카펫

- **벽면 재질** (8종)
  - 화이트/베이지/그레이/블루 페인트
  - 스트라이프 벽지
  - 레드/화이트 벽돌
  - 우드 패널

### 2. 적용 모드

#### 전체 적용 (Full Application)
- 바닥 또는 벽면 전체에 재질 일괄 적용
- 한 번의 클릭으로 전체 표면 변경
- 빠른 디자인 변경에 적합

#### 부분 적용 (Partial Application)
- 클릭한 타일/영역만 재질 적용
- 패턴이나 부분 디자인 가능
- 세밀한 커스터마이징에 적합

### 3. 벽면 투명도
- 벽면은 **20% 불투명도** (80% 투명)
- 외부에서 내부를 볼 수 있음
- 재질 디자인이 살짝 보이는 정도

## 📁 새로 생성된 파일

### 타입 정의
- `frontend/types/material.ts` - 재질 타입 정의

### 상태 관리
- `frontend/store/materialStore.ts` - 재질 선택 및 적용 상태 관리

### 데이터
- `frontend/data/materialCatalog.ts` - 재질 카탈로그 (17종)

### 컴포넌트 수정
- `frontend/components/3d/Room.tsx` - 재질 적용 및 클릭 이벤트
- `frontend/components/ui/Sidebar.tsx` - 재질 선택 UI 추가

## 🎨 사용 방법

### 1. 재질 탭 열기
```
사이드바 상단의 "🎨 재질" 탭 클릭
```

### 2. 카테고리 선택
```
"바닥" 또는 "벽면" 버튼 클릭
```

### 3. 적용 모드 선택
```
"전체 적용" - 한 번에 전체 표면 변경
"부분 적용" - 클릭한 부분만 변경
```

### 4. 재질 선택
```
원하는 재질 카드 클릭 (파란색 테두리로 선택 표시)
```

### 5. 적용
```
전체 적용: 바닥이나 벽면 클릭 → 전체 변경
부분 적용: 원하는 위치 클릭 → 해당 타일만 변경
```

## 🔧 기술 구현

### 재질 시스템 아키텍처

```typescript
// 1. 재질 정의
interface MaterialTexture {
  id: string;
  name: string;
  category: 'floor' | 'wall';
  color: string;
  roughness: number;
  metalness: number;
  repeat: [number, number];
}

// 2. 적용된 재질
interface AppliedMaterial {
  surface: 'floor' | 'wall-north' | 'wall-south' | 'wall-east' | 'wall-west';
  materialId: string;
  tiles?: Array<{ x: number; z: number }>; // 부분 적용용
}

// 3. 상태 관리
- selectedMaterialId: 현재 선택된 재질
- applicationMode: 'none' | 'full' | 'partial'
- appliedMaterials: 각 표면에 적용된 재질 목록
```

### 클릭 이벤트 처리

```typescript
// Room 컴포넌트에서
const handleSurfaceClick = (surface, event) => {
  if (applicationMode === 'full') {
    // 전체 적용
    applyMaterialFull(surface, selectedMaterialId);
  } else if (applicationMode === 'partial') {
    // 부분 적용 - 타일 좌표 계산
    const tileX = Math.floor(point.x / tileSize);
    const tileZ = Math.floor(point.z / tileSize);
    applyMaterialPartial(surface, selectedMaterialId, { x: tileX, z: tileZ });
  }
};
```

### 재질 렌더링

```typescript
// Three.js 머티리얼 생성
<meshStandardMaterial 
  color={material.color}
  roughness={material.roughness}
  metalness={material.metalness}
  transparent={isWall}
  opacity={isWall ? 0.2 : 1}  // 벽면은 20% 불투명
  side={isWall ? THREE.DoubleSide : THREE.FrontSide}
/>
```

## 🎯 주요 특징

### 1. 직관적인 UI
- 탭 기반 인터페이스 (가구 / 재질)
- 카테고리별 필터링 (바닥 / 벽면)
- 시각적 재질 미리보기 (색상 배경)
- 선택 상태 표시 (파란색 테두리)

### 2. 유연한 적용 방식
- **전체 적용**: 빠른 디자인 변경
- **부분 적용**: 세밀한 커스터마이징
- 실시간 적용 및 미리보기

### 3. 벽면 투명도
- 외부에서 내부 확인 가능
- 재질 디자인 살짝 보임
- 공간감 유지

### 4. 다양한 재질
- 17종의 프리셋 재질
- 바닥: 원목, 대리석, 세라믹, 콘크리트, 카펫
- 벽면: 페인트, 벽지, 벽돌, 우드 패널

## 📊 재질 속성

### 물리 기반 렌더링 (PBR)
```typescript
{
  color: '#DEB887',      // 기본 색상
  roughness: 0.8,        // 거칠기 (0=매끄러움, 1=거침)
  metalness: 0.1,        // 금속성 (0=비금속, 1=금속)
  repeat: [4, 4],        // 텍스처 반복 (향후 확장)
}
```

### 재질별 특성
- **원목**: 높은 거칠기, 낮은 금속성 → 자연스러운 질감
- **대리석**: 낮은 거칠기, 중간 금속성 → 광택 효과
- **카펫**: 최대 거칠기, 금속성 없음 → 부드러운 질감
- **벽돌**: 높은 거칠기 → 거친 표면

## 🚀 향후 확장 가능 사항

### 1. 실제 텍스처 이미지
```typescript
// 현재: 색상 기반
color: '#DEB887'

// 향후: 실제 이미지 텍스처
textureUrl: '/textures/wood-oak.jpg'
normalMapUrl: '/textures/wood-oak-normal.jpg'
```

### 2. 텍스처 반복 조정
```typescript
// UV 매핑으로 타일 크기 조정
repeat: [4, 4]  // 4x4 반복
```

### 3. 커스텀 재질 업로드
- 사용자가 직접 이미지 업로드
- 커스텀 색상 선택
- 재질 속성 조정 (거칠기, 금속성)

### 4. 재질 라이브러리 확장
- 더 많은 프리셋 재질
- 카테고리 세분화 (모던, 클래식, 미니멀 등)
- 시즌별 테마 재질

### 5. 패턴 디자인
- 부분 적용으로 패턴 생성
- 패턴 템플릿 제공
- 패턴 저장 및 불러오기

## 🧪 테스트 시나리오

### 시나리오 1: 바닥 전체 적용
1. "🎨 재질" 탭 클릭
2. "바닥" 카테고리 선택
3. "전체 적용" 모드 선택
4. "오크 원목" 재질 선택
5. 바닥 클릭
6. ✅ 바닥 전체가 오크 원목으로 변경됨

### 시나리오 2: 벽면 부분 적용
1. "🎨 재질" 탭 클릭
2. "벽면" 카테고리 선택
3. "부분 적용" 모드 선택
4. "레드 벽돌" 재질 선택
5. 벽면의 원하는 위치 여러 번 클릭
6. ✅ 클릭한 부분만 벽돌로 변경됨
7. ✅ 벽면이 투명해서 내부가 보임

### 시나리오 3: 여러 벽면에 다른 재질
1. "전체 적용" 모드 선택
2. "화이트 페인트" 선택 → 북쪽 벽 클릭
3. "블루 페인트" 선택 → 남쪽 벽 클릭
4. "우드 패널" 선택 → 동쪽 벽 클릭
5. ✅ 각 벽면이 다른 재질로 표현됨

### 시나리오 4: 재질 변경
1. 이미 적용된 바닥에 다른 재질 선택
2. 바닥 클릭
3. ✅ 기존 재질이 새 재질로 교체됨

## 💡 사용 팁

### 전체 적용 활용
- 빠른 프로토타이핑
- 전체적인 분위기 확인
- 여러 옵션 빠르게 비교

### 부분 적용 활용
- 악센트 벽 만들기
- 바닥 패턴 디자인
- 구역별 다른 재질 적용

### 벽면 투명도 활용
- 외부에서 내부 레이아웃 확인
- 벽면 재질 미리보기
- 공간감 유지하며 디자인

## 🎨 디자인 예시

### 모던 스타일
```
바닥: 콘크리트
벽면: 화이트 페인트
악센트: 우드 패널 (한 면)
```

### 클래식 스타일
```
바닥: 오크 원목
벽면: 베이지 페인트
악센트: 레드 벽돌 (부분)
```

### 미니멀 스타일
```
바닥: 화이트 대리석
벽면: 화이트 페인트
악센트: 없음
```

### 인더스트리얼 스타일
```
바닥: 콘크리트
벽면: 레드 벽돌
악센트: 우드 패널
```

## ✅ 완료 체크리스트

- [x] 재질 타입 정의
- [x] 재질 상태 관리 (Zustand)
- [x] 재질 카탈로그 (17종)
- [x] 바닥 재질 적용
- [x] 벽면 재질 적용
- [x] 전체 적용 모드
- [x] 부분 적용 모드
- [x] 벽면 투명도 (20%)
- [x] 재질 선택 UI
- [x] 탭 기반 인터페이스
- [x] 카테고리 필터링
- [x] 시각적 미리보기
- [x] 클릭 이벤트 처리
- [x] 문서 작성

## 📖 관련 파일

### 핵심 파일
- `types/material.ts` - 타입 정의
- `store/materialStore.ts` - 상태 관리
- `data/materialCatalog.ts` - 재질 데이터
- `components/3d/Room.tsx` - 재질 렌더링
- `components/ui/Sidebar.tsx` - UI

### 문서
- `MATERIAL_SYSTEM_COMPLETE_KR.md` - 이 문서

---

**구현 완료일**: 2025-11-21  
**상태**: ✅ 완료 및 테스트 준비됨  
**다음 단계**: 실제 텍스처 이미지 추가, 커스텀 재질 업로드 기능
