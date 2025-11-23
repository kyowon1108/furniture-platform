# 브라우저 콘솔에서 로그 확인 가이드

## 📍 콘솔 열기 방법

### 방법 1: 키보드 단축키
- **Mac**: `Cmd + Option + I` 또는 `F12`
- **Windows/Linux**: `Ctrl + Shift + I` 또는 `F12`

### 방법 2: 브라우저 메뉴
1. 브라우저 상단 메뉴에서 **개발자 도구** 또는 **Developer Tools** 클릭
2. 또는 페이지에서 **우클릭** → **검사(Inspect)** 선택

## 🔍 콘솔 탭 찾기

개발자 도구가 열리면:
1. 상단에 여러 탭이 있습니다: **Elements**, **Console**, **Network**, **Sources** 등
2. **Console** 탭을 클릭합니다
3. 여기서 모든 로그를 확인할 수 있습니다

## 📊 로그 필터링 방법

### 특정 로그만 보기
콘솔 상단의 필터 입력란에 다음을 입력:

- `🔄` - 회전 관련 로그만 보기
- `📐` - 크기 계산 로그만 보기
- `🔍` - 경계 검사 로그만 보기
- `❌` - 에러/차단 로그만 보기
- `✅` - 성공 로그만 보기
- `Scene.tsx` - Scene.tsx 파일의 로그만 보기

### 로그 레벨 필터
콘솔 상단의 아이콘을 클릭하여:
- **Errors only**: 에러만 보기
- **Warnings**: 경고만 보기
- **Info**: 정보 로그만 보기

## 🎯 주요 로그 설명

### 회전 관련 로그
```
🔄 onObjectChange: {...}
```
- **언제**: 가구를 이동하거나 회전할 때마다
- **위치**: Scene.tsx의 `onObjectChange` 함수
- **내용**: 현재 transformMode, 회전값, 위치 등

```
🔄 Rotation check: {...}
```
- **언제**: 회전이 변경되었거나 회전 모드일 때
- **위치**: Scene.tsx의 회전 경계 검사 부분
- **내용**: 회전 모드, 이전/현재 회전값

### 크기 계산 로그
```
📐 Rotated dimensions check: {...}
```
- **언제**: 회전된 크기를 계산할 때
- **위치**: Scene.tsx의 `getRotatedDimensions` 함수 호출 후
- **내용**: 원래 크기, 회전된 크기, halfWidth, halfDepth

```
📐 Translate mode - using dimensions: {...}
```
- **언제**: Translate 모드에서 경계 검사할 때
- **위치**: Scene.tsx의 translate 모드 경계 검사 부분
- **내용**: 회전 변경 여부, 원래/회전된 크기, 현재 회전값

### 경계 검사 로그
```
🔍 Room Boundary check: {...}
```
- **언제**: 방 경계를 검사할 때
- **위치**: Scene.tsx의 경계 검사 부분
- **내용**: 방 크기, 가구 위치, 경계 초과 여부

```
🔧 Correcting X position: {...}
```
- **언제**: 가구가 벽을 뚫었을 때 자동으로 수정할 때
- **위치**: Scene.tsx의 translate 모드 경계 수정 부분
- **내용**: 수정 전/후 위치, 침투량

### 회전 차단 로그
```
❌ Rotation blocked - REVERTED: {...}
```
- **언제**: 회전이 경계를 초과하여 차단되었을 때
- **위치**: Scene.tsx의 회전 경계 검사 부분
- **내용**: 경계 초과 여부, 충돌 여부, 되돌린 회전값

```
✅ Rotation valid: {...}
```
- **언제**: 회전이 성공적으로 허용되었을 때
- **위치**: Scene.tsx의 회전 경계 검사 부분
- **내용**: 회전값, 회전된 크기, 위치

## 🐛 문제 해결 시 확인할 로그

### 가구가 벽을 뚫는 경우
1. `🔄 onObjectChange` - transformMode가 무엇인지 확인
2. `📐 Translate mode - using dimensions` - 회전된 크기가 올바른지 확인
   - `currentRotation: 270`일 때 `rotatedDims`가 width와 depth가 바뀌어야 함
3. `🔍 Room Boundary check` - 경계 검사가 실행되었는지 확인
4. `🔧 Correcting X/Z position` - 자동 수정이 작동하는지 확인

### 회전이 안 되는 경우
1. `🔄 Rotation check` - 회전 경계 검사가 실행되었는지 확인
2. `❌ Rotation blocked - REVERTED` - 회전이 차단되었는지 확인
3. `rotationChanged` 값이 `true`인지 확인

## 💡 콘솔 사용 팁

### 로그 지우기
- 콘솔에서 **Clear console** 버튼 클릭 (🚫 아이콘)
- 또는 `Cmd + K` (Mac) / `Ctrl + L` (Windows)

### 로그 저장하기
1. 콘솔에서 **우클릭**
2. **Save as...** 선택
3. 로그를 파일로 저장

### 실시간 모니터링
- 콘솔을 열어둔 상태에서 가구를 조작하면 실시간으로 로그가 출력됩니다
- 특정 로그를 클릭하면 해당 코드 위치로 이동할 수 있습니다

## 📝 예시: 회전 문제 디버깅

1. 브라우저에서 `F12` 또는 `Cmd + Option + I` 눌러서 개발자 도구 열기
2. **Console** 탭 클릭
3. 콘솔 필터에 `🔄` 입력 (회전 관련 로그만 보기)
4. 가구를 선택하고 회전 모드(R) 활성화
5. 벽 근처에서 회전 시도
6. 다음 로그들을 확인:
   - `🔄 Rotation check` - 회전 경계 검사 실행 여부
   - `📐 Rotated dimensions check` - 회전된 크기 계산
   - `🔍 Room Boundary check` - 경계 검사 결과
   - `❌ Rotation blocked` 또는 `✅ Rotation valid` - 최종 결과

