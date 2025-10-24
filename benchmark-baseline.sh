#!/bin/bash

# ERP Performance Benchmark - Baseline Metrics Collection
# Measures: LCP, TTI, TTFB, API Latency, Database Performance

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/abhi/Desktop/BISMAN ERP"
BENCHMARK_DIR="$PROJECT_ROOT/benchmarks"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$BENCHMARK_DIR/baseline_$TIMESTAMP.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔬 ERP Performance Benchmark${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Started: $(date)"
echo "Output: $REPORT_FILE"
echo ""

# Create benchmark directory
mkdir -p "$BENCHMARK_DIR"

# Initialize JSON report
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "development",
  "optimization_phase": "post-day1",
  "metrics": {}
}
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. API LATENCY BENCHMARKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${GREEN}[1/6]${NC} 🔌 Testing API Latency..."

# Test key endpoints (bash 3 compatible)
API_RESULTS=""

# Health endpoint
echo -n "  Testing health (/api/health)... "
total_time=0
success=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3001/api/health" 2>/dev/null || echo "0")
  if [ "$response_time" != "0" ]; then
    total_time=$(echo "$total_time + $response_time" | bc)
    success=$((success + 1))
  fi
done
if [ $success -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success * 1000" | bc)
  echo -e "${GREEN}${avg_time}ms${NC}"
  API_RESULTS="$API_RESULTS\"health\": {\"avg_ms\": $avg_time, \"requests\": $success},"
fi

# Cache health endpoint
echo -n "  Testing cache_health (/api/health/cache)... "
total_time=0
success=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3001/api/health/cache" 2>/dev/null || echo "0")
  if [ "$response_time" != "0" ]; then
    total_time=$(echo "$total_time + $response_time" | bc)
    success=$((success + 1))
  fi
done
if [ $success -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success * 1000" | bc)
  echo -e "${GREEN}${avg_time}ms${NC}"
  API_RESULTS="$API_RESULTS\"cache_health\": {\"avg_ms\": $avg_time, \"requests\": $success},"
fi

# Database health endpoint
echo -n "  Testing database_health (/api/health/database)... "
total_time=0
success=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3001/api/health/database" 2>/dev/null || echo "0")
  if [ "$response_time" != "0" ]; then
    total_time=$(echo "$total_time + $response_time" | bc)
    success=$((success + 1))
  fi
done
if [ $success -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success * 1000" | bc)
  echo -e "${GREEN}${avg_time}ms${NC}"
  API_RESULTS="$API_RESULTS\"database_health\": {\"avg_ms\": $avg_time, \"requests\": $success},"
fi

# Pages endpoint
echo -n "  Testing pages (/api/pages)... "
total_time=0
success=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3001/api/pages" 2>/dev/null || echo "0")
  if [ "$response_time" != "0" ]; then
    total_time=$(echo "$total_time + $response_time" | bc)
    success=$((success + 1))
  fi
done
if [ $success -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success * 1000" | bc)
  echo -e "${GREEN}${avg_time}ms${NC}"
  API_RESULTS="$API_RESULTS\"pages\": {\"avg_ms\": $avg_time, \"requests\": $success},"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. CACHE PERFORMANCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${GREEN}[2/6]${NC} 💾 Testing Cache Performance..."

# Get cache stats
CACHE_STATS=$(curl -s http://localhost:3001/api/health/cache 2>/dev/null | jq -r '.data' 2>/dev/null || echo '{}')
CACHE_HIT_RATE=$(echo "$CACHE_STATS" | jq -r '.hitRate // "0%"' 2>/dev/null)
CACHE_HITS=$(echo "$CACHE_STATS" | jq -r '.hits // 0' 2>/dev/null)
CACHE_MISSES=$(echo "$CACHE_STATS" | jq -r '.misses // 0' 2>/dev/null)

echo "  Hit Rate: $CACHE_HIT_RATE"
echo "  Hits: $CACHE_HITS"
echo "  Misses: $CACHE_MISSES"

CACHE_RESULTS="\"hit_rate\": \"$CACHE_HIT_RATE\", \"hits\": $CACHE_HITS, \"misses\": $CACHE_MISSES"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. DATABASE METRICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${GREEN}[3/6]${NC} 🗄️  Collecting Database Metrics..."

DB_HEALTH=$(curl -s http://localhost:3001/api/health/database 2>/dev/null | jq -r '.data' 2>/dev/null || echo '{}')
DB_RESPONSE_TIME=$(echo "$DB_HEALTH" | jq -r '.response_time // 0' 2>/dev/null)
DB_STATUS=$(echo "$DB_HEALTH" | jq -r '.status // "unknown"' 2>/dev/null)

echo "  Status: $DB_STATUS"
echo "  Response Time: ${DB_RESPONSE_TIME}ms"

DB_RESULTS="\"status\": \"$DB_STATUS\", \"response_time_ms\": $DB_RESPONSE_TIME"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. BUNDLE SIZE ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${GREEN}[4/6]${NC} 📦 Analyzing Bundle Sizes..."

# Check if .next directory exists
if [ -d "$PROJECT_ROOT/my-frontend/.next" ]; then
  # Super Admin bundle size
  SUPER_ADMIN_SIZE=0
  if [ -d "$PROJECT_ROOT/my-frontend/.next/static/chunks/app/super-admin" ]; then
    SUPER_ADMIN_SIZE=$(du -sh "$PROJECT_ROOT/my-frontend/.next/static/chunks/app/super-admin" 2>/dev/null | awk '{print $1}' || echo "0")
  fi
  
  # Total .next size
  NEXT_TOTAL_SIZE=$(du -sh "$PROJECT_ROOT/my-frontend/.next" 2>/dev/null | awk '{print $1}' || echo "0")
  
  echo "  Super Admin Bundle: $SUPER_ADMIN_SIZE"
  echo "  Total .next Size: $NEXT_TOTAL_SIZE"
  
  BUNDLE_RESULTS="\"super_admin\": \"$SUPER_ADMIN_SIZE\", \"total_next\": \"$NEXT_TOTAL_SIZE\""
else
  echo -e "  ${YELLOW}Build not found - run 'cd my-frontend && npm run build'${NC}"
  BUNDLE_RESULTS="\"status\": \"not_built\""
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. STORAGE USAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${GREEN}[5/6]${NC} 💿 Checking Storage Usage..."

PROJECT_SIZE=$(du -sh "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}' || echo "0")
BACKEND_SIZE=$(du -sh "$PROJECT_ROOT/my-backend" 2>/dev/null | awk '{print $1}' || echo "0")
FRONTEND_SIZE=$(du -sh "$PROJECT_ROOT/my-frontend" 2>/dev/null | awk '{print $1}' || echo "0")
NODE_MODULES_SIZE=$(du -sh "$PROJECT_ROOT/my-frontend/node_modules" 2>/dev/null | awk '{print $1}' || echo "0")

# Count log files
LOG_COUNT=0
LOG_SIZE="0"
if [ -d "$PROJECT_ROOT/my-backend/logs" ]; then
  LOG_COUNT=$(find "$PROJECT_ROOT/my-backend/logs" -type f 2>/dev/null | wc -l | tr -d ' ')
  LOG_SIZE=$(du -sh "$PROJECT_ROOT/my-backend/logs" 2>/dev/null | awk '{print $1}' || echo "0")
fi

echo "  Total Project: $PROJECT_SIZE"
echo "  Backend: $BACKEND_SIZE"
echo "  Frontend: $FRONTEND_SIZE"
echo "  node_modules: $NODE_MODULES_SIZE"
echo "  Logs: $LOG_SIZE ($LOG_COUNT files)"

STORAGE_RESULTS="\"total\": \"$PROJECT_SIZE\", \"backend\": \"$BACKEND_SIZE\", \"frontend\": \"$FRONTEND_SIZE\", \"node_modules\": \"$NODE_MODULES_SIZE\", \"logs\": {\"size\": \"$LOG_SIZE\", \"count\": $LOG_COUNT}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. LIGHTHOUSE METRICS (if available)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${GREEN}[6/6]${NC} 🏠 Lighthouse Metrics..."

LIGHTHOUSE_RESULTS="\"status\": \"manual_run_required\", \"note\": \"Run: lighthouse http://localhost:3000/super-admin --output json --output-path benchmarks/lighthouse.json\""

if command -v lighthouse &> /dev/null; then
  echo "  Lighthouse CLI detected - run separately for detailed metrics"
else
  echo -e "  ${YELLOW}Lighthouse CLI not installed${NC}"
  echo "  Install: npm install -g lighthouse"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPILE RESULTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Benchmark Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Build final JSON
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "development",
  "optimization_phase": "post-day1",
  "metrics": {
    "api_latency": {
      ${API_RESULTS%,}
    },
    "cache": {
      $CACHE_RESULTS
    },
    "database": {
      $DB_RESULTS
    },
    "bundle_sizes": {
      $BUNDLE_RESULTS
    },
    "storage": {
      $STORAGE_RESULTS
    },
    "lighthouse": {
      $LIGHTHOUSE_RESULTS
    }
  }
}
EOF

echo ""
echo "📊 Report saved: $REPORT_FILE"
echo ""
echo "📈 Quick View:"
cat "$REPORT_FILE" | jq . 2>/dev/null || cat "$REPORT_FILE"
echo ""

# Create symlink to latest
ln -sf "$REPORT_FILE" "$BENCHMARK_DIR/latest.json"
echo "🔗 Symlink created: $BENCHMARK_DIR/latest.json"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. View report: cat $BENCHMARK_DIR/latest.json | jq ."
echo "  2. Run load test: ./load-test.sh"
echo "  3. Run Lighthouse: lighthouse http://localhost:3000/super-admin --view"
echo "  4. Setup monitoring: See MONITORING_SETUP.md"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
