#!/bin/bash

# EC2 인스턴스 생성 스크립트
# t3a.large, 50GB EBS, 서울 리전

set -e

echo "🚀 EC2 인스턴스 생성 시작..."

REGION="ap-northeast-2"
INSTANCE_TYPE="t3a.large"
AMI_ID="ami-0c9c942bd7bf113a2"  # Ubuntu 22.04 LTS (서울 리전)
KEY_NAME="furniture-platform-key"
SECURITY_GROUP_NAME="furniture-platform-sg"
VOLUME_SIZE=50

# 1. SSH Key Pair 생성 (없으면)
echo "🔑 SSH Key Pair 확인 중..."
if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION >/dev/null 2>&1; then
    echo "✓ Key pair '$KEY_NAME' 이미 존재합니다."
else
    echo "📝 새로운 Key pair 생성 중..."
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --region $REGION \
        --query 'KeyMaterial' \
        --output text > ${KEY_NAME}.pem
    chmod 400 ${KEY_NAME}.pem
    echo "✓ Key pair 생성 완료: ${KEY_NAME}.pem"
fi

# 2. Security Group 생성
echo "🛡️  Security Group 확인 중..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --region $REGION \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ]; then
    echo "📝 새로운 Security Group 생성 중..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for Furniture Platform" \
        --region $REGION \
        --query 'GroupId' \
        --output text)

    # SSH (22)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region $REGION

    # HTTP (80)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region $REGION

    # Backend API (8008) - 개발용
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 8008 \
        --cidr 0.0.0.0/0 \
        --region $REGION

    # Frontend (3008) - 개발용
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 3008 \
        --cidr 0.0.0.0/0 \
        --region $REGION

    echo "✓ Security Group 생성 완료: $SG_ID"
else
    echo "✓ Security Group '$SECURITY_GROUP_NAME' 이미 존재합니다: $SG_ID"
fi

# 3. EC2 인스턴스 생성
echo "💻 EC2 인스턴스 생성 중..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$VOLUME_SIZE,\"VolumeType\":\"gp3\"}}]" \
    --region $REGION \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=furniture-platform-server}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✓ 인스턴스 생성 요청 완료: $INSTANCE_ID"

# 4. 인스턴스 준비 대기
echo "⏳ 인스턴스 준비 중..."
aws ec2 wait instance-running \
    --instance-ids $INSTANCE_ID \
    --region $REGION

echo "✓ 인스턴스 실행 중"

# 5. Public IP 조회
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "✅ EC2 인스턴스 생성 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Instance Type: $INSTANCE_TYPE"
echo "Volume Size: ${VOLUME_SIZE}GB"
echo "Region: $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 접속 정보:"
echo "  Frontend: http://$PUBLIC_IP"
echo "  Backend API: http://$PUBLIC_IP:8008"
echo "  API Docs: http://$PUBLIC_IP:8008/docs"
echo ""
echo "🔐 SSH 접속:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
echo ""
echo "⏳ 인스턴스 초기화를 위해 약 1-2분 대기 후 SSH 접속하세요."
echo ""
echo "📝 다음 단계:"
echo "  1. deployment/deploy.sh 스크립트로 애플리케이션 배포"
echo "  2. SSH 접속하여 로그 확인: sudo journalctl -u furniture-backend -f"
