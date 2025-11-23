# 🔥 Monitoring Quick Reference

## 🚀 Quick Access

```bash
# Grafana (Dashboards)
http://localhost:3001
# Login: admin / admin

# Prometheus (Metrics & Alerts)
http://localhost:9090

# cAdvisor (Container Stats)
http://localhost:8080
```

## ⚡ Common Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# Check backend metrics
curl http://localhost:3000/metrics

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

## 📊 Key Dashboards

1. **System Overview** - CPU, Memory, Disk, API rate
2. **API Performance** - Latency, errors, endpoints
3. **Database & Cache** - Connections, queries, Redis

## 🚨 Critical Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| HighAPILatency | P95 > 800ms | Check slow queries, optimize endpoints |
| HighErrorRate | > 5% | Check logs, fix bugs |
| HighCPUUsage | > 80% | Scale horizontally or optimize code |
| HighMemoryUsage | > 85% | Check memory leaks, increase RAM |
| HighDiskUsage | > 85% | Clean logs, archive data |

## 📈 PromQL Cheat Sheet

```promql
# Request rate (requests per second)
rate(bisman_erp_http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(bisman_erp_http_request_duration_seconds_bucket[5m]))

# Error rate percentage
(sum(rate(bisman_erp_http_requests_total{status_code=~"5.."}[5m])) 
/ sum(rate(bisman_erp_http_requests_total[5m]))) * 100

# CPU usage percentage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Database connections
pg_stat_database_numbackends{datname="erp_main"}

# Redis cache hit ratio
(redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)) * 100
```

## 🔧 Add Custom Metric (Node.js)

```javascript
// In my-backend/middleware/prometheus.js
const myCustomMetric = new client.Counter({
  name: 'bisman_erp_custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type'],
  registers: [register],
});

// In your route handler
myCustomMetric.labels('user_login').inc();
```

## 🎯 SLIs to Monitor

- **Latency:** P95 < 800ms
- **Availability:** Uptime > 99.9%
- **Error Rate:** < 1%
- **Throughput:** Track baseline, alert on 50% drop

## 📞 Troubleshooting

```bash
# Backend metrics not showing?
curl http://localhost:3000/metrics  # Should return metrics

# Check if Prometheus is scraping
curl http://localhost:9090/api/v1/targets  # Should show all targets "UP"

# Grafana can't connect to Prometheus?
docker exec erp-grafana ping prometheus  # Should resolve

# Alert not firing?
# 1. Check alert expression in Prometheus UI
# 2. Verify alert rule syntax: 
docker exec erp-prometheus promtool check rules /etc/prometheus/alerts/erp-alerts.yml
```

## 📚 Learn More

- Full guide: `MONITORING_SETUP_GUIDE.md`
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
