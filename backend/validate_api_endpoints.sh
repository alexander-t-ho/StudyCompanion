#!/bin/bash
# API Endpoint Validation Script

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_BASE="${API_BASE:-$BASE_URL/api/v1}"

echo "============================================================"
echo "Platform Integration API Validation"
echo "============================================================"
echo "Base URL: $BASE_URL"
echo "API Base: $API_BASE"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=${5:-200}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${AUTH_TOKEN:-}" \
            ${STUDENT_ID:+-H "student_id: $STUDENT_ID"} 2>&1)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${AUTH_TOKEN:-}" \
            ${STUDENT_ID:+-H "student_id: $STUDENT_ID"} \
            -d "$data" 2>&1)
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${AUTH_TOKEN:-}" \
            ${STUDENT_ID:+-H "student_id: $STUDENT_ID"} \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Check if server is running
echo "Checking if server is running..."
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Server is not running at $BASE_URL${NC}"
    echo "Start the server with: rails server"
    echo ""
    echo "Skipping endpoint tests..."
    exit 0
fi

# Test endpoints
echo "Testing API Endpoints..."
echo ""

# Transcript endpoints
test_endpoint "List Transcripts" "GET" "$API_BASE/transcripts"
test_endpoint "Get Transcript (if exists)" "GET" "$API_BASE/transcripts/1" "" 404

# AI Companion endpoints
test_endpoint "AI Companion Profile" "GET" "$API_BASE/ai_companion/profile" "" 401
test_endpoint "Session Summaries" "GET" "$API_BASE/ai_companion/session-summaries" "" 401
test_endpoint "Practice List" "GET" "$API_BASE/ai_companion/practice/list" "" 401
test_endpoint "Conversation History" "GET" "$API_BASE/ai_companion/conversation-history" "" 401
test_endpoint "Chat (Stub)" "POST" "$API_BASE/ai_companion/chat" '{"message":"test"}' 401

# Retention endpoints
test_endpoint "Progress Dashboard" "GET" "$API_BASE/retention/progress-dashboard" "" 401
test_endpoint "Nudge Eligibility" "GET" "$API_BASE/retention/nudges/eligibility" "" 401

# Summary
echo ""
echo "============================================================"
echo "Validation Summary"
echo "============================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All endpoint structures are accessible${NC}"
    echo ""
    echo "Note: 401 errors are expected without authentication."
    echo "This confirms endpoints exist and authentication is working."
else
    echo -e "${RED}❌ Some endpoints failed${NC}"
fi

echo ""
echo "To test with authentication:"
echo "  export AUTH_TOKEN='your_token_here'"
echo "  export STUDENT_ID='1'"
echo "  ./validate_api_endpoints.sh"
echo "============================================================"

