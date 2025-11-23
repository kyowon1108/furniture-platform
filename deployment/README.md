# Deployment Scripts

이 디렉토리에는 AWS EC2 배포를 위한 모든 스크립트와 설정 파일이 포함되어 있습니다.

## 파일 목록

### 실행 스크립트
- **`create-ec2.sh`** - EC2 인스턴스 생성 스크립트
- **`deploy.sh`** - 애플리케이션 배포 스크립트 (로컬에서 실행)
- **`setup-server.sh`** - 서버 초기 설정 스크립트 (EC2에서 실행)

### 설정 파일
- **`nginx.conf`** - Nginx 리버스 프록시 설정
- **`furniture-backend.service`** - Backend systemd 서비스
- **`furniture-frontend.service`** - Frontend systemd 서비스

### 생성되는 파일
- **`furniture-platform-key.pem`** - SSH 접속용 키 페어 (자동 생성)

## 빠른 시작

### 1. EC2 인스턴스 생성
```bash
cd deployment
./create-ec2.sh
```

출력에서 **Public IP**를 메모하세요!

### 2. 애플리케이션 배포
```bash
./deploy.sh <PUBLIC_IP>
```

예시:
```bash
./deploy.sh 3.34.123.45
```

### 3. 환경 변수 업데이트
```bash
ssh -i furniture-platform-key.pem ubuntu@<PUBLIC_IP>
nano /home/ubuntu/app/backend/.env
# ALLOWED_ORIGINS에 Public IP 추가
sudo systemctl restart furniture-backend
```

## 상세 가이드

자세한 배포 방법은 프로젝트 루트의 `AWS_DEPLOYMENT_GUIDE.md`를 참조하세요.

## 예상 비용

- **EC2 (t3a.large)**: ~$54.90/월
- **EBS (50GB gp3)**: ~$4.80/월
- **총 예상**: ~$60-70/월

## 아키텍처

```
                    Internet
                       ↓
                  [Public IP]
                       ↓
              ┌────────────────┐
              │   Nginx :80    │ ← 리버스 프록시
              └────────────────┘
                ↙            ↘
     ┌──────────────┐  ┌──────────────┐
     │ Backend:8008 │  │Frontend:3008 │
     └──────────────┘  └──────────────┘
              ↓
        ┌──────────┐
        │ SQLite   │
        │ uploads/ │
        └──────────┘
```

## 보안

### 개방된 포트
- **22** - SSH
- **80** - HTTP (Nginx)
- **8008** - Backend API (개발용)
- **3008** - Frontend (개발용)

### 권장 사항
- 프로덕션에서는 8008, 3008 포트 차단
- SSH Key 안전하게 보관
- `.env` 파일의 SECRET_KEY 변경

## 트러블슈팅

### 스크립트 실행 권한 오류
```bash
chmod +x create-ec2.sh deploy.sh setup-server.sh
```

### SSH 접속 오류
```bash
# Key 권한 확인
chmod 400 furniture-platform-key.pem

# 1-2분 대기 후 재시도
```

### 배포 실패
```bash
# 로그 확인
ssh -i furniture-platform-key.pem ubuntu@<PUBLIC_IP>
sudo journalctl -u furniture-backend -n 50
sudo journalctl -u furniture-frontend -n 50
```

## 인스턴스 관리

### 중지
```bash
aws ec2 stop-instances --instance-ids <INSTANCE_ID> --region ap-northeast-2
```

### 재시작
```bash
aws ec2 start-instances --instance-ids <INSTANCE_ID> --region ap-northeast-2
```

### 삭제
```bash
aws ec2 terminate-instances --instance-ids <INSTANCE_ID> --region ap-northeast-2
```

## 지원

문제가 발생하면 `AWS_DEPLOYMENT_GUIDE.md`의 문제 해결 섹션을 참조하세요.
