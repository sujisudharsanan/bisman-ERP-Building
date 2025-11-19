#!/bin/bash

# ERP Load Test Runner
# Uses k6 to simulate 100-500 concurrent users

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$SCRIPT_DIR/benchmarks"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🚀 ERP Load Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create benchmarks directory
mkdir -p "$BENCHMARK_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS: brew install k6"
    echo "  Linux: sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo \"deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6"
    echo "  Windows: choco install k6"
    echo ""
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running on http://localhost:3001${NC}"
    echo ""
    echo "Start backend:"
    echo "  npm run dev:both"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Run load test
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Running load test...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Test Profile:"
echo "  • Ramp up: 50 users (30s)"
echo "  • Sustain: 100 users (1min)"
echo "  • Spike: 200 users (1.5min)"
echo "  • Peak: 500 users (30s)"
echo "  • Duration: ~4 minutes total"
echo ""

# Run k6
k6 run \
  --out json="$BENCHMARK_DIR/load-test-$TIMESTAMP.json" \
  load-test.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Load test completed successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Load test failed or thresholds violated${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Results:${NC}"
echo "  JSON Report: $BENCHMARK_DIR/load-test-results.json"
echo "  Raw Data: $BENCHMARK_DIR/load-test-$TIMESTAMP.json"
echo ""
echo "View results:"
echo "  cat $BENCHMARK_DIR/load-test-results.json | jq ."
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
