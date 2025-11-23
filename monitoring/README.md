# 📊 BISMAN ERP Monitoring Setup Guide

Complete monitoring infrastructure for performance tracking, alerting, and observability.

## 🎯 Overview

This monitoring stack provides:
- **Real-time metrics** via Prometheus
- **Visualization** via Grafana dashboards
- **Database monitoring** via PostgreSQL exporter
- **Container metrics** via cAdvisor
- **Redis caching metrics**
- **Custom application metrics**

## 🚀 Quick Start

### 1. Start Monitoring Stack
```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. Access Dashboards

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | None |
| **cAdvisor** | http://localhost:8080 | None |

### 3. Install Backend Metrics Dependencies
```bash
cd my-backend
npm install prom-client express-prom-bundle
```

### 4. Add Prometheus Middleware to Backend
Add to `my-backend/index.js` or `my-backend/app.js`:

```javascript
const { createPrometheusMiddleware, metricsHandler } = require('./middleware/prometheus');

// Create middleware
const { 
  metricsMiddleware, 
  connectionTracker, 
  detailedMetrics 
} = createPrometheusMiddleware();

// Apply middleware (order matters!)
app.use(connectionTracker);
app.use(detailedMetrics);
app.use(metricsMiddleware);

// Expose metrics endpoint
app.get('/metrics', metricsHandler);
```

### 5. Add Prisma Query Tracking
Add to your Prisma client initialization:

```javascript
const { PrismaClient } = require('@prisma/client');
const { trackDatabaseQuery } = require('./middleware/prometheus');

const prisma = new PrismaClient();

// Add Prisma middleware to track queries
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = (Date.now() - start) / 1000;
  
  trackDatabaseQuery(params.action, params.model, duration);
  
  return result;
});
```

## 📊 Available Metrics

### Application Metrics
- `bisman_erp_http_request_duration_seconds` - HTTP request latency histogram
- `bisman_erp_http_requests_total` - Total HTTP requests counter
- `bisman_erp_active_connections` - Current active connections gauge
- `bisman_erp_database_query_duration_seconds` - Database query latency histogram
- `bisman_erp_auth_attempts_total` - Authentication attempts counter

### System Metrics (Node Exporter)
- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- System load

### Database Metrics (PostgreSQL Exporter)
- Active connections
- Query duration
- Cache hit ratio
- Transaction rate
- Table sizes
- Index usage

### Redis Metrics
- Memory usage
- Hit/miss rate
- Keys count
- Evicted keys
- Connected clients

### Container Metrics (cAdvisor)
- CPU usage per container
- Memory usage per container
- Network I/O
- Disk I/O

## 🎨 Grafana Dashboard Setup

### Import Pre-built Dashboards

1. **Node.js Application Monitoring**
   - Dashboard ID: 11159
   - URL: https://grafana.com/grafana/dashboards/11159

2. **PostgreSQL Database**
   - Dashboard ID: 9628
   - URL: https://grafana.com/grafana/dashboards/9628

3. **Redis Dashboard**
   - Dashboard ID: 11835
   - URL: https://grafana.com/grafana/dashboards/11835

4. **Docker Container Monitoring**
   - Dashboard ID: 193
   - URL: https://grafana.com/grafana/dashboards/193

### Import Steps
1. Login to Grafana (http://localhost:3001)
2. Go to Dashboards → Import
3. Enter Dashboard ID
4. Select Prometheus data source
5. Click Import

## 🔔 Setting Up Alerts

### Prometheus Alert Rules
Create `monitoring/alerts/api_alerts.yml`:

```yaml
groups:
  - name: api_performance
    interval: 30s
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(bisman_erp_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "P95 latency is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(bisman_erp_http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: DatabaseSlowQueries
        expr: histogram_quantile(0.95, rate(bisman_erp_database_query_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "P95 query duration is {{ $value }}s"
```

### Grafana Alerting
1. Go to Alerting → Alert Rules
2. Create New Alert Rule
3. Configure:
   - Query: `rate(bisman_erp_http_requests_total{status_code=~"5.."}[5m]) > 0.05`
   - Condition: When above 0.05
   - Evaluate: Every 1m for 5m
   - Action: Send notification

## 📈 Key Performance Indicators (KPIs)

### API Performance Dashboard
```promql
# P95 API Response Time
histogram_quantile(0.95, rate(bisman_erp_http_request_duration_seconds_bucket[5m]))

# P99 API Response Time
histogram_quantile(0.99, rate(bisman_erp_http_request_duration_seconds_bucket[5m]))

# Request Rate (RPS)
rate(bisman_erp_http_requests_total[1m])

# Error Rate (%)
rate(bisman_erp_http_requests_total{status_code=~"5.."}[5m]) / rate(bisman_erp_http_requests_total[5m]) * 100
```

### Database Performance
```promql
# Active Connections
pg_stat_database_numbackends

# Cache Hit Ratio
rate(pg_stat_database_blks_hit[5m]) / (rate(pg_stat_database_blks_hit[5m]) + rate(pg_stat_database_blks_read[5m])) * 100

# Query Duration P95
histogram_quantile(0.95, rate(bisman_erp_database_query_duration_seconds_bucket[5m]))
```

### Redis Cache
```promql
# Hit Rate
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100

# Memory Usage
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

## 🚨 Troubleshooting

### Prometheus Not Scraping Targets
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check if metrics endpoint is accessible
curl http://localhost:3000/metrics

# Verify network connectivity
docker-compose -f docker-compose.monitoring.yml exec prometheus ping backend
```

### Grafana Dashboard Not Showing Data
1. Verify Prometheus data source:
   - Go to Configuration → Data Sources
   - Test connection
   - URL should be: http://prometheus:9090

2. Check metric availability:
   - Go to Explore
   - Select Prometheus data source
   - Run query: `up`

### High Memory Usage
```bash
# Check container resource usage
docker stats

# Adjust Prometheus retention
# Edit docker-compose.monitoring.yml:
# --storage.tsdb.retention.time=15d  # Reduce from 30d
```

## 📱 Railway Deployment

### Add Redis to Railway
```bash
# In Railway dashboard
1. Add new service → Redis
2. Copy connection URL
3. Add to backend environment variables:
   REDIS_URL=redis://...
```

### Monitoring in Production
For Railway deployment, consider:
1. **Railway Metrics** - Built-in metrics (CPU, Memory, Network)
2. **External Monitoring**:
   - Sentry for error tracking
   - New Relic for APM
   - Datadog for full observability
3. **Log Aggregation**:
   - Railway logs
   - External: Loggly, Papertrail

## 🎯 Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API P95 Response Time | < 400ms | < 800ms | > 1500ms |
| API Error Rate | < 0.5% | < 2% | > 5% |
| Database Query P95 | < 50ms | < 200ms | > 500ms |
| Redis Hit Rate | > 85% | > 70% | < 50% |
| CPU Usage | < 60% | < 80% | > 90% |
| Memory Usage | < 70% | < 85% | > 95% |

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Best Practices - Monitoring](https://github.com/goldbergyoni/nodebestpractices#6-monitoring)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)
- [BISMAN ERP Performance Audit](../ERP_PERFORMANCE_AUDIT_ISO_STANDARD.md)

## 🔄 Maintenance

### Daily
- Check Grafana dashboards for anomalies
- Review error rates and latency

### Weekly
- Review alert history
- Analyze slow queries
- Check disk space

### Monthly
- Review retention policies
- Update dashboards
- Capacity planning review

---

**Last Updated:** November 24, 2025  
**Maintained By:** BISMAN ERP DevOps Team
