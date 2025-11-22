# 🎨 Gaussian Splatting PLY 색상 문제 해결

## 📅 작업 일자
2024년 11월 21일

## 🎯 문제 발견

### PLY 파일 형식
PLY 파일이 **3D Gaussian Splatting** 형식입니다!

**속성 목록**:
- `x, y, z` - 위치
- `nx, ny, nz` - 법선
- `f_dc_0, f_dc_1, f_dc_2` - **색상 (Spherical Harmonics DC 계수)**
- `f_rest_0 ~ f_rest_44` - 추가 SH 계수
- `opacity, scale_0~2, rot_0~3` - Gaussian 속성

### 핵심 발견
- ❌ 전통적인 `red, green, blue` 속성 없음
- ✅ `f_dc_0, f_dc_1, f_dc_2`가 색상 정보
- 이것은 Spherical Harmonics (SH) 계수로 인코딩된 색상

## 🔧 해결 방법

### SH DC 계수를 RGB로 변환

```typescript
// SH_C0 상수
const SH_C0 = 0.28209479177387814;

// 각 vertex에 대해
const dc0 = f_dc_0[i];
const dc1 = f_dc_1[i];
const dc2 = f_dc_2[i];

// SH를 RGB로 변환
const r = 0.5 + SH_C0 * dc0;
const g = 0.5 + SH_C0 * dc1;
const b = 0.5 + SH_C0 * dc2;

// [0, 1] 범위로 클램프
colors[i*3] = Math.max(0, Math.min(1, r));
colors[i*3+1] = Math.max(0, Math.min(1, g));
colors[i*3+2] = Math.max(0, Math.min(1, b));
```

