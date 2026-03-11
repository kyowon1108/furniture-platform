# Deployment Guide

이 디렉토리의 스크립트는 단일 EC2 인스턴스에 Frontend/Backend를 함께 올리는 템플릿입니다. 현재 템플릿은 다음 원칙을 전제로 합니다.

- HTTPS 우선
- Nginx reverse proxy 사용
- Backend/Frontend는 내부 포트에서만 listen
- 업로드 파일은 `/uploads/`로 직접 공개하지 않음
- 카탈로그 관리 API는 `ADMIN_EMAILS` allowlist 필요

## 포함 파일

- `deploy.sh`
  - EC2에 코드 전송, PostgreSQL 기동, backend/frontend 설치, Nginx/systemd 배치
- `nginx.conf`
  - TLS 전제 reverse proxy 템플릿
- `furniture-backend.service`
- `furniture-frontend.service`
- `test_deployment.sh`
  - HTTPS 기준 smoke test

## 빠른 실행

```bash
cd deployment
./deploy.sh <EC2_PUBLIC_IP>
```

배포 스크립트가 수행하는 작업:

1. PostgreSQL 컨테이너 시작
2. Backend `venv` 생성 및 의존성 설치
3. Frontend 의존성 설치 및 빌드
4. 자체 서명 TLS 인증서 생성
5. `nginx.conf` 템플릿 치환 후 배치
6. systemd 서비스 등록 및 시작

## 배포 후 확인할 값

`/home/ubuntu/app/backend/.env`

- `DATABASE_URL`
- `SECRET_KEY`
- `ALLOWED_ORIGINS`
- `ADMIN_EMAILS`

예시:

```env
ALLOWED_ORIGINS=https://<EC2_PUBLIC_IP>,http://localhost:3008,http://127.0.0.1:3008
ADMIN_EMAILS=admin@example.com
```

## 접속 경로

- Frontend: `https://<EC2_PUBLIC_IP>`
- Swagger UI: `https://<EC2_PUBLIC_IP>/docs`
- API: `https://<EC2_PUBLIC_IP>/api/v1`

`test_deployment.sh`는 자체 서명 인증서를 가정하므로 `curl -k` 기반으로 검사합니다.

## 보안 체크리스트

- Security Group 공개 포트는 `22`, `80`, `443`만 유지
- `8008`, `3008`, `5433`은 외부에 공개하지 않음
- `SECRET_KEY`를 배포마다 새로 생성
- `ADMIN_EMAILS`를 실제 운영 계정으로 설정
- 업로드 파일은 인증된 다운로드 엔드포인트로만 접근

## 제한 사항

- 현재 스크립트는 자체 서명 TLS 인증서를 기본 생성합니다. 실사용 공개 베타에서는 신뢰 가능한 인증서로 교체하는 것이 좋습니다.
- 단일 인스턴스 템플릿이므로 고가용성, 자동 롤백, 중앙 로그 수집은 별도 설계가 필요합니다.
