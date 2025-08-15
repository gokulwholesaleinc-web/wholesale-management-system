#!/bin/bash

# Comprehensive Deployment Check Script
# Tests all endpoints, authentication, and functionality

BASE_URL="http://localhost:5000"
REPORT_FILE="deployment-report.md"
TEMP_DIR="/tmp/deployment-check"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Create temp directory for storing responses
mkdir -p $TEMP_DIR

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "✓ PASS: $test_name" >> $REPORT_FILE
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name - $details"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "✗ FAIL: $test_name - $details" >> $REPORT_FILE
    fi
    
    if [ -n "$details" ] && [ "$status" = "PASS" ]; then
        echo "  Details: $details" >> $REPORT_FILE
    fi
    echo "" >> $REPORT_FILE
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    local expected_status="${5:-200}"
    local test_name="$method $endpoint"
    
    local headers=""
    if [ -n "$token" ]; then
        headers="-H 'Authorization: Bearer $token' -H 'x-auth-token: $token'"
    fi
    
    local curl_cmd="curl -s -w '%{http_code}' -H 'Content-Type: application/json'"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    elif [ "$method" = "PUT" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X PUT -d '$data'"
    elif [ "$method" = "DELETE" ]; then
        curl_cmd="$curl_cmd -X DELETE"
    elif [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    # Save response for analysis
    echo "$body" > "$TEMP_DIR/$(echo $endpoint | tr '/' '_').json"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_test "$test_name" "PASS" "Status: $status_code"
        return 0
    else
        log_test "$test_name" "FAIL" "Expected: $expected_status, Got: $status_code"
        return 1
    fi
}

# Initialize report
echo "# Deployment Readiness Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo -e "${BLUE}🔍 Starting Comprehensive Deployment Check...${NC}"
echo ""

# Test 1: Server Health Check
echo -e "${YELLOW}=== Testing Server Health ===${NC}"
test_endpoint "GET" "/" "" "" "200"

# Test 2: Authentication
echo -e "${YELLOW}=== Testing Authentication ===${NC}"
admin_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    "$BASE_URL/api/auth/login")

if echo "$admin_response" | grep -q "token"; then
    ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_test "Admin Login" "PASS" "Token obtained"
else
    log_test "Admin Login" "FAIL" "No token in response"
fi

user_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"username":"test1","password":"password123"}' \
    "$BASE_URL/api/auth/login")

if echo "$user_response" | grep -q "token"; then
    USER_TOKEN=$(echo "$user_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_test "User Login" "PASS" "Token obtained"
else
    log_test "User Login" "FAIL" "No token in response"
fi

# Test 3: Public Endpoints
echo -e "${YELLOW}=== Testing Public Endpoints ===${NC}"
test_endpoint "GET" "/api/public/order-settings"
test_endpoint "GET" "/api/categories"
test_endpoint "GET" "/api/products"

# Test 4: User Endpoints
if [ -n "$USER_TOKEN" ]; then
    echo -e "${YELLOW}=== Testing User Endpoints ===${NC}"
    test_endpoint "GET" "/api/cart" "" "$USER_TOKEN"
    test_endpoint "GET" "/api/orders" "" "$USER_TOKEN"
    test_endpoint "GET" "/api/delivery-addresses" "" "$USER_TOKEN"
    
    # Test cart functionality
    test_endpoint "DELETE" "/api/cart" "" "$USER_TOKEN" "200"
    test_endpoint "POST" "/api/cart" '{"productId":23,"quantity":2}' "$USER_TOKEN" "201"
    test_endpoint "GET" "/api/cart" "" "$USER_TOKEN" "200"
fi

# Test 5: Admin Endpoints
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}=== Testing Admin Endpoints ===${NC}"
    test_endpoint "GET" "/api/admin/orders" "" "$ADMIN_TOKEN"
    test_endpoint "GET" "/api/admin/stats" "" "$ADMIN_TOKEN"
    test_endpoint "GET" "/api/admin/order-settings" "" "$ADMIN_TOKEN"
    test_endpoint "GET" "/api/admin/products" "" "$ADMIN_TOKEN"
    test_endpoint "GET" "/api/admin/users" "" "$ADMIN_TOKEN"
fi

# Test 6: Database Connectivity
echo -e "${YELLOW}=== Testing Database Connectivity ===${NC}"
if [ -n "$ADMIN_TOKEN" ]; then
    stats_response=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/stats")
    if echo "$stats_response" | grep -q "totalOrders\|totalUsers"; then
        log_test "Database Connection" "PASS" "Stats endpoint returns data"
    else
        log_test "Database Connection" "FAIL" "Stats endpoint returns no data"
    fi
fi

# Test 7: Order Creation Flow  
echo -e "${YELLOW}=== Testing Order Creation ===${NC}"
if [ -n "$USER_TOKEN" ]; then
    # Clear cart first
    curl -s -X DELETE -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/cart" > /dev/null
    
    # Add items to cart for order creation
    add_response=$(curl -s -X POST -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d '{"productId":23,"quantity":1}' \
        "$BASE_URL/api/cart")
    
    # Wait a moment for cart to be updated
    sleep 1
    
    # Verify cart has items before creating order
    cart_check=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/cart")
    
    if echo "$cart_check" | grep -q '"productId":23'; then
        order_data='{"orderType":"pickup","pickupDate":"2025-06-12","pickupTimeSlot":"10:00-12:00","notes":"Test order"}'
        order_response=$(curl -s -X POST -H "Content-Type: application/json" \
            -H "Authorization: Bearer $USER_TOKEN" \
            -d "$order_data" \
            "$BASE_URL/api/orders")
        
        if echo "$order_response" | grep -q '"id"'; then
            log_test "Order Creation" "PASS" "Order created successfully"
        else
            log_test "Order Creation" "FAIL" "Order creation failed - $(echo $order_response | head -c 100)"
        fi
    else
        log_test "Order Creation" "FAIL" "Cart is empty before order creation"
    fi
fi

# Test 8: File Upload Endpoints
echo -e "${YELLOW}=== Testing File Upload Endpoints ===${NC}"
if [ -n "$ADMIN_TOKEN" ]; then
    test_endpoint "GET" "/api/admin/export/inventory" "" "$ADMIN_TOKEN" "200"
fi

# Generate final report
echo "" >> $REPORT_FILE
echo "## Summary" >> $REPORT_FILE
echo "- Total Tests: $TOTAL_TESTS" >> $REPORT_FILE
echo "- Passed: $PASSED_TESTS" >> $REPORT_FILE
echo "- Failed: $FAILED_TESTS" >> $REPORT_FILE

success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "- Success Rate: ${success_rate}%" >> $REPORT_FILE

echo ""
echo -e "${BLUE}=== FINAL RESULTS ===${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: ${YELLOW}${success_rate}%${NC}"

if [ $FAILED_TESTS -eq 0 ] && [ $success_rate -ge 95 ]; then
    echo ""
    echo -e "${GREEN}🚀 APPLICATION IS READY FOR DEPLOYMENT!${NC}"
    echo "🚀 APPLICATION IS READY FOR DEPLOYMENT!" >> $REPORT_FILE
else
    echo ""
    echo -e "${RED}❌ APPLICATION NEEDS FIXES BEFORE DEPLOYMENT${NC}"
    echo "❌ APPLICATION NEEDS FIXES BEFORE DEPLOYMENT" >> $REPORT_FILE
fi

echo ""
echo -e "${BLUE}📄 Detailed report saved to: $REPORT_FILE${NC}"

# Clean up
rm -rf $TEMP_DIR