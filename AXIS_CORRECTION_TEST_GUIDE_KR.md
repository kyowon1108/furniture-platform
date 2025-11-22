# 축 방향 자동 보정 테스트 가이드

## 🎯 테스트 목적
GLB/PLY 파일 업로드 시 축이 뒤틀려서 천장이 옆면으로 표현되는 문제가 해결되었는지 확인

## 🔧 준비 사항

### 1. 백엔드 실행
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm run dev
```

### 3. 브라우저 개발자 도구 열기
- Chrome/Edge: F12 또는 Ctrl+Shift+I (Mac: Cmd+Option+I)
- Console 탭 열기

## 📋 테스트 시나리오

### 시나리오 1: Blender에서 내보낸 GLB 파일 (Z-up)

#### 테스트 파일 준비
Blender에서 간단한 방 모델 생성:
1. Blender 열기
2. 기본 큐브 삭제
3. Add → Mesh → Cube (바닥)
4. Add → Mesh → Cube (천장) - Z축으로 위로 이동
5. File → Export → glTF 2.0 (.glb)
6. Export GLB 클릭

#### 테스트 절차
1. 프로젝트 생성 또는 기존 프로젝트 열기
2. GLB 파일 업로드
3. 에디터에서 모델 확인

#### 예상 결과
```
✅ 천장이 위쪽에 올바르게 표현됨
✅ 바닥이 아래쪽에 올바르게 표현됨
✅ 모델이 서있는 상태로 표시됨
```

#### 콘솔 로그 확인
```
🔍 Detecting axis orientation from bounding box: { x: 4.00, y: 0.50, z: 4.00 }
Aspect ratios: { X/Y: 8.00, X/Z: 1.00, Y/Z: 0.13 }
✅ Detected: Z-up (Z is tallest)
🔄 Applying axis correction: { detected: 'Z-up', forced: 'auto' }
Applied axis correction: Z-up
After rotation: { size: Vector3 {...}, center: Vector3 {...} }
```

### 시나리오 2: 3D 스캔 PLY 파일

#### 테스트 파일
- 실제 방을 3D 스캔한 PLY 파일
- 또는 온라인에서 다운로드한 샘플 PLY 파일

#### 테스트 절차
1. 프로젝트 생성 또는 기존 프로젝트 열기
2. PLY 파일 업로드
3. 에디터에서 모델 확인

#### 예상 결과
```
✅ 포인트 클라우드 또는 메시가 올바른 방향으로 표시됨
✅ 천장이 위, 바닥이 아래
✅ 벽이 수직으로 서있음
```

#### 콘솔 로그 확인
```
🔍 Detecting axis orientation from bounding box: { x: 5.20, y: 2.80, z: 4.10 }
✅ Detected: Z-up (Z is tallest)
🔄 Applying axis correction to geometry: { detected: 'Z-up', forced: 'auto' }
Applied axis correction to PLY geometry: Z-up
After rotation: { size: Vector3 {...}, center: Vector3 {...} }
```

### 시나리오 3: 이미 Y-up인 파일

#### 테스트 목적
이미 올바른 축 방향인 파일이 불필요하게 회전되지 않는지 확인

#### 테스트 절차
1. Three.js 또는 Y-up 기준으로 만들어진 GLB/PLY 파일 업로드
2. 모델 확인

#### 예상 결과
```
✅ 모델이 그대로 올바르게 표시됨
✅ 불필요한 회전이 적용되지 않음
```

#### 콘솔 로그 확인
```
✅ Detected: Y-up (Y is tallest)
🔄 Applying axis correction: { detected: 'Y-up', forced: 'auto' }
Applied axis correction: Y-up
(회전 없음 - Euler(0, 0, 0))
```

### 시나리오 4: 정육면체 (대칭 모델)

#### 테스트 목적
축 감지가 어려운 대칭 모델 처리 확인

#### 테스트 절차
1. 정육면체 또는 구 형태의 GLB/PLY 파일 업로드
2. 모델 확인

#### 예상 결과
```
✅ 기본값(Z-up)으로 처리됨
✅ 모델이 합리적으로 표시됨
```

#### 콘솔 로그 확인
```
⚠️ Could not determine orientation, defaulting to Z-up
🔄 Applying axis correction: { detected: 'Z-up', forced: 'auto' }
```

## 🐛 문제 해결

### 문제 1: 모델이 여전히 누워있음

**원인**: 파일이 특이한 축 방향을 사용하거나 감지 실패

**해결**:
1. 콘솔 로그에서 감지된 축 확인
2. 바운딩 박스 크기 확인
3. 필요시 소스 파일의 축 방향 확인

### 문제 2: 모델이 거꾸로 표시됨

**원인**: 음수 스케일 또는 특이한 변환

**해결**:
1. 원본 파일을 3D 소프트웨어에서 확인
2. Export 설정에서 "Apply Transform" 옵션 활성화
3. 재업로드

### 문제 3: 콘솔에 에러 표시

**원인**: 파일 형식 문제 또는 손상된 파일

**해결**:
1. 파일이 유효한 GLB/PLY 형식인지 확인
2. 파일 크기 확인 (너무 크지 않은지)
3. 다른 파일로 테스트

## 📊 테스트 체크리스트

### GLB 파일
- [ ] Blender Z-up GLB 파일 올바르게 표시됨
- [ ] SketchUp Z-up GLB 파일 올바르게 표시됨
- [ ] Y-up GLB 파일 그대로 표시됨
- [ ] 천장이 위쪽에 표시됨
- [ ] 바닥이 아래쪽에 표시됨
- [ ] 투명도 70% 적용됨
- [ ] 1.5배 스케일 적용됨

### PLY 파일
- [ ] 3D 스캔 PLY 파일 올바르게 표시됨
- [ ] 포인트 클라우드 PLY 올바르게 표시됨
- [ ] 메시 PLY 올바르게 표시됨
- [ ] 천장이 위쪽에 표시됨
- [ ] 바닥이 아래쪽에 표시됨
- [ ] 색상이 올바르게 표시됨
- [ ] 투명도 70% 적용됨

### 콘솔 로그
- [ ] 축 방향 감지 로그 출력됨
- [ ] 바운딩 박스 정보 출력됨
- [ ] 회전 적용 로그 출력됨
- [ ] 회전 후 크기 정보 출력됨
- [ ] 에러 없음

## 🎓 이해하기

### 왜 축 변환이 필요한가?

3D 소프트웨어마다 다른 좌표계를 사용합니다:

```
Blender/SketchUp (Z-up):     Three.js (Y-up):
      Z (위)                       Y (위)
      |                            |
      |_____ X                     |_____ X
     /                            /
    Y                            Z
```

### 변환 과정

```
1. 원본 모델 로드
   ┌─────┐
   │  ▓  │ ← 천장 (Z축 위)
   │     │
   └─────┘ ← 바닥

2. 축 방향 감지
   "Z축이 가장 길다 → Z-up!"

3. X축 기준 -90도 회전
   ┌─────┐
   │     │ ← 천장 (Y축 위)
   │  ▓  │
   └─────┘ ← 바닥

4. 중심 재정렬 및 렌더링
   ✅ 올바른 방향!
```

## 📝 테스트 결과 기록

### 테스트 일시
- 날짜: _______________
- 테스터: _______________

### 테스트 환경
- OS: _______________
- 브라우저: _______________
- 화면 해상도: _______________

### 테스트 파일
1. 파일명: _______________
   - 형식: GLB / PLY
   - 소스: _______________
   - 결과: 성공 / 실패
   - 비고: _______________

2. 파일명: _______________
   - 형식: GLB / PLY
   - 소스: _______________
   - 결과: 성공 / 실패
   - 비고: _______________

### 발견된 문제
1. _______________
2. _______________
3. _______________

### 전체 평가
- [ ] 모든 테스트 통과
- [ ] 일부 문제 발견
- [ ] 추가 수정 필요

## 🚀 다음 단계

테스트 완료 후:
1. ✅ 모든 테스트 통과 → 프로덕션 배포 준비
2. ⚠️ 일부 문제 발견 → 이슈 리포트 작성
3. ❌ 주요 문제 발견 → 개발팀에 피드백

## 📞 지원

문제가 발생하면:
1. 콘솔 로그 스크린샷 캡처
2. 테스트 파일 보관
3. 재현 단계 기록
4. 개발팀에 전달
