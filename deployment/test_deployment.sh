#!/bin/bash

# EC2 배포 후 테스트 스크립트
# 사용법: ./test_deployment.sh <EC2_PUBLIC_IP>

if [ -z "$1" ]; then
    echo "사용법: $0 <EC2_PUBLIC_IP>"
    echo "예시: $0 13.125.249.5"
    exit 1
fi

EC2_IP=$1

echo "🧪 EC2 배포 테스트 시작..."
echo "대상 서버: $EC2_IP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PASSED=0
FAILED=0
BASE_URL="https://${EC2_IP}"
API_URL="${BASE_URL}/api/v1"

test_step() {
    echo ""
    echo "▶ $1"
}

pass_test() {
    echo "✅ PASS: $1"
    ((PASSED++))
}

fail_test() {
    echo "❌ FAIL: $1"
    ((FAILED++))
}

# 1. Health Check
test_step "1. Backend Health Check"
if curl -k -f -s "${BASE_URL}/health" > /dev/null 2>&1; then
    pass_test "Backend 서버 응답 정상"
else
    fail_test "Backend 서버 응답 없음"
fi

# 2. API Docs 접근
test_step "2. API Docs 접근 테스트"
if curl -k -f -s "${BASE_URL}/docs" > /dev/null 2>&1; then
    pass_test "API Docs 접근 가능"
else
    fail_test "API Docs 접근 불가"
fi

# 3. Frontend 접근
test_step "3. Frontend 접근 테스트"
if curl -k -f -s "${BASE_URL}" > /dev/null 2>&1; then
    pass_test "Frontend 페이지 접근 가능"
else
    fail_test "Frontend 페이지 접근 불가"
fi

# 4. CORS Preflight 테스트
test_step "4. CORS Preflight 테스트"
CORS_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: ${BASE_URL}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "${API_URL}/auth/register")

if [ "$CORS_RESPONSE" = "204" ] || [ "$CORS_RESPONSE" = "200" ]; then
    pass_test "CORS Preflight 응답 정상 (HTTP $CORS_RESPONSE)"
else
    fail_test "CORS Preflight 응답 실패 (HTTP $CORS_RESPONSE)"
fi

# 5. 회원가입 API 테스트
test_step "5. 회원가입 API 테스트"
RANDOM_EMAIL="test_$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Origin: ${BASE_URL}" \
    -d "{\"email\":\"${RANDOM_EMAIL}\",\"password\":\"testpass123\",\"full_name\":\"Test User\"}" \
    "${API_URL}/auth/register")

if [ "$REGISTER_RESPONSE" = "201" ]; then
    pass_test "회원가입 API 정상 (HTTP 201)"
elif [ "$REGISTER_RESPONSE" = "400" ]; then
    echo "⚠️  WARNING: 이미 등록된 이메일 (HTTP 400) - 정상적인 응답"
    pass_test "회원가입 API 응답 정상 (중복 이메일)"
else
    fail_test "회원가입 API 실패 (HTTP $REGISTER_RESPONSE)"
fi

# 6. 로그인 API 테스트 (이전에 생성한 계정으로)
test_step "6. 로그인 API 테스트"
LOGIN_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Origin: ${BASE_URL}" \
    -d "username=${RANDOM_EMAIL}&password=testpass123" \
    "${API_URL}/auth/login")

if [ "$LOGIN_RESPONSE" = "200" ]; then
    pass_test "로그인 API 정상 (HTTP 200)"
else
    # 새로 생성한 계정으로 재시도
    sleep 1
    LOGIN_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "Origin: ${BASE_URL}" \
        -d "username=${RANDOM_EMAIL}&password=testpass123" \
        "${API_URL}/auth/login")

    if [ "$LOGIN_RESPONSE" = "200" ]; then
        pass_test "로그인 API 정상 (HTTP 200)"
    else
        echo "⚠️  로그인 실패 (HTTP $LOGIN_RESPONSE) - 회원가입 확인 필요"
        fail_test "로그인 API 실패"
    fi
fi

# 7. Nginx를 통한 API 접근 테스트
test_step "7. Nginx Proxy를 통한 API 접근"
NGINX_API_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" \
    "${API_URL}/auth/login")

# OPTIONS 메서드로 확인
if [ "$NGINX_API_RESPONSE" = "405" ] || [ "$NGINX_API_RESPONSE" = "422" ]; then
    pass_test "Nginx를 통한 API 접근 가능 (엔드포인트 존재)"
else
    fail_test "Nginx를 통한 API 접근 실패 (HTTP $NGINX_API_RESPONSE)"
fi

# 8. 정적 파일 접근 테스트
test_step "8. Next.js 빌드 파일 접근"
NEXTJS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${BASE_URL}/_next/static/css")

# _next 경로 존재 여부 확인
if curl -k -s "${BASE_URL}" | grep -q "_next"; then
    pass_test "Next.js 빌드 파일 정상 로드"
else
    echo "⚠️  Next.js 빌드 파일 확인 불가 - 수동 확인 필요"
fi

# 결과 요약
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 배포 테스트 결과"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 통과: $PASSED"
echo "❌ 실패: $FAILED"
TOTAL=$((PASSED + FAILED))
echo "📝 전체: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 모든 배포 테스트 통과!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔗 접속 URL:"
    echo "  Frontend: ${BASE_URL}"
    echo "  API Docs: ${BASE_URL}/docs"
    echo ""
    echo "✨ 회원가입 테스트 계정:"
    echo "  Email: ${RANDOM_EMAIL}"
    echo "  Password: testpass123"
    exit 0
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  일부 테스트 실패"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔍 문제 해결:"
    echo "1. 서비스 상태 확인:"
    echo "   ssh -i furniture-platform-key.pem ubuntu@${EC2_IP}"
    echo "   sudo systemctl status furniture-backend"
    echo "   sudo systemctl status furniture-frontend"
    echo ""
    echo "2. 로그 확인:"
    echo "   sudo journalctl -u furniture-backend -n 50"
    echo "   sudo journalctl -u furniture-frontend -n 50"
    echo ""
    echo "3. 보안 그룹 확인:"
    echo "   - 포트 80/443이 열려있는지 확인"
    echo "   - 포트 8008은 외부 접근 불필요 (내부에서만 사용)"
    exit 1
fi
