# 🚀 BISMAN ERP Performance Testing Suite

This directory contains performance, load, and stress tests for the BISMAN ERP system based on ISO/IEC 25010 standards.

## 📋 Prerequisites

### Install k6
```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6:latest
```

## 🎯 Test Suites

### 1. Load Test (`k6-load-test.js`)
Tests normal to high load scenarios with gradual ramp-up.

**Run:**
```bash
# Basic run
k6 run k6-load-test.js

# With custom base URL
k6 run -e BASE_URL=https://your-erp.railway.app k6-load-test.js

# With custom VUs and duration
k6 run --vus 50 --duration 5m k6-load-test.js

# Output to InfluxDB (if configured)
k6 run --out influxdb=http://localhost:8086/k6 k6-load-test.js
```

**Test Scenarios:**
- Authentication flow
- Dashboard API calls
- User management operations
- Report generation

**Performance Targets:**
- P95 < 500ms
- P99 < 1000ms
- Error rate < 1%

### 2. Stress Test (`stress-test.js`)
Pushes the system to find breaking points.

**Run:**
```bash
k6 run stress-test.js

# With custom URL
k6 run -e BASE_URL=https://your-erp.railway.app stress-test.js
```

**Test Profile:**
- Ramps up to 1000 concurrent users
- Tests system recovery
- Identifies breaking points

**Tolerance:**
- P99 < 5s under stress
- Error rate < 10% under stress

## 📊 Results Analysis

### View Results
After running tests, check:
- `performance-summary.json` - Detailed metrics
- `stress-test-results.json` - Stress test data

### Key Metrics to Monitor
1. **HTTP Request Duration (P95, P99)**
2. **Error Rate (%)**
3. **Requests Per Second (RPS)**
4. **Virtual Users (VUs) at breaking point**

### Performance Grading
- 🟢 **GREEN:** P95 < 500ms, errors < 1%
- 🟡 **AMBER:** P95 < 1000ms, errors < 5%
- 🔴 **RED:** P95 > 1000ms, errors > 5%

## 🔧 CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Tests

on:
  push:
    branches: [main, staging]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
      
      - name: Run load test
        run: ./k6 run performance-tests/k6-load-test.js -e BASE_URL=${{ secrets.STAGING_URL }}
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-summary.json
```

## 🎨 Grafana Dashboard

### Setup with k6 Cloud (Easiest)
```bash
# Sign up at k6.io and get your token
k6 login cloud --token YOUR_TOKEN

# Run with cloud output
k6 cloud k6-load-test.js
```

### Self-Hosted with InfluxDB + Grafana
```bash
# Start InfluxDB and Grafana
docker-compose up -d

# Run test with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 k6-load-test.js

# Access Grafana at http://localhost:3000 (admin/admin)
```

## 📈 Performance Benchmarks

### ISO/IEC 25010 Compliance
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| TTFB | < 200ms | < 500ms | > 1000ms |
| API Response (P95) | < 400ms | < 800ms | > 1500ms |
| Error Rate | < 0.5% | < 2% | > 5% |
| Throughput | > 100 RPS | > 50 RPS | < 20 RPS |

### Enterprise SaaS Benchmarks
- **SAP S/4HANA:** P95 < 400ms, 99.95% uptime
- **Oracle NetSuite:** P95 < 300ms, 99.98% uptime
- **Workday:** P95 < 500ms, 99.7% uptime

## 🚨 Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Check if API is running
curl https://your-erp.railway.app/api/health

# Verify Railway deployment status
railway status
```

**2. High Error Rate**
- Check rate limiting configuration
- Verify test user credentials
- Review backend logs

**3. Slow Response Times**
- Check database connection pool
- Verify Redis caching is enabled
- Review backend resource limits

## 📝 Creating Custom Tests

### Basic Template
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  const res = http.get('https://your-api.com/endpoint');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

### Advanced with Scenarios
```javascript
export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'readScenario',
    },
    write_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      exec: 'writeScenario',
    },
  },
};

export function readScenario() {
  // Read operations
}

export function writeScenario() {
  // Write operations
}
```

## 🎯 Next Steps

1. ✅ Run baseline load test
2. ✅ Document current performance
3. ✅ Implement quick wins (Redis caching, rate limiting)
4. ✅ Re-run tests to measure improvement
5. ✅ Set up continuous monitoring
6. ✅ Schedule weekly automated tests

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [ISO/IEC 25010 Standard](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- [Google Web Vitals](https://web.dev/vitals/)
- [BISMAN ERP Performance Audit](../ERP_PERFORMANCE_AUDIT_ISO_STANDARD.md)

---

**Last Updated:** November 24, 2025  
**Maintained By:** BISMAN ERP DevOps Team
