# 자유 건축 및 AI Depth Map 설계 메모

> Status: Design Reference
> 현재 구현과 일부 차이가 있는 설계 참고 문서입니다. 최신 실행 기준은 [README.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/README.md), [docs/05_API_문서.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/docs/05_API_문서.md), [docs/06_개발_가이드.md](/Users/kapr/Projects/External/Codyssey/term_project/furniture-platform/docs/06_개발_가이드.md)를 우선합니다.

## 현재 구현과의 차이

- Free Build / 타일 기반 방 구조 설계는 현재 제품에 반영되어 있습니다.
- AI Depth Map / displacement 기반 재질 변형은 현재 활성 기능이 아닙니다.
- 현재 코드는 Next.js 15, 보호된 다운로드 엔드포인트, Socket.IO JWT 인증, 관리자 allowlist를 전제로 동작합니다.

## 문서가 여전히 유효한 부분

- 자유 건축 모드의 사용자 가치와 문제 정의
- 타일 기반 방 구조 모델링 아이디어
- 텍스처, UV, geometry baking에 대한 조사 메모
- 향후 Depth Map 기능을 재도입할 때의 후보 기술 조사

## 현재 제품에 적용되지 않는 부분

- 브라우저/백엔드 Depth Estimation 파이프라인
- displacement map을 이용한 활성 편집 플로우
- 관련 API 엔드포인트 전제

## 향후 재도입 시 전제

- 인증된 업로드/다운로드 경로 유지
- `build_mode`, `room_structure` 기반 데이터 모델 호환성 유지
- Next.js 15 / React 18 / FastAPI / PostgreSQL 지원 기준으로 재설계
- 현재 문서 체계와 분리된 RFC 또는 별도 설계 문서로 관리
