# 가구 회전 시 벽 충돌 방지 - 최종 수정

## 문제 상황

가구를 배치한 상태에서 회전 모드(R)를 활성화하고 회전하면, 가구가 벽을 뚫고 들어가는 문제가 발생했습니다.

## 원인 분석

1. **회전 모드 감지 실패**
   - `transformMode === 'rotate'`일 때 경계 검사가 실행되지 않음
   - 회전 변경 감지 로직이 제대로 작동하지 않음

2. **경계 검사 실행 조건 문제**
   - `rotationChanged` 플래그에 의존하여 경계 검사 실행
   - 회전 모드일 때도 조건부로만 실행되어 누락 발생

3. **회전된 크기 계산 부정확**
   - 270도 회전 시 width와 depth가 바뀌어야 하는데 반영되지 않음
   - `getRotatedDimensions` 함수가 특정 각도를 제대로 처리하지 못함

## 해결 방법

### 1. 회전 모드에서 항상 경계 검사 실행

```typescript
if (isRotateMode) {
  // 회전 모드일 때는 조건 없이 항상 경계 검사 실행
  // 회전 변경 여부와 무관하게 현재 회전값으로 경계 검사
}
```

### 2. 회전된 크기 계산 개선

```typescript
function getRotatedDimensions(dimensions, rotationY) {
  // 90도/270도: width와 depth 교환
  // 0도/180도: 크기 유지
  // 기타 각도: 바운딩 박스 계산
}
```

### 3. 경계 검사 프로세스

1. **회전 모드 감지**: `transformMode === 'rotate'`
2. **X, Z 회전 고정**: Y축 회전만 허용
3. **회전된 크기 계산**: 현재 회전값으로 바운딩 박스 계산
4. **경계 검사**: 방 크기와 비교하여 초과 여부 확인
5. **충돌 검사**: 다른 가구와의 충돌 확인
6. **회전 차단**: 경계 초과 시 이전 회전값으로 복원 및 `return`

### 4. 저장 방지

```typescript
if (wouldExceedBounds || hasCollision) {
  obj.rotation.y = prevRotationRad; // 회전 되돌리기
  // ... 에러 메시지 표시
  return; // CRITICAL: 저장되지 않도록 early return
}
```

## 수정된 코드 구조

### 회전 모드 경계 검사 흐름

```
onObjectChange 호출
  ↓
회전 모드 확인 (transformMode === 'rotate')
  ↓
X, Z 회전 고정 (obj.rotation.x = 0, obj.rotation.z = 0)
  ↓
회전된 크기 계산 (getRotatedDimensions)
  ↓
경계 검사 (방 크기 vs 회전된 크기)
  ↓
충돌 검사 (다른 가구 vs 회전된 크기)
  ↓
경계 초과 또는 충돌?
  ├─ YES → 회전 되돌리기 + return (저장 안 됨)
  └─ NO  → 회전 유효, 저장 진행
```

## 테스트 방법

1. 브라우저에서 하드 리프레시 (Cmd+Shift+R 또는 Ctrl+Shift+R)
2. 가구를 배치한 상태에서 회전 모드(R) 활성화
3. 벽 근처에서 회전 시도
4. 브라우저 콘솔(F12)에서 다음 로그 확인:
   - `🔄 ROTATE MODE - Boundary Check` - 회전 모드 경계 검사 시작
   - `📐 Rotated dimensions check` - 회전된 크기 계산
   - `🔍 Boundary Check Result` - 경계 검사 결과
   - `❌ ROTATION BLOCKED - REVERTED` - 회전 차단 (벽 충돌)
   - `✅ ROTATION VALID - Proceeding to save` - 회전 성공

## 예상 결과

- ✅ 회전 모드에서 벽 근처 회전 시도: 경계 초과 시 회전 차단 및 에러 메시지
- ✅ 다른 가구 근처에서 회전 시도: 충돌 시 회전 차단 및 에러 메시지
- ✅ 충분한 공간에서 회전 시도: 정상 회전

## 주요 변경 사항

1. **회전 모드에서 항상 경계 검사**: 조건 없이 항상 실행
2. **회전된 크기 계산 정확도 향상**: 90/270도 회전 정확히 처리
3. **경계 검사 로직 강화**: 상세한 로그와 함께 검사
4. **저장 방지**: 경계 초과 시 `return`으로 저장 차단

## 디버깅 가이드

브라우저 콘솔에서 다음 로그를 확인하세요:

1. **회전 모드 진입**: `🔄 ROTATE MODE - Boundary Check`
2. **회전된 크기**: `rotatedDims`가 올바르게 계산되었는지 확인
3. **경계 검사 결과**: `wouldExceedBounds`가 `true`인지 확인
4. **회전 차단**: `❌ ROTATION BLOCKED - REVERTED` 로그 확인

## 추가 개선 사항

- 회전 모드에서 실시간 경계 검사
- 회전된 크기 계산 정확도 향상
- 상세한 디버그 로그 추가
- 경계 초과 시 즉시 회전 복원

