# AWS EC2 배포 에러 수정 사항

## 발견된 문제점

### 1. CORS 에러
```
Access to XMLHttpRequest at 'http://13.125.249.5:8008/api/v1/auth/register' from origin 'http://13.125.249.5' has been blocked by CORS policy
```

**원인**: EC2 Public IP가 백엔드의 `ALLOWED_ORIGINS`에 포함되지 않음

### 2. 500 Internal Server Error

**원인**: `bcrypt` 패키지가 `requirements.txt`에 명시되지 않아 서버에서 import 실패

### 3. Python 3.12 Deprecation Warning

**원인**: `datetime.utcnow()` 사용 (Python 3.12에서 deprecated)

---

## 수정 사항

### 1. Backend 수정

#### 1.1 requirements.txt
- **파일**: [backend/requirements.txt](backend/requirements.txt:9)
- **수정**: `bcrypt==4.1.1` 추가
- **이유**: `app.core.security`에서 bcrypt를 사용하지만 명시적으로 설치되지 않음

#### 1.2 security.py
- **파일**: [backend/app/core/security.py](backend/app/core/security.py:62-64)
- **수정**:
  ```python
  # 이전
  expire = datetime.utcnow() + expires_delta

  # 수정
  from datetime import timezone
  expire = datetime.now(timezone.utc) + expires_delta
  ```
- **이유**: Python 3.12에서 `datetime.utcnow()` deprecated

#### 1.3 .env 파일
- **파일**: [backend/.env](backend/.env:5)
- **수정**: `ALLOWED_ORIGINS`에 localhost 포트 추가
- **배포 시**: EC2 Public IP 자동 추가 (배포 스크립트에서 처리)

### 2. Frontend 수정

#### 2.1 .env.local 파일 생성
- **파일**: [frontend/.env.local](frontend/.env.local)
- **내용**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8008/api/v1
  NEXT_PUBLIC_SOCKET_URL=http://localhost:8008
  ```
- **배포 시**: EC2 Public IP 자동 설정 (배포 스크립트에서 처리)

#### 2.2 .env.local.example 파일 생성
- **파일**: [frontend/.env.local.example](frontend/.env.local.example)
- **목적**: 개발자를 위한 환경 변수 예시

### 3. 배포 스크립트 개선

#### 3.1 deploy.sh - Backend 환경 변수 자동 설정
- **파일**: [deployment/deploy.sh](deployment/deploy.sh:76-89)
- **수정**: EC2 메타데이터에서 Public IP를 자동으로 가져와 `ALLOWED_ORIGINS`에 추가
  ```bash
  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

  cat > .env << EOF
  ...
  ALLOWED_ORIGINS=http://${PUBLIC_IP},http://localhost,http://127.0.0.1
  ...
  EOF
  ```

#### 3.2 deploy.sh - Frontend 환경 변수 자동 설정
- **파일**: [deployment/deploy.sh](deployment/deploy.sh:113-120)
- **수정**: EC2 Public IP를 자동으로 Frontend 환경 변수에 설정
  ```bash
  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

  cat > .env.local << EOF
  NEXT_PUBLIC_API_URL=http://${PUBLIC_IP}:8008/api/v1
  NEXT_PUBLIC_SOCKET_URL=http://${PUBLIC_IP}:8008
  EOF
  ```

### 4. Nginx 설정 개선

#### 4.1 CORS Preflight 처리
- **파일**: [deployment/nginx.conf](deployment/nginx.conf:48-57)
- **수정**: OPTIONS 요청에 대한 CORS 헤더 추가
  ```nginx
  location /api {
      # CORS preflight 처리
      if ($request_method = 'OPTIONS') {
          add_header 'Access-Control-Allow-Origin' '*' always;
          add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
          add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
          add_header 'Access-Control-Max-Age' 1728000;
          add_header 'Content-Type' 'text/plain; charset=utf-8';
          add_header 'Content-Length' 0;
          return 204;
      }
      ...
  }
  ```

---

## 테스트 완료 사항

### Backend
- ✅ Python 구문 에러 검사 통과
- ✅ 모든 import 문 정상 작동
- ✅ datetime 경고 해결

### Frontend
- ✅ TypeScript 타입 에러 없음
- ✅ 환경 변수 설정 완료

---

## 배포 절차

### 1. 로컬에서 재배포

```bash
cd deployment
./deploy.sh 13.125.249.5
```

### 2. 배포 후 자동으로 수행되는 작업

1. ✅ EC2 Public IP 자동 감지
2. ✅ Backend `.env` 파일에 ALLOWED_ORIGINS 설정
3. ✅ Frontend `.env.local` 파일에 API URL 설정
4. ✅ 의존성 설치 (bcrypt 포함)
5. ✅ 프로덕션 빌드
6. ✅ Nginx CORS 설정 적용
7. ✅ 서비스 재시작

### 3. 배포 확인

```bash
# 서비스 상태 확인
ssh -i furniture-platform-key.pem ubuntu@13.125.249.5
sudo systemctl status furniture-backend
sudo systemctl status furniture-frontend

# 로그 확인
sudo journalctl -u furniture-backend -f
sudo journalctl -u furniture-frontend -f

# 환경 변수 확인
cat /home/ubuntu/app/backend/.env
cat /home/ubuntu/app/frontend/.env.local
```

---

## 주요 변경 파일 목록

### Backend
- ✅ `backend/requirements.txt` - bcrypt 추가
- ✅ `backend/app/core/security.py` - datetime 수정
- ✅ `backend/.env` - ALLOWED_ORIGINS 업데이트

### Frontend
- ✅ `frontend/.env.local` - 생성 (로컬)
- ✅ `frontend/.env.local.example` - 생성

### Deployment
- ✅ `deployment/deploy.sh` - 자동 IP 설정
- ✅ `deployment/nginx.conf` - CORS 헤더 추가

---

## 예상 결과

### 이전 (에러 발생)
```
❌ GET http://13.125.249.5/favicon.ico 404 (Not Found)
❌ Access to XMLHttpRequest blocked by CORS policy
❌ POST http://13.125.249.5:8008/api/v1/auth/register net::ERR_FAILED 500
```

### 수정 후 (정상 동작)
```
✅ CORS 정책 통과
✅ POST http://13.125.249.5:8008/api/v1/auth/register 201 Created
✅ 회원가입 성공
```

---

## 추가 개선 사항

### 1. 보안 강화 (프로덕션 환경)
- SECRET_KEY를 환경별로 다르게 설정
- ALLOWED_ORIGINS를 특정 도메인으로 제한

### 2. 모니터링
- Backend/Frontend 로그 모니터링 설정
- 에러 알림 시스템 구축

### 3. CI/CD
- GitHub Actions를 통한 자동 배포
- 배포 전 자동 테스트 실행

---

## 문제 해결 체크리스트

배포 후 문제가 발생하면 다음을 확인하세요:

1. ✅ Backend 서비스 실행 중인지 확인
   ```bash
   sudo systemctl status furniture-backend
   ```

2. ✅ Frontend 서비스 실행 중인지 확인
   ```bash
   sudo systemctl status furniture-frontend
   ```

3. ✅ Nginx 설정이 올바른지 확인
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. ✅ 환경 변수가 올바르게 설정되었는지 확인
   ```bash
   cat /home/ubuntu/app/backend/.env
   cat /home/ubuntu/app/frontend/.env.local
   ```

5. ✅ 보안 그룹에서 포트가 열려있는지 확인
   - 80 (HTTP)
   - 8008 (Backend API, 외부 접근 불필요)
   - 3008 (Frontend, 외부 접근 불필요)

6. ✅ bcrypt가 설치되었는지 확인
   ```bash
   source /home/ubuntu/app/backend/venv/bin/activate
   python -c "import bcrypt; print(bcrypt.__version__)"
   ```
