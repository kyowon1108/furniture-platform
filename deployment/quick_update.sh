#!/bin/bash

# 빠른 업데이트 스크립트
# 전체 재배포 없이 수정된 파일만 업데이트

set -e

KEY_FILE="furniture-platform-key.pem"
INSTANCE_IP=""

if [ -z "$1" ]; then
    echo "사용법: $0 <EC2_PUBLIC_IP>"
    echo "예시: $0 13.125.249.5"
    exit 1
fi

INSTANCE_IP=$1

echo "🚀 빠른 업데이트 시작..."
echo "대상 서버: ubuntu@$INSTANCE_IP"
echo ""

# 1. 수정된 Backend 파일 전송
echo "📝 1단계: Backend 파일 업데이트..."
echo "  - requirements.txt (bcrypt 추가)"
echo "  - app/core/security.py (datetime 수정)"
echo "  - .env.example"

rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' --exclude 'dev.db' \
    -e "ssh -i $KEY_FILE" \
    ../backend/requirements.txt \
    ../backend/app/core/security.py \
    ../backend/.env.example \
    ubuntu@$INSTANCE_IP:/home/ubuntu/app/backend/

# 2. 수정된 설정 파일 전송
echo ""
echo "📝 2단계: Nginx 설정 업데이트..."
scp -i $KEY_FILE nginx.conf ubuntu@$INSTANCE_IP:/tmp/

# 3. 서버에서 업데이트 실행
echo ""
echo "📝 3단계: 서버에서 업데이트 적용..."
ssh -i $KEY_FILE ubuntu@$INSTANCE_IP << 'ENDSSH'
set -e

cd /home/ubuntu/app/backend

# 가상환경 활성화
source venv/bin/activate

# bcrypt 설치
echo "🔧 bcrypt 설치 중..."
pip install bcrypt==4.1.1

# .env 파일 업데이트 (PUBLIC_IP 자동 추가)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
echo "🌐 PUBLIC_IP: $PUBLIC_IP"

# 기존 .env 백업
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# .env 파일 업데이트
cat > .env << EOF
DATABASE_URL=sqlite:///./dev.db
SECRET_KEY=production-secret-key-change-this-$(openssl rand -hex 16)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ALLOWED_ORIGINS=http://${PUBLIC_IP},http://localhost,http://127.0.0.1
HOST=0.0.0.0
PORT=8008
EOF

echo "✅ Backend .env 업데이트 완료"

# Nginx 설정 업데이트
echo "🌐 Nginx 설정 업데이트 중..."
sudo cp /tmp/nginx.conf /etc/nginx/sites-available/furniture-platform
sudo nginx -t

# 서비스 재시작
echo "🔄 서비스 재시작 중..."
sudo systemctl restart furniture-backend
sudo systemctl restart nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 업데이트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 서비스 상태:"
sudo systemctl status furniture-backend --no-pager -l | head -15
echo ""
sudo systemctl status nginx --no-pager -l | head -10

ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 빠른 업데이트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 테스트 실행:"
echo "  ./test_deployment.sh $INSTANCE_IP"
