# 문서 인덱스

현재 코드와 직접 맞는 문서는 아래 항목들입니다. 그 외 문서는 설계 참고 자료이거나 과거 작업 보고서입니다.

## 현재 기준 문서

1. [프로젝트 개요](./01_프로젝트_개요.md)
   - 서비스 목적, 핵심 기능, 현재 상태
2. [백엔드 구조](./02_백엔드_구조.md)
   - FastAPI, Socket.IO, 서비스 레이어, 보안 경계
3. [프론트엔드 구조](./03_프론트엔드_구조.md)
   - Next.js 15 App Router, Zustand 스토어, 인증 토큰 흐름
4. [데이터 흐름](./04_데이터_흐름.md)
   - 로그인, 프로젝트 생성, Room Builder, 협업 동기화
5. [API 문서](./05_API_문서.md)
   - 실제 호출 형식, `download_url`, 관리자 전용 API
6. [개발 가이드](./06_개발_가이드.md)
   - 로컬 실행, 테스트, 검증 순서
7. [기술 의사결정](./09_기술_의사결정.md)
   - 면접에서 설명할 선택 이유와 trade-off
8. [개인 기여 및 면접 QA](./10_개인_기여_및_면접_QA.md)
   - 제출용 개인 기여 정리 초안과 예상 질문
9. [배포 안내](../deployment/README.md)
   - HTTPS 전제 EC2 템플릿과 운영 체크리스트

## 설계 참고 문서

- [07_자유건축_및_AI_Depth_Map_기능_설계.md](./07_자유건축_및_AI_Depth_Map_기능_설계.md)
- [08_구현_상세_계획서.md](./08_구현_상세_계획서.md)
- [ALGORITHM_OPTIMIZATION.md](./ALGORITHM_OPTIMIZATION.md)

위 문서는 현재 구현과 일부 차이가 있을 수 있는 설계/최적화 참고 자료입니다.

## 아카이브

- [docs/update_code/README.md](./update_code/README.md)
  - 타임스탬프 기반 작업 보고서 아카이브
- `docs/update_code/`
  - 세션별 변경 보고서, 요약, 체크리스트
- `docs/deployment/`
  - 과거 배포 세션 문서와 참고 가이드

아카이브 문서는 당시 표현을 그대로 보존할 수 있으므로, 과장되거나 현재 기준과 어긋나는 문구가 남아 있어도 최신 운영 문서로 해석하지 않는 것이 맞습니다.

## 현재 기준 요약

- Frontend 포트: `3008`
- Backend 포트: `8008`
- 로컬 개발 DB:
  - 빠른 시작은 SQLite 가능
  - 권장 로컬 실행은 `docker-compose.yml`의 PostgreSQL
- 인증:
  - REST API는 JWT Bearer
  - Socket.IO 연결도 `auth.token` 기반 JWT 필요
- 관리자 기능:
  - 카탈로그 쓰기/동기화는 `ADMIN_EMAILS` allowlist 필요
- 파일 접근:
  - 내부 파일 경로는 응답에 노출하지 않음
  - 보호된 다운로드 엔드포인트만 사용
