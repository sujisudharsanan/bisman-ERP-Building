# 🎯 BISMAN ERP Performance Monitoring Stack
## 100% Free, Enterprise-Grade Observability

**Last Updated:** November 24, 2025  
**Stack:** Prometheus + Grafana + Custom Metrics  
**Standards:** OpenMetrics, OpenTelemetry, RED Method, USE Method  
**Cost:** $0/month (fully open-source)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Components](#components)
5. [Metrics Exposed](#metrics-exposed)
6. [Dashboards](#dashboards)
7. [Alerting](#alerting)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## 🔍 Overview

This monitoring setup provides **production-grade observability** for the BISMAN ERP system with:

- ✅ **Real-time metrics** collection (15s intervals)
- ✅ **Custom ERP business metrics** (API latency, DB queries, auth attempts)
- ✅ **System monitoring** (CPU, memory, disk, network)
- ✅ **Database observability** (PostgreSQL queries, connections, cache hit ratio)
- ✅ **Redis caching metrics** (hit rate, memory usage, command throughput)
- ✅ **Container metrics** (Docker resource usage per service)
- ✅ **Automated alerting** (High CPU, slow APIs, DB delays)
- ✅ **Beautiful dashboards** (3 pre-built Grafana dashboards)
- ✅ **30-day retention** (configurable)

### International Standards Compliance

- **OpenMetrics**: Industry-standard exposition format
- **RED Method**: Rate, Errors, Duration for services
- **USE Method**: Utilization, Saturation, Errors for resources
- **Four Golden Signals**: Latency, Traffic, Errors, Saturation
- **ISO/IEC 25010**: Performance efficiency, reliability, maintainability

---

## 🏗️ Architecture

```
┌─────────────────┐
│  BISMAN ERP     │
│  Backend        │──┐
│  (Node.js)      │  │
│  Port: 3000     │  │
│  /metrics       │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │
│  PostgreSQL     │  │
│  Port: 5432     │  │
└─────────────────┘  │
        │            │
        ▼            │
┌─────────────────┐  │      ┌──────────────────┐
│  Postgres       │  │      │   Prometheus     │
│  Exporter       │──┼─────▶│   Port: 9090     │
│  Port: 9187     │  │      │   (Scraper)      │
└─────────────────┘  │      └──────────────────┘
                     │               │
┌─────────────────┐  │               │
│  Redis          │  │               │
│  Port: 6379     │  │               ▼
└─────────────────┘  │      ┌──────────────────┐
        │            │      │   Grafana        │
        ▼            │      │   Port: 3001     │
┌─────────────────┐  │      │   (Dashboards)   │
│  Redis          │  │      └──────────────────┘
│  Exporter       │──┤
│  Port: 9121     │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │
│  Node Exporter  │──┤
│  (System)       │  │
│  Port: 9100     │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │
│  cAdvisor       │──┘
│  (Containers)   │
│  Port: 8080     │
└─────────────────┘
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend: Add Prometheus client libraries
cd my-backend
npm install prom-client express-prom-bundle
```

### 2. Start Monitoring Stack

```bash
# From project root
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. Access Interfaces

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | None |
| cAdvisor | http://localhost:8080 | None |

### 4. Verify Metrics Collection

```bash
# Check if backend metrics are exposed
curl http://localhost:3000/metrics

# Check if Prometheus is scraping
curl http://localhost:9090/api/v1/targets
```

---

## 🧩 Components

### 1. **Prometheus** (Metrics Storage & Query Engine)
- **Image:** `prom/prometheus:latest`
- **Port:** 9090
- **Retention:** 30 days
- **Config:** `prometheus.yml`
- **Alerts:** `monitoring/alerts/erp-alerts.yml`

### 2. **Grafana** (Visualization & Dashboards)
- **Image:** `grafana/grafana:latest`
- **Port:** 3001
- **Dashboards:** Auto-provisioned from `monitoring/grafana/dashboards/`
- **Default Login:** admin/admin (⚠️ Change in production!)

### 3. **PostgreSQL Exporter**
- **Image:** `prometheuscommunity/postgres-exporter:latest`
- **Port:** 9187
- **Metrics:** Connections, queries, transactions, cache hits

### 4. **Redis Exporter**
- **Image:** `oliver006/redis_exporter:latest`
- **Port:** 9121
- **Metrics:** Memory usage, commands/sec, keyspace hits/misses

### 5. **Node Exporter** (System Metrics)
- **Image:** `prom/node-exporter:latest`
- **Port:** 9100
- **Metrics:** CPU, memory, disk, network, file descriptors

### 6. **cAdvisor** (Container Metrics)
- **Image:** `gcr.io/cadvisor/cadvisor:latest`
- **Port:** 8080
- **Metrics:** Container CPU, memory, network per service

---

## 📊 Metrics Exposed

### Backend Application Metrics (`/metrics`)

| Metric | Type | Description |
|--------|------|-------------|
| `bisman_erp_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `bisman_erp_http_request_duration_seconds` | Histogram | Request duration in seconds (P50/P95/P99) |
| `bisman_erp_active_connections` | Gauge | Current active connections |
| `bisman_erp_database_query_duration_seconds` | Histogram | DB query latency by operation & table |
| `bisman_erp_auth_attempts_total` | Counter | Authentication attempts (success/failure) |
| `process_cpu_seconds_total` | Counter | Process CPU usage |
| `process_resident_memory_bytes` | Gauge | Process memory usage |
| `nodejs_eventloop_lag_seconds` | Gauge | Node.js event loop lag |
| `nodejs_heap_size_used_bytes` | Gauge | Node.js heap memory used |

### Database Metrics (PostgreSQL Exporter)

- `pg_stat_database_numbackends` - Active connections
- `pg_stat_database_xact_commit` - Transaction commits
- `pg_stat_database_xact_rollback` - Transaction rollbacks
- `pg_stat_database_tup_fetched` - Rows fetched
- `pg_stat_database_blks_hit` - Cache hits
- `pg_database_size_bytes` - Database size

### Cache Metrics (Redis Exporter)

- `redis_memory_used_bytes` - Memory usage
- `redis_commands_total` - Commands executed
- `redis_keyspace_hits_total` - Cache hits
- `redis_keyspace_misses_total` - Cache misses
- `redis_connected_clients` - Connected clients

### System Metrics (Node Exporter)

- `node_cpu_seconds_total` - CPU time by mode
- `node_memory_MemAvailable_bytes` - Available memory
- `node_filesystem_avail_bytes` - Available disk space
- `node_network_receive_bytes_total` - Network RX
- `node_network_transmit_bytes_total` - Network TX

---

## 📈 Dashboards

### 1. **System Overview** (`01-system-overview.json`)

**What it shows:**
- CPU, Memory, Disk usage gauges
- API request rate over time
- API response time (P95)
- Database connections
- Redis memory usage

**When to use:** Daily health checks, capacity planning

### 2. **API Performance** (`02-api-performance.json`)

**What it shows:**
- Request rate by endpoint & method
- Latency distribution (P50/P95/P99)
- Error rate (4xx vs 5xx)
- Active connections
- Authentication success/failure
- Database query performance
- Top 10 slowest endpoints

**When to use:** Performance tuning, debugging slow APIs

### 3. **Database & Cache Metrics** (`03-database-cache.json`)

**What it shows:**
- PostgreSQL connections & limits
- Transaction commit/rollback rate
- Database throughput (reads/writes)
- Cache vs disk block reads
- Redis command rate
- Redis cache hit ratio
- Database size growth

**When to use:** Database optimization, cache tuning

---

## 🚨 Alerting

### Configured Alerts

| Alert | Threshold | Severity | Description |
|-------|-----------|----------|-------------|
| **HighAPILatency** | P95 > 800ms for 2m | Warning | API response time degraded |
| **HighErrorRate** | Error rate > 5% for 2m | Critical | High 5xx errors |
| **LowCacheHitRate** | Hit rate < 70% for 5m | Warning | Redis cache inefficient |
| **SlowDatabaseQueries** | Query time > 500ms for 2m | Warning | DB performance issue |
| **HighDatabaseStorage** | Storage > 85% for 5m | Critical | Disk space low |
| **HighDatabaseConnections** | Connections > 80 for 2m | Warning | Connection pool exhausted |
| **HighCPUUsage** | CPU > 80% for 2m | Warning | System under load |
| **HighMemoryUsage** | Memory > 85% for 2m | Warning | Memory pressure |
| **HighDiskUsage** | Disk > 85% for 5m | Critical | Disk space critical |

### Alert Configuration

Alerts are defined in `monitoring/alerts/erp-alerts.yml` and evaluated every 30s by Prometheus.

**To test alerts:**

```bash
# Trigger high CPU alert (run stress test)
stress --cpu 4 --timeout 180s

# Check firing alerts in Prometheus
open http://localhost:9090/alerts
```

### Alert Integration (Optional)

To receive notifications (Slack, Email, PagerDuty), configure Alertmanager:

```bash
# Add to docker-compose.monitoring.yml
alertmanager:
  image: prom/alertmanager:latest
  ports:
    - "9093:9093"
  volumes:
    - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
```

---

## 🛠️ Maintenance

### Starting/Stopping Services

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f prometheus

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Updating Dashboards

1. Edit JSON files in `monitoring/grafana/dashboards/`
2. Restart Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`
3. Dashboards auto-reload within 10 seconds

### Updating Alerts

1. Edit `monitoring/alerts/erp-alerts.yml`
2. Reload Prometheus: `curl -X POST http://localhost:9090/-/reload`

### Data Retention

**Current:** 30 days (configured in docker-compose)

To change:
```yaml
# In docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=90d' # Change to 90 days
```

### Backup Dashboards

```bash
# Backup Grafana dashboards
docker exec erp-grafana grafana-cli admin export-dashboard > backup.json

# Backup Prometheus data
docker run --rm -v erp_prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data
```

---

## 🐛 Troubleshooting

### Issue: Backend metrics not showing

**Check:**
1. Backend is running: `curl http://localhost:3000/health`
2. Metrics endpoint works: `curl http://localhost:3000/metrics`
3. Prometheus can reach backend: Check http://localhost:9090/targets
4. Backend has `prom-client` installed: `npm list prom-client`

**Fix:**
```bash
cd my-backend
npm install prom-client express-prom-bundle
docker-compose restart backend
```

### Issue: Grafana dashboards not loading

**Check:**
1. Volume mounts correct in docker-compose
2. Dashboard JSON files exist: `ls monitoring/grafana/dashboards/`
3. Prometheus datasource configured: http://localhost:3001/datasources

**Fix:**
```bash
# Recreate Grafana with fresh volumes
docker-compose -f docker-compose.monitoring.yml down -v
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

### Issue: Alerts not firing

**Check:**
1. Alert rules loaded: http://localhost:9090/rules
2. Alert expressions valid: Test in Prometheus query UI
3. Evaluation interval: Check `prometheus.yml`

**Fix:**
```bash
# Validate alert rules syntax
docker exec erp-prometheus promtool check rules /etc/prometheus/alerts/erp-alerts.yml

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload
```

### Issue: High memory usage by Prometheus

**Causes:**
- Too many metrics
- Long retention period
- High cardinality labels

**Fix:**
```yaml
# Reduce retention
--storage.tsdb.retention.time=15d

# Reduce scrape frequency
scrape_interval: 30s
```

---

## ✅ Best Practices

### 1. **Label Hygiene**
- Keep cardinality low (< 10 unique values per label)
- Don't use UUIDs or timestamps as labels
- Use consistent naming: `method`, `status_code`, `route`

### 2. **Query Optimization**
- Use rate() for counters: `rate(requests_total[5m])`
- Use histogram_quantile() for percentiles
- Avoid large time ranges in dashboards (default 1h-6h)

### 3. **Alert Tuning**
- Set appropriate `for` duration (avoid flapping)
- Use severity labels: `critical`, `warning`, `info`
- Include runbook links in annotations

### 4. **Security**
- Change default Grafana password
- Use read-only datasources for viewers
- Enable HTTPS in production
- Restrict Prometheus port (9090) to internal network

### 5. **Scaling**
- For > 1M metrics, use Prometheus federation or Thanos
- For long-term storage (> 30 days), use Thanos or Cortex
- For multi-region, deploy Prometheus per region

### 6. **Dashboard Design**
- One metric per panel title
- Use consistent color schemes
- Show P50/P95/P99 (not just average)
- Include units in axes labels

---

## 📚 Additional Resources

### Official Documentation
- [Prometheus Docs](https://prometheus.io/docs/introduction/overview/)
- [Grafana Docs](https://grafana.com/docs/)
- [Node Exporter Guide](https://prometheus.io/docs/guides/node-exporter/)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)

### Tutorials
- [RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [USE Method](https://www.brendangregg.com/usemethod.html)
- [Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)

### Community
- [Prometheus Slack](https://slack.cncf.io/)
- [Grafana Community Forum](https://community.grafana.com/)

---

## 🎓 Training Checklist

### For Developers
- [ ] Access Grafana and explore dashboards
- [ ] Run sample PromQL queries in Prometheus
- [ ] Add custom metrics to a new API endpoint
- [ ] Create a new alert rule
- [ ] Export a dashboard JSON

### For Ops
- [ ] Start/stop monitoring stack
- [ ] Check service health via `/metrics` endpoints
- [ ] Interpret alert firing conditions
- [ ] Backup Prometheus data
- [ ] Tune alert thresholds

### For Management
- [ ] Review system overview dashboard daily
- [ ] Understand key SLIs (latency, error rate, throughput)
- [ ] Set capacity planning milestones based on trends
- [ ] Define SLOs for critical services

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Search [Prometheus Community](https://github.com/prometheus/prometheus/discussions)
3. Review logs: `docker-compose -f docker-compose.monitoring.yml logs`
4. Contact DevOps team

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Maintained by:** BISMAN ERP DevOps Team
