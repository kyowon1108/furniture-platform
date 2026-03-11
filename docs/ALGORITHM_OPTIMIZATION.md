# 핵심 알고리즘 최적화 보고서

## 현재 제품 기준으로 유지되는 최적화

### 1. Free Build 타일 경계 검사

- 목적: 복잡한 자유 건축 방 구조에서도 가구 배치 검사를 빠르게 처리
- 방법:
  - 바닥 타일 좌표를 `Set`으로 전처리
  - X/Z 범위를 `Map`으로 미리 계산
  - 충돌 시 전체 타일 순회 대신 O(1) 조회 우선
- 적용 위치:
  - `frontend/components/3d/Scene.tsx`

### 2. 실시간 협업 이벤트 쓰로틀링

- 목적: 드래그 중 과도한 `furniture_move` 이벤트 전송 방지
- 방법:
  - 약 `200ms` 간격으로 소켓 이동 이벤트 쓰로틀링
  - 드래그 종료 시 마지막 위치는 즉시 flush
- 적용 위치:
  - `frontend/lib/socket.ts`

### 3. 업로드 처리의 스트리밍화

- 목적: 대용량 GLB/PLY 업로드 시 메모리 사용량 급증 방지
- 방법:
  - 업로드를 임시 파일로 스트리밍 저장
  - 저장 중 크기 제한 검사
  - 이후 포맷 검증 / 최종 처리 수행
- 적용 위치:
  - `backend/app/services/file_service.py`
  - `backend/app/api/v1/files.py`
  - `backend/app/api/v1/files_3d.py`
  - `backend/app/api/v1/room_builder.py`

## 현재 문서의 의미

- 이 문서는 “현재 코드에 반영된 최적화”만 요약합니다.
- 과거 실험/세션별 세부 변경 이력은 `docs/update_code/`에서 추적합니다.
