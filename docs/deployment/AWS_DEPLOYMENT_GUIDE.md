# AWS EC2 배포 가이드

## 개요

이 가이드는 Furniture Platform을 AWS EC2 (t3a.large, 50GB)에 배포하는 방법을 설명합니다.

### 배포 아키텍처
- **단일 서버 구성**: Backend + Frontend를 하나의 EC2에서 실행
- **리버스 프록시**: Nginx를 통한 트래픽 라우팅
- **인스턴스**: t3a.large (2 vCPU, 8GB RAM)
- **스토리지**: 50GB EBS (gp3)
- **리전**: ap-northeast-2 (서울)
- **OS**: Ubuntu 22.04 LTS

### 예상 비용
- EC2 (t3a.large): ~$54.90/월
- EBS (50GB gp3): ~$4.80/월
- **총 예상**: ~$60-70/월

---

## 사전 준비사항

### 1. AWS CLI 설정 확인
```bash
aws sts get-caller-identity
```

출력 예시:
```json
{
    "UserId": "AIDA42UV4YTQ7TWLJBBLP",
    "Account": "881856398561",
    "Arn": "arn:aws:iam::881856398561:user/kwon"
}
```

### 2. 필요한 IAM 권한
다음 권한이 필요합니다:
- `ec2:CreateKeyPair`
- `ec2:CreateSecurityGroup`
- `ec2:RunInstances`
- `ec2:DescribeInstances`
- `ec2:AuthorizeSecurityGroupIngress`

---

## 배포 절차

### 1단계: EC2 인스턴스 생성

```bash
# 스크립트 실행 권한 부여
chmod +x deployment/create-ec2.sh

# EC2 인스턴스 생성
cd deployment
./create-ec2.sh
```

이 스크립트는 다음 작업을 수행합니다:
- SSH Key Pair 생성 (`furniture-platform-key.pem`)
- Security Group 생성 (포트 22, 80, 8008, 3008 개방)
- t3a.large 인스턴스 생성 (50GB EBS)
- Public IP 할당

**출력 예시**:
```
✅ EC2 인스턴스 생성 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instance ID: i-0123456789abcdef0
Public IP: 3.34.123.45
Instance Type: t3a.large
Volume Size: 50GB
Region: ap-northeast-2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**중요**: Public IP를 메모해두세요!

---

### 2단계: 애플리케이션 배포

```bash
# 배포 스크립트 실행 권한 부여
chmod +x deployment/deploy.sh

# 애플리케이션 배포 (Public IP 입력)
./deploy.sh 3.34.123.45
```

이 스크립트는 다음 작업을 수행합니다:
1. 서버 초기 설정 (Python, Node.js, Nginx 설치)
2. 소스 코드 전송 (Backend, Frontend)
3. Backend 설정 (가상환경, 의존성 설치, DB 마이그레이션)
4. Frontend 빌드
5. Nginx 설정
6. systemd 서비스 등록 및 시작

배포 시간: 약 **10-15분**

---

### 3단계: 환경 변수 업데이트

배포 후 EC2의 Public IP를 환경 변수에 추가해야 합니다:

```bash
# SSH 접속
ssh -i deployment/furniture-platform-key.pem ubuntu@3.34.123.45

# Backend .env 파일 수정
nano /home/ubuntu/app/backend/.env
```

**수정 내용**:
```env
# Public IP 추가
ALLOWED_ORIGINS=http://3.34.123.45,http://localhost:3008

# SECRET_KEY 변경 (보안!)
SECRET_KEY=여기에-랜덤-문자열-입력
```

**서비스 재시작**:
```bash
sudo systemctl restart furniture-backend
```

---

### 4단계: 접속 확인

브라우저에서 다음 URL로 접속:

- **Frontend**: http://3.34.123.45
- **Backend API**: http://3.34.123.45:8008
- **API Docs**: http://3.34.123.45:8008/docs

---

## 서비스 관리

### 서비스 상태 확인
```bash
# Backend 상태
sudo systemctl status furniture-backend

# Frontend 상태
sudo systemctl status furniture-frontend

# Nginx 상태
sudo systemctl status nginx
```

### 서비스 재시작
```bash
# Backend 재시작
sudo systemctl restart furniture-backend

# Frontend 재시작
sudo systemctl restart furniture-frontend

# Nginx 재시작
sudo systemctl restart nginx
```

### 로그 확인
```bash
# Backend 로그 (실시간)
sudo journalctl -u furniture-backend -f

# Frontend 로그 (실시간)
sudo journalctl -u furniture-frontend -f

# Nginx 에러 로그
sudo tail -f /var/log/nginx/furniture-platform-error.log

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/furniture-platform-access.log
```

---

## 업데이트 배포

코드를 수정한 후 업데이트하는 방법:

### 방법 1: 배포 스크립트 재실행 (권장)
```bash
cd deployment
./deploy.sh 3.34.123.45
```

### 방법 2: 수동 업데이트
```bash
# SSH 접속
ssh -i deployment/furniture-platform-key.pem ubuntu@3.34.123.45

cd /home/ubuntu/app

# Git 사용 시
git pull origin main

# Backend 업데이트
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart furniture-backend

# Frontend 업데이트
cd ../frontend
npm install
npm run build
sudo systemctl restart furniture-frontend
```

---

## 백업

### 데이터베이스 백업
```bash
# 로컬로 다운로드
scp -i deployment/furniture-platform-key.pem \
    ubuntu@3.34.123.45:/home/ubuntu/app/backend/dev.db \
    ./backup/dev.db.$(date +%Y%m%d_%H%M%S)
```

### 업로드 파일 백업
```bash
# 로컬로 다운로드
scp -r -i deployment/furniture-platform-key.pem \
    ubuntu@3.34.123.45:/home/ubuntu/app/backend/uploads \
    ./backup/uploads_$(date +%Y%m%d_%H%M%S)
```

### EBS 스냅샷 생성
```bash
# 인스턴스 ID 확인
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=furniture-platform-server" \
    --region ap-northeast-2 \
    --query 'Reservations[0].Instances[0].InstanceId'

# 볼륨 ID 확인
aws ec2 describe-instances \
    --instance-ids i-xxxxxxxxx \
    --region ap-northeast-2 \
    --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId'

# 스냅샷 생성
aws ec2 create-snapshot \
    --volume-id vol-xxxxxxxxx \
    --description "Furniture Platform Backup $(date +%Y%m%d)" \
    --region ap-northeast-2
```

---

## 보안 강화

### 1. SSH 포트 변경 (선택사항)
```bash
sudo nano /etc/ssh/sshd_config
# Port 22 → Port 2222로 변경
sudo systemctl restart sshd

# Security Group에서 포트 2222 허용 추가
```

### 2. Fail2Ban 설치 (무차별 대입 공격 방지)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. UFW 방화벽 설정
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 8008/tcp
sudo ufw allow 3008/tcp
sudo ufw enable
```

### 4. 자동 보안 업데이트
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 모니터링

### 시스템 리소스 확인
```bash
# CPU, 메모리 사용량
htop

# 디스크 사용량
df -h

# 네트워크 연결
sudo netstat -tulpn | grep LISTEN
```

### CloudWatch 메트릭 (선택사항)
기본 메트릭은 자동으로 수집됩니다:
- CPU 사용률
- 네트워크 트래픽
- 디스크 I/O

---

## 문제 해결

### Backend가 시작되지 않는 경우
```bash
# 로그 확인
sudo journalctl -u furniture-backend -n 50

# 수동 실행으로 에러 확인
cd /home/ubuntu/app/backend
source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 8008
```

### Frontend가 시작되지 않는 경우
```bash
# 로그 확인
sudo journalctl -u furniture-frontend -n 50

# 수동 실행으로 에러 확인
cd /home/ubuntu/app/frontend
npm run start
```

### Nginx 502 Bad Gateway
```bash
# Backend/Frontend 서비스 확인
sudo systemctl status furniture-backend
sudo systemctl status furniture-frontend

# 포트 리스닝 확인
sudo netstat -tulpn | grep 8008
sudo netstat -tulpn | grep 3008

# Nginx 설정 테스트
sudo nginx -t
```

### 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h

# 큰 파일 찾기
du -h /home/ubuntu/app | sort -h | tail -20

# 로그 파일 정리
sudo journalctl --vacuum-time=7d

# npm 캐시 정리
npm cache clean --force

# pip 캐시 정리
pip cache purge
```

---

## 인스턴스 종료 및 삭제

### 인스턴스 중지
```bash
aws ec2 stop-instances \
    --instance-ids i-xxxxxxxxx \
    --region ap-northeast-2
```

### 인스턴스 삭제
```bash
aws ec2 terminate-instances \
    --instance-ids i-xxxxxxxxx \
    --region ap-northeast-2
```

### Security Group 삭제
```bash
aws ec2 delete-security-group \
    --group-name furniture-platform-sg \
    --region ap-northeast-2
```

### Key Pair 삭제
```bash
aws ec2 delete-key-pair \
    --key-name furniture-platform-key \
    --region ap-northeast-2

# 로컬 키 파일도 삭제
rm deployment/furniture-platform-key.pem
```

---

## 다음 단계 (고급)

### HTTPS 설정 (도메인 필요)
1. Route53에서 도메인 연결
2. Let's Encrypt로 SSL 인증서 발급
3. Nginx에 HTTPS 설정 추가

### RDS로 데이터베이스 마이그레이션
1. RDS PostgreSQL 인스턴스 생성
2. Backend .env 수정
3. 데이터 마이그레이션

### S3로 파일 스토리지 마이그레이션
1. S3 버킷 생성
2. Backend 코드 수정 (파일 업로드를 S3로)
3. CloudFront로 CDN 설정

### Auto Scaling 설정
1. AMI 생성
2. Launch Template 생성
3. Auto Scaling Group 설정
4. Load Balancer 연결

---

## 참고 자료

- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [systemd 문서](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)

---

## 지원

문제가 발생하면 다음을 확인하세요:
1. 로그 파일 (`sudo journalctl -u furniture-backend -f`)
2. Security Group 설정
3. 환경 변수 (.env 파일)
4. 서비스 상태 (`sudo systemctl status`)
