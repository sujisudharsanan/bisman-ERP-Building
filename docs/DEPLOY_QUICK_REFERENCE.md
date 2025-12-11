# 🚀 Production Deploy Quick Reference Card
## Task Module Migration v2025-12-11

---

## ⚡ TL;DR Deploy Steps

```bash
# 1. BACKUP (mandatory!)
pg_dump -Fc "$PROD_DB_URL" > backup_$(date +%F_%H%M).dump

# 2. MIGRATE
psql "$PROD_DB_URL" -f database/migrations/005_task_module_enhancements.sql

# 3. DEPLOY
kubectl rollout restart deployment/bisman-api -n production
kubectl rollout status deployment/bisman-api -n production

# 4. VERIFY
./scripts/smoke.sh

# 5. MONITOR for 30 mins
watch -n 30 'curl -s $API_URL/api/health | jq .'
```

---

## 🔴 PANIC BUTTON

```bash
# App-only rollback (fast, safe)
kubectl set image deployment/bisman-api bisman-api=:previous-tag -n production

# Full DB restore (last resort!)
kubectl scale deployment/bisman-api --replicas=0 -n production
pg_restore --clean --no-owner --dbname="$PROD_DB_URL" backup.dump
kubectl scale deployment/bisman-api --replicas=3 -n production
```

---

## ✅ Smoke Test Expected Results

| Test | Status Code |
|------|-------------|
| Health | 200 |
| Login | 200 + token |
| Create task | 200/201 |
| OPEN→IN_PROGRESS | 200 |
| IN_PROGRESS→OPEN | **409** |
| Kanban | 200 |

---

## 📊 Key Metrics to Watch

| Metric | Normal | Alert |
|--------|--------|-------|
| Task API errors/5m | <5 | >5 |
| Kanban P95 latency | <3s | >3s |
| Rate limit 429s/10m | <20 | >50 |
| Audit log writes | >0 | 0 for 10m |

---

## 📞 Contacts

| Role | Contact |
|------|---------|
| On-Call SRE | Slack: #sre-oncall |
| Dev Lead | @dev-lead |
| PagerDuty | bisman-prod |

---

## 📁 Key Files

```
database/migrations/005_task_module_enhancements.sql  # Schema
scripts/smoke.sh                                       # Post-deploy verify
monitoring/alerts/task-module-alerts.yml               # Prometheus rules
docs/PRODUCTION_ROLLOUT_PLAYBOOK.md                    # Full playbook
```
