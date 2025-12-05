# BISMAN ERP - Service Level Agreement (SLA) Metrics

## Overview

This document defines the Service Level Objectives (SLOs), error budgets, and monitoring strategy for BISMAN ERP to ensure consistent availability and performance.

---

## 1. Service Level Objectives (SLOs)

### 1.1 Availability SLO

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Availability** | 99.9% | Monthly |
| **Uptime** | ~43.2 minutes downtime/month max | Rolling 30 days |

**Definition**: Availability = (Successful Requests / Total Requests) × 100

A request is considered **successful** if:
- HTTP status code is 2xx or 3xx
- Response time < 30 seconds
- No connection timeout

### 1.2 Latency SLOs

| Percentile | Target | Applies To |
|------------|--------|------------|
| **p50 (median)** | < 200ms | All API endpoints |
| **p95** | < 1s | All API endpoints |
| **p99** | < 2s | All API endpoints |

### 1.3 Error Rate SLOs

| Metric | Target | Window |
|--------|--------|--------|
| **5xx Error Rate** | < 0.1% | 5-minute rolling |
| **4xx Error Rate** | < 5% | 5-minute rolling (client errors) |

---

## 2. Error Budget

### 2.1 Calculation

```
Monthly Error Budget = 100% - SLO Target
                     = 100% - 99.9%
                     = 0.1%

In minutes: 30 days × 24 hours × 60 min × 0.1% = 43.2 minutes/month
In requests: If 1M requests/month, budget = 1,000 failed requests
```

### 2.2 Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal operations, feature development prioritized |
| 25-50% | Caution, prioritize reliability work |
| 10-25% | Freeze non-critical deployments |
| < 10% | Emergency mode, all hands on reliability |
| 0% (Exhausted) | Feature freeze, post-mortem required |

### 2.3 Error Budget Tracking

```yaml
# Monthly error budget dashboard
error_budget:
  slo_target: 99.9
  budget_total_minutes: 43.2
  budget_consumed_minutes: 12.5
  budget_remaining_percent: 71.1
  current_availability: 99.97
  days_remaining_in_period: 18
```

---

## 3. Metrics to Track

### 3.1 Core SLI Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by status, method, endpoint |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `request_success_rate` | Gauge | Calculated success rate (2xx+3xx / total) |
| `error_rate_5xx` | Gauge | Server error rate |

### 3.2 Database Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `db_connection_pool_size` | Gauge | Current connection pool size |
| `db_connection_errors_total` | Counter | Database connection failures |
| `db_query_duration_seconds` | Histogram | Query execution time |
| `db_connection_wait_seconds` | Histogram | Time waiting for connection |

### 3.3 Infrastructure Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `backup_success_total` | Counter | Successful backup completions |
| `backup_failure_total` | Counter | Failed backup attempts |
| `backup_last_success_timestamp` | Gauge | Unix timestamp of last successful backup |
| `backup_size_bytes` | Gauge | Size of last backup |

### 3.4 Business Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `tenant_api_calls_total` | Counter | API calls per tenant |
| `active_users_gauge` | Gauge | Currently active users |
| `tenant_quota_exceeded_total` | Counter | Rate limit violations |

---

## 4. Prometheus Query Examples

### 4.1 Availability & Success Rate

```promql
# Request success rate (last 5 minutes)
sum(rate(http_requests_total{status=~"2..|3.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100

# 5xx error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100

# Availability over 30 days (for SLO tracking)
avg_over_time(
  (
    sum(rate(http_requests_total{status=~"2..|3.."}[5m])) 
    / 
    sum(rate(http_requests_total[5m]))
  )[30d:1h]
) * 100
```

### 4.2 Latency Percentiles

```promql
# p50 latency
histogram_quantile(0.50, 
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)

# p95 latency
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)

# p99 latency
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)

# p95 latency by endpoint
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le, endpoint)
)
```

### 4.3 Database Health

```promql
# Database connection errors rate
rate(db_connection_errors_total[5m])

# Connection pool utilization
db_connection_pool_active / db_connection_pool_size * 100

# Average query duration
rate(db_query_duration_seconds_sum[5m]) 
/ 
rate(db_query_duration_seconds_count[5m])

# Slow queries (> 1s)
sum(rate(db_query_duration_seconds_bucket{le="1"}[5m])) 
/ 
sum(rate(db_query_duration_seconds_count[5m]))
```

### 4.4 Backup Health

```promql
# Hours since last successful backup
(time() - backup_last_success_timestamp) / 3600

# Backup success rate (last 7 days)
sum(increase(backup_success_total[7d])) 
/ 
(sum(increase(backup_success_total[7d])) + sum(increase(backup_failure_total[7d]))) * 100
```

### 4.5 Error Budget Consumption

```promql
# Error budget consumed (percentage of 0.1% budget used)
(
  1 - (
    sum(rate(http_requests_total{status=~"2..|3.."}[30d])) 
    / 
    sum(rate(http_requests_total[30d]))
  )
) / 0.001 * 100

# Error budget remaining (minutes)
43.2 * (1 - (
  (1 - avg_over_time(request_success_rate[30d])) / 0.001
))
```

---

## 5. Alert Rules

See `monitoring/alerts/sla_alerts.yml` for complete Prometheus alerting rules.

### 5.1 Critical Alerts (PagerDuty)

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| High5xxErrorRate | > 1% | 5m | critical |
| HighP95Latency | > 2s | 5m | critical |
| ServiceDown | availability < 95% | 2m | critical |
| DatabaseUnreachable | connection errors > 10/min | 1m | critical |

### 5.2 Warning Alerts (Slack)

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| Elevated5xxRate | > 0.5% | 10m | warning |
| ElevatedLatency | p95 > 1s | 10m | warning |
| ErrorBudgetLow | < 25% remaining | 1h | warning |
| BackupStale | > 24h since last | 30m | warning |

### 5.3 Info Alerts (Dashboard)

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| ErrorBudgetBurnRate | consuming > 2x normal | 1h | info |
| TrafficSpike | 2x normal request rate | 5m | info |

---

## 6. Grafana Dashboard

See `monitoring/grafana/dashboards/sla_dashboard.json` for complete dashboard.

### 6.1 Dashboard Panels

1. **SLO Overview** (Stat panels)
   - Current Availability %
   - Error Budget Remaining %
   - p95 Latency (current)
   - Active Incidents

2. **Availability Timeline** (Time series)
   - Availability over time with 99.9% SLO line

3. **Latency Distribution** (Heatmap)
   - Request latency distribution over time

4. **Error Rate** (Time series)
   - 5xx and 4xx error rates with thresholds

5. **Error Budget Burn** (Gauge)
   - Visual representation of budget consumption

6. **Top Slow Endpoints** (Table)
   - Endpoints with highest p95 latency

7. **Database Health** (Stat + Time series)
   - Connection pool, query latency, errors

8. **Backup Status** (Stat)
   - Last backup time, success rate

---

## 7. Incident Response

### 7.1 Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| SEV1 | Complete outage | 5 minutes | All requests failing |
| SEV2 | Major degradation | 15 minutes | > 5% error rate |
| SEV3 | Minor degradation | 1 hour | Elevated latency |
| SEV4 | Cosmetic/Minor | 24 hours | Dashboard issues |

### 7.2 Escalation Path

```
SEV1/2: On-call Engineer → Tech Lead → CTO (if > 30 min)
SEV3:   On-call Engineer → Tech Lead (if > 4 hours)
SEV4:   Normal ticket queue
```

---

## 8. SLA Reporting

### 8.1 Monthly SLA Report Template

```markdown
# BISMAN ERP - SLA Report - [Month Year]

## Executive Summary
- **Availability**: 99.97% (Target: 99.9%) ✅
- **Error Budget Used**: 28.5% (12.3 minutes)
- **Incidents**: 2 (1 SEV2, 1 SEV3)

## Availability Breakdown
| Week | Availability | Downtime |
|------|-------------|----------|
| Week 1 | 100% | 0m |
| Week 2 | 99.95% | 7.2m |
| Week 3 | 99.98% | 2.9m |
| Week 4 | 99.97% | 4.3m |

## Latency Performance
- p50: 145ms (target: <200ms) ✅
- p95: 780ms (target: <1s) ✅
- p99: 1.2s (target: <2s) ✅

## Incidents
1. [Date] - SEV2 - Database connection pool exhausted (7.2m)
2. [Date] - SEV3 - Elevated latency due to traffic spike (2.9m)

## Action Items
- [ ] Increase connection pool size
- [ ] Add auto-scaling for traffic spikes
```

---

## 9. SLA Contractual Terms (For Enterprise Customers)

### 9.1 Service Credits

| Monthly Availability | Credit |
|---------------------|--------|
| 99.9% - 99.99% | 0% |
| 99.0% - 99.9% | 10% |
| 95.0% - 99.0% | 25% |
| < 95.0% | 50% |

### 9.2 Exclusions

The following are excluded from SLA calculations:
- Scheduled maintenance (announced 48h in advance)
- Force majeure events
- Customer-caused issues
- Third-party service outages (AWS, etc.)
- Features explicitly marked as "Beta"

---

## Appendix: Metric Labels

### Standard Labels

| Label | Values | Description |
|-------|--------|-------------|
| `job` | backend, frontend, worker | Service name |
| `instance` | hostname:port | Server instance |
| `method` | GET, POST, PUT, DELETE | HTTP method |
| `status` | 200, 400, 500, etc. | HTTP status code |
| `endpoint` | /api/users, /api/orders | API endpoint |
| `tenant_id` | UUID | Tenant identifier |
