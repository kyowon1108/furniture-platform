# 문서 인덱스

현재 코드와 가장 직접적으로 맞는 문서는 아래 5개입니다. 나머지 문서는 참고 자료이거나 과거 변경 보고서입니다.

## 우선 읽을 문서

1. [프로젝트 개요](./01_프로젝트_개요.md)
   - 서비스 목적과 주요 사용자 흐름
2. [API 문서](./05_API_문서.md)
   - 실제 호출에 필요한 엔드포인트, 인증, 응답 필드
3. [개발 가이드](./06_개발_가이드.md)
   - 로컬 실행, 환경 변수, 테스트, 검증 순서
4. [배포 문서](../deployment/README.md)
   - HTTPS 전제 EC2 배포 템플릿과 운영 체크리스트
5. [백엔드/프론트 구조 문서](./02_백엔드_구조.md), [프론트엔드 구조](./03_프론트엔드_구조.md)
   - 보조 아키텍처 참고 자료

## 현재 기준

- 개발 포트:
  - Frontend `3008`
  - Backend `8008`
- 로컬 개발 DB:
  - 빠른 시작은 SQLite 가능
  - `docker-compose.yml`로 PostgreSQL 기반 로컬 실행도 지원
- 인증:
  - REST API는 JWT Bearer
  - Socket.IO 연결도 JWT가 필요
- 관리자 기능:
  - 카탈로그 쓰기/동기화는 `ADMIN_EMAILS` allowlist 필요

## 아카이브

- [docs/update_code/README.md](./update_code/README.md)
  - 변경 보고서 아카이브 안내
- `docs/update_code/`
  - 타임스탬프 기반 변경 보고서
- `docs/screenshots/`
  - 문서/검증용 캡처 자산

운영/개발 기준의 source of truth는 `README.md`, 이 문서, `05_API_문서.md`, `06_개발_가이드.md`, `deployment/README.md`입니다.
