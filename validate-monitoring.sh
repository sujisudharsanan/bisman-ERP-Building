#!/bin/bash
# Monitoring Stack Validation Script
# Tests all monitoring components and validates setup

set -e

echo "🔍 BISMAN ERP Monitoring Stack Validation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

function check_metrics() {
    local name=$1
    local url=$2
    local metric=$3
    
    echo -n "Checking $name metrics ($metric)... "
    
    if curl -sf "$url" | grep -q "$metric"; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

echo "📦 1. Docker Container Status"
echo "-----------------------------"
docker-compose -f docker-compose.monitoring.yml ps

echo ""
echo "🌐 2. Service Health Checks"
echo "---------------------------"

check_service "Prometheus" "http://localhost:9090/-/healthy" || echo "  Error: Prometheus not responding"
check_service "Grafana" "http://localhost:3001/api/health" || echo "  Error: Grafana not responding"
check_service "cAdvisor" "http://localhost:8080/healthz" || echo "  Error: cAdvisor not responding"

echo ""
echo "📊 3. Metrics Endpoint Validation"
echo "----------------------------------"

check_metrics "Backend" "http://localhost:3000/metrics" "bisman_erp_http_requests_total" || echo "  Error: Backend metrics missing"
check_metrics "Node Exporter" "http://localhost:9100/metrics" "node_cpu_seconds_total" || echo "  Error: Node exporter metrics missing"
check_metrics "Postgres Exporter" "http://localhost:9187/metrics" "pg_stat_database" || echo "  Error: Postgres metrics missing"
check_metrics "Redis Exporter" "http://localhost:9121/metrics" "redis_commands_total" || echo "  Error: Redis metrics missing"

echo ""
echo "🎯 4. Prometheus Target Status"
echo "-------------------------------"

targets=$(curl -sf http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | "\(.labels.job): \(.health)"')
echo "$targets"

echo ""
echo "🚨 5. Alert Rules Status"
echo "------------------------"

rules=$(curl -sf http://localhost:9090/api/v1/rules | jq -r '.data.groups[].rules[] | "\(.name): \(.state)"')
echo "$rules"

echo ""
echo "📈 6. Sample Query Tests"
echo "------------------------"

echo -n "Testing request rate query... "
if curl -sf 'http://localhost:9090/api/v1/query?query=rate(bisman_erp_http_requests_total[5m])' | jq -e '.data.result' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "Testing CPU usage query... "
if curl -sf 'http://localhost:9090/api/v1/query?query=100-(avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))*100)' | jq -e '.data.result' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo "🎨 7. Grafana Dashboard Status"
echo "-------------------------------"

dashboards=$(curl -sf -u admin:admin http://localhost:3001/api/search?type=dash-db | jq -r '.[] | "\(.title): \(.uid)"')
echo "$dashboards"

echo ""
echo "📋 8. Configuration Summary"
echo "---------------------------"
echo "Prometheus retention: $(docker exec erp-prometheus cat /etc/prometheus/prometheus.yml | grep retention || echo '30d')"
echo "Scrape interval: $(docker exec erp-prometheus cat /etc/prometheus/prometheus.yml | grep scrape_interval | head -1)"
echo "Alert rules loaded: $(curl -sf http://localhost:9090/api/v1/rules | jq '.data.groups | length')"

echo ""
echo "✅ Validation Complete!"
echo ""
echo "Next steps:"
echo "1. Access Grafana: http://localhost:3001 (admin/admin)"
echo "2. View Prometheus: http://localhost:9090"
echo "3. Check metrics: http://localhost:3000/metrics"
echo ""
echo "For detailed documentation, see: MONITORING_SETUP_GUIDE.md"
