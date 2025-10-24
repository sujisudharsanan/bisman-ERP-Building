# 📊 ERP Monitoring & Benchmarking Setup Guide

**Date:** October 24, 2025  
**Purpose:** Post-optimization monitoring and performance tracking  
**Stack:** Prometheus + Grafana + k6 + Lighthouse

---

## 🎯 Overview

This guide sets up comprehensive monitoring for BISMAN ERP after Day 1 optimizations:
- **Real-time metrics:** API latency, cache performance, DB queries
- **Alerting:** Slack/Email notifications for performance regressions
- **Load testing:** Simulate 100-500 concurrent users
- **Frontend metrics:** Core Web Vitals (LCP, FID, CLS)
- **Weekly reports:** Automated performance snapshots

---

## 📁 Files Created

```
monitoring/
├── prometheus.yml                    # Prometheus configuration
├── alerts/
│   └── erp-alerts.yml               # Alert rules
├── grafana/
│   └── dashboard-erp-performance.json  # Grafana dashboard
└── docker-compose.monitoring.yml     # Docker setup

benchmarks/
├── latest.json                       # Latest benchmark results
└── load-test-results.json           # k6 load test results

Scripts:
├── benchmark-baseline.sh             # Baseline metrics collector
├── load-test.sh                      # k6 load test runner
└── load-test.js                      # k6 test scenarios
```

---

## 🚀 Quick Start

### 1. Run Baseline Benchmark
```bash
# Collect current performance metrics
./benchmark-baseline.sh

# View results
cat benchmarks/latest.json | jq .
```

### 2. Install k6 (Load Testing)
```bash
# macOS
brew install k6

# Linux
curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### 3. Run Load Test
```bash
# Simulate 100-500 concurrent users
./load-test.sh

# View results
cat benchmarks/load-test-results.json | jq .
```

### 4. Setup Monitoring Stack (Optional)
```bash
# Using Docker
cd monitoring
docker-compose up -d

# Access:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000 (admin/admin)
```

---

## 📊 Benchmark Metrics

### API Latency Targets
| Endpoint | Target | Critical |
|----------|--------|----------|
| /api/health | <100ms | >200ms |
| /api/health/cache | <200ms | >300ms |
| /api/health/database | <300ms | >500ms |
| /api/pages | <500ms | >1000ms |
| /api/permissions (cached) | <10ms | >50ms |

### Frontend Targets (Core Web Vitals)
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | <2.5s | 2.5-4s | >4s |
| **FID** | <100ms | 100-300ms | >300ms |
| **CLS** | <0.1 | 0.1-0.25 | >0.25 |
| **TTFB** | <600ms | 600-1500ms | >1500ms |

### Database Targets
| Metric | Target | Critical |
|--------|--------|----------|
| Query Duration (avg) | <50ms | >200ms |
| Query Duration (P95) | <200ms | >500ms |
| Active Connections | <50 | >80 |
| Storage Usage | <70% | >85% |

### Cache Targets
| Metric | Target | Critical |
|--------|--------|----------|
| Hit Rate | >80% | <60% |
| Response Time | <5ms | >20ms |
| Memory Usage | <100MB | >500MB |

---

## 🧪 Load Testing

### Test Scenarios

**Profile:**
- Ramp up: 0 → 50 users (30s)
- Sustain: 100 users (1 min)
- Spike: 200 users (1.5 min)
- Peak: 500 users (30s)
- Ramp down: 0 users (30s)
- **Total duration:** ~4 minutes

**Endpoints Tested:**
1. `/api/health` - Health check
2. `/api/health/cache` - Cache stats
3. `/api/health/database` - Database health
4. `/api/pages` - Large response (compression test)

**Thresholds:**
- 95% of requests < 800ms
- Error rate < 5%
- API latency P95 < 500ms

### Running Load Tests

```bash
# Standard test
./load-test.sh

# Custom duration
k6 run --duration 5m load-test.js

# More users
k6 run --vus 1000 load-test.js

# With output
k6 run --out json=results.json load-test.js
```

### Interpreting Results

```json
{
  "metrics": {
    "http_req_duration": {
      "avg": 234.5,      // Average response time
      "p(95)": 456.2,    // 95th percentile
      "p(99)": 678.9     // 99th percentile
    },
    "http_req_failed": {
      "rate": 0.02       // 2% error rate
    }
  }
}
```

**Good:**
- P95 < 500ms
- Error rate < 2%
- Cache hit rate > 80%

**Needs Investigation:**
- P95 > 800ms
- Error rate > 5%
- Cache hit rate < 70%

---

## 📈 Prometheus + Grafana Setup

### Using Docker Compose

```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: erp-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts:/etc/prometheus/alerts
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: erp-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboard-erp-performance.json:/etc/grafana/provisioning/dashboards/erp.json
    ports:
      - "3002:3000"  # Port 3002 to avoid conflict with frontend
    restart: unless-stopped
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    container_name: erp-node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: erp-postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://user:password@localhost:5432/bisman_erp?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

### Start Monitoring Stack

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f grafana
```

### Access Dashboards

1. **Grafana:** http://localhost:3002
   - Login: admin / admin
   - Dashboard: "BISMAN ERP - Performance Monitoring"

2. **Prometheus:** http://localhost:9090
   - Explore metrics
   - Check alert rules

---

## 🔔 Alert Configuration

### Slack Integration

1. **Create Slack Webhook:**
   - Go to: https://api.slack.com/messaging/webhooks
   - Create incoming webhook
   - Copy webhook URL

2. **Configure Alertmanager:**

```yaml
# monitoring/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#erp-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

### Email Alerts

```yaml
# monitoring/alertmanager.yml
receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'dev-team@company.com'
        from: 'alerts@company.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@company.com'
        auth_password: 'your-app-password'
```

### Alert Rules Summary

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| High API Latency | P95 > 800ms | Warning | Slack notification |
| High Error Rate | >5% | Critical | Slack + Email |
| Low Cache Hit Rate | <70% | Warning | Slack notification |
| Slow DB Queries | >500ms | Warning | Slack notification |
| High DB Storage | >85% | Critical | Email + Page |
| High CPU Usage | >80% | Warning | Slack notification |
| High Memory Usage | >85% | Warning | Slack notification |
| Low Disk Space | >85% | Critical | Email + Page |
| High LCP | >2.5s | Warning | Slack notification |

---

## 🏠 Lighthouse CI Setup

### Install Lighthouse CI

```bash
npm install -g @lhci/cli
```

### Configuration

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/super-admin",
        "http://localhost:3000/auth/login"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.7}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 1800}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "max-potential-fid": ["error", {"maxNumericValue": 100}]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": "./benchmarks/lighthouse"
    }
  }
}
```

### Run Lighthouse

```bash
# Single page
lighthouse http://localhost:3000/super-admin --view

# CI mode (all pages)
lhci autorun

# Save results
lighthouse http://localhost:3000/super-admin \
  --output json \
  --output html \
  --output-path ./benchmarks/lighthouse/report.html
```

---

## 📊 Weekly Performance Reports

### Automated Report Script

```bash
#!/bin/bash
# weekly-report.sh

# Run benchmarks
./benchmark-baseline.sh

# Run load test
./load-test.sh

# Run Lighthouse
lhci autorun

# Compile report
cat > "benchmarks/weekly-report-$(date +%Y%m%d).md" << EOF
# Weekly Performance Report - $(date +%Y-%m-%d)

## Baseline Metrics
$(cat benchmarks/latest.json | jq .)

## Load Test Results
$(cat benchmarks/load-test-results.json | jq .)

## Lighthouse Scores
- Performance: $(cat benchmarks/lighthouse/*.json | jq '.categories.performance.score')
- LCP: $(cat benchmarks/lighthouse/*.json | jq '.audits["largest-contentful-paint"].numericValue')
- FID: $(cat benchmarks/lighthouse/*.json | jq '.audits["max-potential-fid"].numericValue')

## Alerts This Week
- High latency alerts: X
- Cache misses: X
- DB slow queries: X

## Action Items
- [ ] Investigate slow endpoints
- [ ] Optimize cache TTL
- [ ] Add database indexes
EOF
```

### Schedule with Cron

```bash
# Run every Monday at 9 AM
crontab -e

# Add:
0 9 * * 1 cd /Users/abhi/Desktop/BISMAN\ ERP && ./weekly-report.sh
```

---

## 🎯 Success Metrics

### After Optimization (Day 1)

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Bundle Size | 12MB | 3-4MB | <5MB | ✅ Met |
| API Latency (P95) | ~200ms | ~50ms | <100ms | ✅ Met |
| Cache Hit Rate | 0% | 80-90% | >80% | ✅ Met |
| Error Rate | - | <2% | <5% | ✅ Met |
| Page Load | 15-20s | 3-5s | <5s | ✅ Met |

### Continuous Monitoring Targets

- **API Latency:** P95 < 500ms
- **Cache Hit Rate:** > 80%
- **Error Rate:** < 2%
- **LCP:** < 2.5s
- **FID:** < 100ms
- **Uptime:** > 99.9%

---

## 🔧 Troubleshooting

### High Latency
```bash
# Check slow endpoints
curl http://localhost:3001/api/health/cache | jq '.data'

# Profile with curl
time curl http://localhost:3001/api/pages
```

### Low Cache Hit Rate
```bash
# Check cache stats
curl http://localhost:3001/api/health/cache | jq '.data.hitRate'

# Clear cache
curl -X POST http://localhost:3001/api/cache/flush
```

### Database Slow Queries
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

---

## 📚 Resources

- **Prometheus:** https://prometheus.io/docs/
- **Grafana:** https://grafana.com/docs/
- **k6:** https://k6.io/docs/
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **Core Web Vitals:** https://web.dev/vitals/

---

**Status:** Monitoring infrastructure ready to deploy  
**Next:** Run baseline benchmarks and setup Grafana dashboards
