# GLB 로드 문제 디버깅 단계

## 1. 브라우저 콘솔 확인 (F12 → Console 탭)

다음 메시지가 있는지 확인:
- ✅ "GLB model materials cached: X materials"
- ❌ "GLB 로드 실패" 또는 에러 메시지
- ❌ HTTP 401/403/404/500 에러

## 2. 네트워크 탭 확인 (F12 → Network 탭)

1. 페이지 새로고침
2. 필터에 "download-3d" 입력
3. 해당 요청 찾기:
   - URL: `/api/v1/files/download-3d/{projectId}`
   - Status: 200이어야 함 (200이 아니면 문제!)
   - Type: application/octet-stream 또는 model/gltf-binary
   - Size: 파일 크기 확인 (0 bytes면 문제!)

## 3. 3D 뷰어 화면 확인

다음 중 하나가 보이는지 확인:
- "GLB 파일 로딩 중..." (로딩 중)
- "GLB 모델 정보 없음" (projectId 없음)
- "❌ GLB 로드 실패" + 에러 메시지 (로드 실패)
- 아무것도 안 보임 (정상 로드 - 하지만 로그가 없음!)

## 4. 로그 확인 명령어

터미널에서 다음 명령어 실행:

```bash
# 오늘 전체 로그 확인
cat backend/logs/$(date +%Y-%m-%d).log | grep -E "GLB|download-3d|WEBGL"

# 에러만 확인
cat backend/logs/$(date +%Y-%m-%d).log | grep -i error

# 실시간 로그 모니터링
tail -f backend/logs/$(date +%Y-%m-%d).log
```

## 5. 결과 공유

다음 정보를 복사해서 공유해주세요:
1. 브라우저 콘솔의 모든 메시지 (특히 빨간색 에러)
2. Network 탭의 download-3d 요청 상태
3. 3D 뷰어 화면 상태 (로딩/에러/정상)
4. backend 로그의 에러 메시지
