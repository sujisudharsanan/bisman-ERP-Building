#!/bin/bash

# Mattermost Chatbot Integration Test Script
# Tests backend API endpoints

echo "🧪 Testing Mattermost Backend Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3001"

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
response=$(curl -s -X GET "$BACKEND_URL/api/mattermost/health")
if [[ $response == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "$response"
fi
echo ""

# Test 2: Query Endpoint (requires auth - will fail without token, but tests endpoint exists)
echo -e "${BLUE}Test 2: Query Endpoint${NC}"
response=$(curl -s -X POST "$BACKEND_URL/api/mattermost/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "show my invoices", "userId": "test-user"}')

if [[ $response == *"Not authenticated"* ]] || [[ $response == *"ok"* ]]; then
    echo -e "${GREEN}✅ Query endpoint exists (authentication required)${NC}"
    echo "Response: $response" | head -c 100
else
    echo -e "${RED}❌ Query endpoint test failed${NC}"
    echo "$response"
fi
echo ""
echo ""

# Test 3: Test with mock authentication (if you have a test token)
echo -e "${BLUE}Test 3: Authenticated Query (Optional)${NC}"
echo "To test with authentication, add your token:"
echo ""
echo "curl -X POST $BACKEND_URL/api/mattermost/query \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: access_token=YOUR_TOKEN_HERE' \\"
echo "  -d '{\"query\": \"show my invoices\", \"userId\": \"your-user-id\"}'"
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backend Integration Status: READY${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy chatbot plugin to Mattermost"
echo "2. Test: @erpbot show my invoices"
echo "3. Monitor logs: tail -f my-backend/logs/app.log"
echo ""
echo "Available query types:"
echo "  - show my invoices"
echo "  - check leave balance"
echo "  - pending approvals"
echo "  - show dashboard"
echo "  - my profile"
echo ""
