#!/bin/bash

# EC2 서버 초기 설정 스크립트 (서버에서 실행)
# Ubuntu 22.04 기준

set -e

echo "🚀 서버 초기 설정 시작..."

# 시스템 업데이트
echo "📦 시스템 업데이트 중..."
sudo apt update
sudo apt upgrade -y

# 필수 패키지 설치
echo "📦 필수 패키지 설치 중..."
sudo apt install -y \
    python3 \
    python3-venv \
    python3-pip \
    nginx \
    git \
    curl \
    build-essential \
    docker.io \
    docker-compose-plugin \
    openssl

# Node.js 22.x 설치
echo "📦 Node.js 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 버전 확인
echo "✓ Python: $(python3 --version)"
echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"
echo "✓ Docker: $(docker --version)"

# 애플리케이션 디렉토리 생성
echo "📁 애플리케이션 디렉토리 생성..."
sudo mkdir -p /home/ubuntu/app
sudo chown -R ubuntu:ubuntu /home/ubuntu/app

# Docker 서비스 활성화
echo "🐳 Docker 서비스 활성화..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

echo "✅ 서버 초기 설정 완료!"
