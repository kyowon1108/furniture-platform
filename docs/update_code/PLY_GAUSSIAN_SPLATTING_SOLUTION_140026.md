# 🎯 Gaussian Splatting PLY 색상 문제 - 최종 진단

## 📅 작업 일자
2024년 11월 21일

## 🔍 근본 원인 발견

### Three.js PLYLoader의 제한사항
**Three.js PLYLoader는 표준 속성만 로드합니다:**
- ✅ `position` (x, y, z)
- ✅ `normal` (nx, ny, nz)
- ✅ `color` (red, green, blue 또는 r, g, b)
- ✅ `uv` (texture_u, texture_v)

**커스텀 속성은 로드하지 않습니다:**
- ❌ `f_dc_0, f_dc_1, f_dc_2` (Gaussian Splatting 색상)
- ❌ `f_rest_*` (추가 SH 계수)
- ❌ `opacity, scale_*, rot_*` (Gaussian 속성)

## 💡 해결 방법

### 방법 1: PLY 파일을 표준 RGB 형식으로 변환 (권장)

Python으로 Gaussian Splatting PLY를 표준 PLY로 변환:

```python
from plyfile import PlyData, PlyElement
import numpy as np

# Gaussian Splatting PLY 로드
ply = PlyData.read('gaussian_splatting.ply')
vertex = ply['vertex']

# SH DC 계수를 RGB로 변환
SH_C0 = 0.28209479177387814

rgb_colors = []
for v in vertex.data:
    # SH DC 계수 추출
    dc0 = v['f_dc_0']
    dc1 = v['f_dc_1']
    dc2 = v['f_dc_2']
    
    # RGB로 변환
    r = int(np.clip((0.5 + SH_C0 * dc0) * 255, 0, 255))
    g = int(np.clip((0.5 + SH_C0 * dc1) * 255, 0, 255))
    b = int(np.clip((0.5 + SH_C0 * dc2) * 255, 0, 255))
    
    rgb_colors.append((
        v['x'], v['y'], v['z'],
        v['nx'], v['ny'], v['nz'],
        r, g, b
    ))

# 새 PLY 생성
new_vertex = np.array(rgb_colors, dtype=[
    ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
    ('nx', 'f4'), ('ny', 'f4'), ('nz', 'f4'),
    ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')
])

new_ply = PlyData([PlyElement.describe(new_vertex, 'vertex')])
new_ply.write('standard_rgb.ply')
```

### 방법 2: 커스텀 PLY 파서 구현

Three.js에서 직접 PLY 파일을 파싱하여 커스텀 속성 추출 (복잡함)

### 방법 3: 백엔드에서 변환

업로드 시 자동으로 표준 RGB 형식으로 변환

## 📋 변환 스크립트

`convert_gaussian_to_rgb.py` 생성:
