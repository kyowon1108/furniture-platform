#!/bin/bash

# 애플리케이션 배포 스크립트
# 로컬에서 실행하여 EC2에 배포

set -e

# 설정
KEY_FILE="furniture-platform-key.pem"
INSTANCE_IP=""

# 인자로 IP 받기
if [ -z "$1" ]; then
    echo "❌ 사용법: $0 <EC2_PUBLIC_IP>"
    echo "예시: $0 3.34.123.45"
    exit 1
fi

INSTANCE_IP=$1

echo "🚀 애플리케이션 배포 시작..."
echo "대상 서버: ubuntu@$INSTANCE_IP"

# 1. 서버 초기 설정
echo ""
echo "📝 1단계: 서버 초기 설정..."
scp -i $KEY_FILE setup-server.sh ubuntu@$INSTANCE_IP:/tmp/
ssh -i $KEY_FILE ubuntu@$INSTANCE_IP "bash /tmp/setup-server.sh"

# 2. 소스 코드 전송
echo ""
echo "📝 2단계: 소스 코드 전송..."
echo "Backend 전송 중..."
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' --exclude 'dev.db' --exclude '.DS_Store' \
    -e "ssh -i $KEY_FILE" \
    ../backend/ ubuntu@$INSTANCE_IP:/home/ubuntu/app/backend/

echo "Frontend 전송 중..."
rsync -avz --exclude 'node_modules' --exclude '.next' \
    -e "ssh -i $KEY_FILE" \
    ../frontend/ ubuntu@$INSTANCE_IP:/home/ubuntu/app/frontend/

# 3. 설정 파일 전송
echo ""
echo "📝 3단계: 설정 파일 전송..."
scp -i $KEY_FILE nginx.conf ubuntu@$INSTANCE_IP:/tmp/
scp -i $KEY_FILE furniture-backend.service ubuntu@$INSTANCE_IP:/tmp/
scp -i $KEY_FILE furniture-frontend.service ubuntu@$INSTANCE_IP:/tmp/
scp -i $KEY_FILE ../docker-compose.yml ubuntu@$INSTANCE_IP:/home/ubuntu/app/docker-compose.yml

# 4. 서버에서 설치 및 설정 실행
echo ""
echo "📝 4단계: 서버에서 설치 및 설정..."
ssh -i $KEY_FILE ubuntu@$INSTANCE_IP << 'ENDSSH'
set -e

cd /home/ubuntu/app

# Docker Compose 환경 변수 생성
cat > .env << EOF
POSTGRES_USER=furniture
POSTGRES_PASSWORD=furniture123
POSTGRES_DB=furniture_db
POSTGRES_PORT=5433
EOF

# PostgreSQL 시작
echo "🐘 PostgreSQL 시작 중..."
sudo docker compose up -d postgres
until sudo docker compose exec -T postgres pg_isready -U furniture -d furniture_db > /dev/null 2>&1; do
    echo "   PostgreSQL 대기 중..."
    sleep 2
done

# Backend 설정
echo "🐍 Backend 설정 중..."
cd backend

# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# .env 파일 생성 (EC2 Public IP를 자동으로 포함)
# 기존 .env 파일이 있으면 백업
if [ -f .env ]; then
    cp .env .env.backup
fi

# EC2 메타데이터에서 Public IP 가져오기
PUBLIC_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

cat > .env << EOF
DATABASE_URL=postgresql://furniture:furniture123@127.0.0.1:5433/furniture_db
SECRET_KEY=production-secret-key-change-this-$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ALLOWED_ORIGINS=https://${PUBLIC_HOST},https://localhost,http://localhost:3008,http://127.0.0.1:3008
ADMIN_EMAILS=
HOST=0.0.0.0
PORT=8008
EOF

echo "✅ Backend .env 파일 생성 완료 (PUBLIC_HOST: ${PUBLIC_HOST})"

# 데이터베이스 마이그레이션
echo "🧹 Python 캐시 파일 정리 중..."
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete

echo "🔄 데이터베이스 마이그레이션..."
alembic upgrade head

# uploads 디렉토리 생성
mkdir -p uploads/ply uploads/glb

cd /home/ubuntu/app

# Frontend 설정
echo "⚛️  Frontend 설정 중..."
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (EC2 Public IP를 자동으로 포함)
# 기존 .env.local 파일이 있으면 백업
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
fi

# EC2 메타데이터에서 Public IP 가져오기
PUBLIC_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://${PUBLIC_HOST}/api/v1
NEXT_PUBLIC_SOCKET_URL=https://${PUBLIC_HOST}
EOF

echo "✅ Frontend .env.local 파일 생성 완료 (PUBLIC_HOST: ${PUBLIC_HOST})"

# 프로덕션 빌드
npm run build

cd /home/ubuntu/app

# Nginx 설정
echo "🌐 Nginx 설정 중..."
PUBLIC_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
SSL_CERT="/etc/ssl/certs/furniture-platform.crt"
SSL_KEY="/etc/ssl/private/furniture-platform.key"
if [ ! -f /etc/ssl/certs/furniture-platform.crt ] || [ ! -f /etc/ssl/private/furniture-platform.key ]; then
    echo "🔐 자체 서명 TLS 인증서 생성 중..."
    sudo openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$SSL_KEY" \
        -out "$SSL_CERT" \
        -subj "/CN=${PUBLIC_HOST}"
fi
sed \
    -e "s#__SERVER_NAME__#${PUBLIC_HOST}#g" \
    -e "s#__SSL_CERT__#${SSL_CERT}#g" \
    -e "s#__SSL_KEY__#${SSL_KEY}#g" \
    /tmp/nginx.conf | sudo tee /etc/nginx/sites-available/furniture-platform > /dev/null
sudo ln -sf /etc/nginx/sites-available/furniture-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# systemd 서비스 설정
echo "⚙️  systemd 서비스 설정 중..."
sudo cp /tmp/furniture-backend.service /etc/systemd/system/
sudo cp /tmp/furniture-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# 서비스 시작
echo "🚀 서비스 시작 중..."
sudo systemctl enable furniture-backend
sudo systemctl enable furniture-frontend
sudo systemctl start furniture-backend
sudo systemctl start furniture-frontend

# 상태 확인
echo ""
echo "✅ 배포 완료!"
echo ""
echo "📊 서비스 상태:"
sudo systemctl status furniture-backend --no-pager | head -10
sudo systemctl status furniture-frontend --no-pager | head -10
sudo systemctl status nginx --no-pager | head -10

ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 접속 URL:"
echo "  Frontend: https://$INSTANCE_IP"
echo "  API Docs: https://$INSTANCE_IP/docs"
echo ""
echo "⚠️  중요: .env 파일의 ADMIN_EMAILS를 업데이트하세요:"
echo "  ssh -i $KEY_FILE ubuntu@$INSTANCE_IP"
echo "  nano /home/ubuntu/app/backend/.env"
echo "  # ADMIN_EMAILS=admin@example.com"
echo "  sudo systemctl restart furniture-backend"
echo ""
echo "📝 로그 확인:"
echo "  Backend: sudo journalctl -u furniture-backend -f"
echo "  Frontend: sudo journalctl -u furniture-frontend -f"
echo "  Nginx: sudo tail -f /var/log/nginx/error.log"
