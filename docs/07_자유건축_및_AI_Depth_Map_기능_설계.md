# 자유 건축 및 AI 기반 Depth Map 활용 기능 설계서

## 1. 개요

### 1.1 배경
현재의 템플릿 기반 방 생성 방식에서 벗어나, 사용자가 직접 바닥과 벽 타일을 배치하여 자유로운 방 구조를 만들 수 있도록 지원합니다. 또한, AI 기반 Depth Estimation 기술을 도입하여 실제와 같은 입체적인 인테리어 시뮬레이션 경험을 제공합니다.

### 1.2 목표
- 사용자에게 방 구조에 대한 완전한 자유도 제공
- AI 기반 Depth Estimation으로 입체적 재질 시뮬레이션
- 기존 서비스 고도화 및 차별성 확보

---

## 2. 기술 리서치 결과

### 2.1 Depth Estimation 모델 비교

#### 2.1.1 MiDaS
- **개발**: Intel ISL
- **특징**: 2019년 출시 이후 지속적 개선, Robust한 zero-shot cross-dataset transfer
- **장점**: 상대적 깊이 추정에 강함, 안정적인 성능
- **단점**: 절대적 깊이(metric depth) 추정 불가
- **버전 히스토리**:
  - v2.1 (2020): v2.0 대비 10% 정확도 향상
  - v3.0 (2021): v2.1 대비 20% 정확도 향상
  - v3.1 (2022): v3.0 대비 28% 정확도 향상
- **참고**: [MiDaS GitHub](https://github.com/isl-org/MiDaS)

#### 2.1.2 ZoeDepth
- **특징**: MiDaS 백본 + adaptive metric binning module
- **장점**: 절대적 깊이(metric depth) 추정 가능
- **단점**: Edge sharpness가 다소 떨어짐 (edge width ~16px vs GT 0.3px)
- **참고**: [Survey on Monocular Metric Depth Estimation](https://arxiv.org/html/2501.11841v3)

#### 2.1.3 Depth Anything V2 (권장)
- **개발**: TikTok/ByteDance
- **특징**: 2024년 6월 출시, NeurIPS 2024 채택
- **성능**: ZoeDepth보다 우수한 성능 (MAE: 0.454m, correlation: 0.962)
- **모델 크기**:
  - Small: 24.8M parameters (~26MB quantized)
  - Base: 97M parameters
  - Large: 335M parameters
  - Giant: 1.3B parameters
- **라이선스**: Small은 Apache-2.0, 나머지는 CC-BY-NC-4.0
- **브라우저 실행 가능**: ONNX + WebAssembly/WebGPU 지원
- **참고**:
  - [Depth Anything V2 GitHub](https://github.com/DepthAnything/Depth-Anything-V2)
  - [DepthAnything-on-Browser](https://github.com/akbartus/DepthAnything-on-Browser)

#### 2.1.4 Gemini Pro Vision API
- **특징**: 멀티모달 이미지 이해, 분류, 객체 탐지 지원
- **제한사항**: Depth Map 생성 기능은 명시적으로 지원하지 않음
- **결론**: Depth 추정에는 전용 모델 사용 권장
- **참고**: [Gemini API Vision Docs](https://ai.google.dev/gemini-api/docs/vision)

### 2.2 권장 Depth Estimation 솔루션

**1순위: Depth Anything V2 (브라우저 실행)**
```javascript
// transformers.js를 사용한 브라우저 내 실행
import { pipeline } from '@huggingface/transformers';

const depthEstimator = await pipeline(
  'depth-estimation',
  'onnx-community/depth-anything-v2-small',
  { device: 'webgpu' } // 또는 'wasm' for CPU
);

const result = await depthEstimator(imageUrl);
```

**2순위: 백엔드 API (Python + FastAPI)**
```python
from transformers import pipeline
from PIL import Image

depth_estimator = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
result = depth_estimator(image)
```

---

### 2.3 Three.js Displacement Map 및 UV 매핑

#### 2.3.1 Displacement Map 기본 개념
- Displacement Map은 이미지의 픽셀 값을 사용하여 메쉬의 정점 위치를 실제로 변형
- 충분한 정점(vertices)이 있는 geometry 필요
- `displacementScale` 값으로 깊이 강도 조절

```javascript
const material = new THREE.MeshStandardMaterial({
  map: colorTexture,           // 색상 텍스처
  displacementMap: depthTexture, // Depth Map
  displacementScale: 0.1,      // 깊이 강도
  normalMap: normalTexture     // 더 나은 음영 표현 (선택)
});
```

#### 2.3.2 타일링/반복 텍스처 설정
```javascript
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(tilesX, tilesY);
```

#### 2.3.3 다중 타일 UV 매핑
여러 타일에 하나의 이미지를 적용할 때 UV 좌표 재계산 필요:
```javascript
// 전체 선택 영역의 바운딩 박스 계산
const boundingBox = calculateBoundingBox(selectedTiles);

// 각 타일의 상대적 UV 좌표 계산
selectedTiles.forEach(tile => {
  const uvs = tile.geometry.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    const u = (tile.position.x - boundingBox.min.x) / boundingBox.width;
    const v = (tile.position.z - boundingBox.min.z) / boundingBox.depth;
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;
});
```

#### 2.3.4 참고 자료
- [Three.js Displacement Map Tutorial](https://sbcode.net/threejs/displacmentmap/)
- [Advanced Texture Mapping in Three.js](https://medium.com/@sohail_saifi/advanced-texture-mapping-in-three-js-make-your-3d-models-stand-out-18577bb3322b)
- [Discover Three.js - Textures](https://discoverthreejs.com/book/first-steps/textures-intro/)

---

### 2.4 GLTFExporter 및 Geometry Baking

#### 2.4.1 핵심 제한사항
**glTF 포맷은 Displacement Map을 지원하지 않습니다.**

Displacement는 셰이더에서만 적용되며, GLTFExporter로 내보낼 때 변형된 geometry가 포함되지 않습니다.

#### 2.4.2 해결책: Geometry Baking

**방법 1: CPU 기반 정점 변형**
```javascript
function bakeDisplacement(geometry, displacementMap, scale) {
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  const normals = geometry.attributes.normal;

  // Displacement map을 캔버스로 읽기
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = displacementMap.image.width;
  canvas.height = displacementMap.image.height;
  ctx.drawImage(displacementMap.image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);

    // UV로 픽셀 값 읽기
    const x = Math.floor(u * canvas.width);
    const y = Math.floor((1 - v) * canvas.height);
    const idx = (y * canvas.width + x) * 4;
    const displacement = imageData.data[idx] / 255; // 0-1 정규화

    // 노멀 방향으로 정점 이동
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    positions.setX(i, positions.getX(i) + nx * displacement * scale);
    positions.setY(i, positions.getY(i) + ny * displacement * scale);
    positions.setZ(i, positions.getZ(i) + nz * displacement * scale);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals(); // 노멀 재계산
}
```

**방법 2: 내보내기 전 Geometry 복제 및 Baking**
```javascript
async function exportWithBakedDisplacement(scene) {
  const clonedScene = scene.clone();

  clonedScene.traverse(obj => {
    if (obj.isMesh && obj.material.displacementMap) {
      // Geometry 복제 및 baking
      const bakedGeometry = obj.geometry.clone();
      bakeDisplacement(
        bakedGeometry,
        obj.material.displacementMap,
        obj.material.displacementScale
      );
      obj.geometry = bakedGeometry;

      // Displacement map 제거 (더 이상 필요 없음)
      obj.material.displacementMap = null;
      obj.material.displacementScale = 0;
    }
  });

  const exporter = new GLTFExporter();
  return exporter.parseAsync(clonedScene);
}
```

#### 2.4.3 참고 자료
- [glTF and displacement map - Three.js Forum](https://discourse.threejs.org/t/gltf-and-displacement-map/18967)
- [Get modified mesh displaced by displacementMap](https://stackoverflow.com/questions/46696561/get-modified-mesh-displaced-by-displacementmap-in-three-js)

---

### 2.5 자유 건축 모드 - 그리드 시스템

#### 2.5.1 구현 접근법

**GridHelper 기반 시각화**
```javascript
const gridHelper = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
scene.add(gridHelper);
```

**타일 배치 시스템**
```javascript
// 마우스 위치를 그리드 좌표로 변환
function getGridPosition(mouseEvent) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(groundPlane);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    return {
      x: Math.floor(point.x / TILE_SIZE) * TILE_SIZE,
      z: Math.floor(point.z / TILE_SIZE) * TILE_SIZE
    };
  }
}

// 타일 배치
function placeTile(type, position) {
  const geometry = type === 'floor'
    ? new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, 32, 32)
    : new THREE.PlaneGeometry(TILE_SIZE, WALL_HEIGHT, 32, 32);

  const material = new THREE.MeshStandardMaterial({ /* ... */ });
  const tile = new THREE.Mesh(geometry, material);

  tile.position.set(position.x, type === 'wall' ? WALL_HEIGHT/2 : 0, position.z);
  if (type === 'floor') tile.rotation.x = -Math.PI / 2;

  return tile;
}
```

#### 2.5.2 상태 관리 (Zustand 예시)
```javascript
import { create } from 'zustand';

const useBuildingStore = create((set, get) => ({
  tiles: [],
  selectedTiles: [],

  addTile: (tile) => set(state => ({ tiles: [...state.tiles, tile] })),
  removeTile: (id) => set(state => ({ tiles: state.tiles.filter(t => t.id !== id) })),
  selectTile: (id) => set(state => ({ selectedTiles: [...state.selectedTiles, id] })),
  clearSelection: () => set({ selectedTiles: [] }),
}));
```

#### 2.5.3 참고 자료
- [von-grid - Hexagonal & Square tile grid system](https://github.com/vonWolfehaus/von-grid)
- [Triplex - Visual Editor for React Three Fiber](https://triplex.dev/)

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Three.js)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 자유 건축   │  │ 다중 타일   │  │ 3D 뷰어                 │  │
│  │ 도구 UI     │  │ 선택 도구   │  │ (Displacement Map 적용) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│           │              │                    │                  │
│           ▼              ▼                    ▼                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Zustand 상태 관리                            │   │
│  │   (tiles, selectedTiles, materials, buildMode)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────────┐
│ 브라우저 내 Depth    │              │ Backend (FastAPI)       │
│ Estimation          │              │                         │
│ (transformers.js)   │              │ /api/generate-depth     │
│                     │              │ - Depth Anything V2     │
│ - WebGPU/WASM       │              │ - 이미지 저장 (S3)      │
│ - Small 모델 (26MB) │              │                         │
└─────────────────────┘              └─────────────────────────┘
```

---

## 4. 구현 로드맵

### Phase 1: 자유 건축 모드 구현
1. **UI 변경**: '새 프로젝트' 모달에 '빈 방에서 시작하기' 옵션 추가
2. **건축 도구 UI**: 바닥/벽 타일 배치, 지우개 도구 툴바
3. **그리드 인터랙션**: 클릭으로 타일 생성, 벽 자동 생성 로직
4. **상태 관리**: Zustand로 타일 데이터 관리

### Phase 2: AI Depth Map 생성
1. **프론트엔드 옵션**: 브라우저 내 Depth Anything V2 실행 (transformers.js)
2. **백엔드 옵션**: FastAPI + Depth Anything V2 API 엔드포인트
3. **이미지 저장**: Color + Depth 이미지 S3 저장

### Phase 3: 입체 재질 적용
1. **다중 타일 선택**: Shift+클릭 또는 드래그로 인접 벽 타일 선택
2. **UV 매핑**: 선택 영역에 맞춰 UV 좌표 재계산
3. **Displacement 적용**: MeshStandardMaterial에 displacementMap 적용
4. **조절 UI**: displacementScale 슬라이더

### Phase 4: GLB 내보내기 고도화
1. **Geometry Baking**: 내보내기 전 displacement를 실제 geometry로 변환
2. **호환성 테스트**: Blender, Unity, Unreal Engine에서 결과 확인

---

## 5. 기술적 위험 및 대응

| 위험 | 영향도 | 대응 방안 |
|------|--------|-----------|
| 브라우저 Depth 모델 성능 | 높음 | WebGPU 우선 사용, 폴백으로 백엔드 API |
| 다중 타일 UV 매핑 오류 | 중간 | 바운딩 박스 기반 정밀 UV 계산 알고리즘 |
| GLB Displacement 미지원 | 높음 | Geometry Baking으로 해결 |
| 메모리 사용량 증가 | 중간 | 타일 수 제한, LOD 적용 고려 |

---

## 6. 참고 자료

### Depth Estimation
- [MiDaS GitHub](https://github.com/isl-org/MiDaS)
- [Depth Anything V2 GitHub](https://github.com/DepthAnything/Depth-Anything-V2)
- [DepthAnything-on-Browser](https://github.com/akbartus/DepthAnything-on-Browser)
- [State of the Art Depth Estimation](https://medium.com/@patriciogv/the-state-of-the-art-of-depth-estimation-from-single-images-9e245d51a315)

### Three.js
- [Three.js Displacement Map](https://sbcode.net/threejs/displacmentmap/)
- [React Three Fiber Displacement Map](https://sbcode.net/react-three-fiber/displacement-map/)
- [Advanced Texture Mapping](https://medium.com/@sohail_saifi/advanced-texture-mapping-in-three-js-make-your-3d-models-stand-out-18577bb3322b)
- [Discover Three.js - Textures](https://discoverthreejs.com/book/first-steps/textures-intro/)

### glTF Export
- [glTF Displacement Map Discussion](https://discourse.threejs.org/t/gltf-and-displacement-map/18967)
- [Stack Overflow - Baking Displacement](https://stackoverflow.com/questions/46696561/get-modified-mesh-displaced-by-displacementmap-in-three-js)

### Grid Systems
- [von-grid](https://github.com/vonWolfehaus/von-grid)
- [Triplex Editor](https://triplex.dev/)

---

## 7. 현재 코드베이스 분석

### 7.1 기술 스택

**Frontend:**
- Next.js 14 (React 18) + TypeScript
- React Three Fiber (R3F) + Three.js r160
- Zustand 4.4.7 (상태 관리)
- Tailwind CSS
- Socket.IO Client

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM (SQLite/PostgreSQL)
- AWS Bedrock (AI 기능용)
- trimesh, plyfile (3D 처리)

### 7.2 핵심 파일 구조

```
/frontend
├── /components/3d
│   ├── Scene.tsx          # 메인 3D 캔버스 (충돌 감지, 변환 컨트롤)
│   ├── Room.tsx           # 타일 기반 방 렌더링 (0.5m 타일)
│   └── Furniture.tsx      # 가구 렌더링 및 GLB 로딩
├── /components/room-builder
│   ├── RoomScene.tsx      # 타일 기반 방 미리보기
│   ├── RoomBuilderSimple.tsx  # 방 생성 UI
│   └── types.ts           # 타일/방 타입 정의
├── /store
│   ├── editorStore.ts     # 에디터 상태 (Zustand)
│   └── materialStore.ts   # 재질 적용 상태
└── /types
    └── furniture.ts       # FurnitureItem 타입

/backend
├── /app/api/v1
│   ├── room_builder.py    # 방 생성 API (Bedrock 연동)
│   └── files_3d.py        # PLY/GLB 업로드
├── /app/utils
│   ├── glb_utils.py       # GLB 차원 추출
│   └── ply_converter.py   # PLY 포맷 처리
└── /app/models
    ├── project.py         # 프로젝트 DB 모델
    └── layout.py          # 레이아웃 DB 모델
```

### 7.3 현재 방 생성 흐름

1. 사용자가 템플릿 또는 커스텀 치수 선택
2. RoomScene.tsx에서 타일 기반 방 미리보기 표시
3. 타일별 텍스처 적용 가능
4. GLB로 내보내기
5. 백엔드에서 GLB 차원 추출 후 프로젝트 업데이트

### 7.4 확장 포인트

| 기능 | 수정 대상 파일 | 설명 |
|------|---------------|------|
| 자유 건축 | RoomScene.tsx, Room.tsx, types.ts | 동적 타일 배치 UI 추가 |
| AI Depth Map | room_builder.py (새 엔드포인트) | Depth Anything V2 연동 |
| Displacement Map | Room.tsx, materialStore.ts | Three.js displacement 지원 |
| GLB 내보내기 | RoomBuilderComplete.tsx | Geometry Baking 구현 |

### 7.5 기존 강점

- **타일 기반 시스템**: RoomScene.tsx에 이미 타일 클릭 기능 존재
- **충돌 감지**: Scene.tsx에 회전된 바운딩 박스 계산 포함
- **Zustand 상태 관리**: 확장 용이한 구조
- **GLB 지원**: 적절한 스케일링 및 차원 추출 구현됨
- **AWS Bedrock 연동**: room_builder.py에 기초 코드 존재
