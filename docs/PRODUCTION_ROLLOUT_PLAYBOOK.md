# BISMAN ERP – Production Rollout Playbook
## Version: 1.0
## Scope: Backend + Frontend + Database Migrations
## Audience: SRE, DevOps, Backend Engineering

---

## Preconditions
- ✅ Production database backup available
- ✅ CI validation passed
- ✅ Staging E2E tests passed and observed for minimum 30 minutes
- ✅ No critical Sentry or Grafana alerts active

---

## 🚨 CRITICAL: Do NOT proceed until ALL pre-deploy items are checked

---

## 0️⃣ Pre-Deploy Checklist (Mandatory Before Migration)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 0.1 | Confirm Prisma schema and `005_task_module_enhancements.sql` are final | Dev | ☐ |
| 0.2 | Verify STAGING → PROD environment parity (DB URL, Redis, secrets) | DevOps | ☐ |
| 0.3 | Add or update any new secrets in deployment environment | DevOps | ☐ |
| 0.4 | Ensure SRE on-call and Slack/PagerDuty notifications are active | SRE | ☐ |
| 0.5 | Confirm maintenance window (if applicable): `__:__ - __:__ UTC` | PM | ☐ |
| 0.6 | Ensure `smoke.sh` and `validate_task_module.sh` are present and executable | Dev | ☐ |
| 0.7 | Staging E2E passed and monitored for 30+ minutes | QA | ☐ |
| 0.8 | All PR approvals obtained | Dev Lead | ☐ |

---

## 1️⃣ Backup Production Database (MANDATORY)

### Logical Compressed Backup
```bash
# Using environment variables
PGHOST=prod-db-host PGUSER=prod_user PGDATABASE=prod_db \
pg_dump -Fc --no-acl --no-owner -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" \
  > prod_pre_migration_$(date +%F_%H%M).dump
```

### Or using DATABASE_URL
```bash
export DATABASE_URL="postgres://user:pass@host:5432/db"
pg_dump -Fc --no-acl --no-owner "$DATABASE_URL" > prod_pre_migration_$(date +%F_%H%M).dump
```

### Verify Backup File Integrity
```bash
pg_restore --list prod_pre_migration_2025-12-11_1200.dump | head

# Upload to S3/GCS for safety (adjust bucket name)
aws s3 cp prod_pre_migration_*.dump s3://bisman-backups/migrations/
```

**Backup file location:** `_________________________________`  
**Backup verified by:** `____________` at `__:__ UTC`

---

## 2️⃣ Maintenance Notice (Optional)

If required, enable maintenance banner or feature flag.

```bash
# Set feature flag or update load balancer
kubectl set env deployment/bisman-api MAINTENANCE_MODE=true -n production
```

Skip this step for zero-downtime deployment.

---

## 3️⃣ Apply Migrations (Idempotent)

### Option A: Prisma Migration (Recommended)
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Option B: Apply SQL Migration Directly
```bash
psql "$PROD_DB_URL" -f migrations/005_task_module_enhancements.sql
```

### Validate Schema
```bash
# Verify columns
psql "$PROD_DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workflow_tasks' ORDER BY column_name;"

# Verify indexes
psql "$PROD_DB_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename='workflow_tasks';"
```

### Verify Schema Changes Immediately
```bash
# Verify task_audit_logs table
psql "$PROD_DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'task_audit_logs' ORDER BY ordinal_position;"

# Verify FK constraints
psql "$PROD_DB_URL" -c "SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('task_messages', 'task_attachments');"

# Verify indexes
psql "$PROD_DB_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'workflow_tasks';"
```

**Expected output:**
- ✅ `task_audit_logs` table with 8 columns
- ✅ `fk_task_messages_task` constraint
- ✅ `fk_task_attachments_task` constraint  
- ✅ `idx_workflow_tasks_assigned_to` index

**Migration applied by:** `____________` at `__:__ UTC`

---

## 4️⃣ Deploy Application (Backend + Frontend)

### Kubernetes / Helm Example
```bash
# Backend
helm upgrade bisman-api ./charts/api --namespace production -f values.prod.yaml
kubectl rollout restart deployment/bisman-api -n production
kubectl rollout status deployment/bisman-api -n production --timeout=5m

# Frontend
helm upgrade bisman-frontend ./charts/frontend --namespace production -f values.prod.yaml
kubectl rollout status deployment/bisman-frontend -n production --timeout=5m
```

### PM2 / Docker Compose
Adapt to host-specific deployment process.

```bash
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --no-deps api
docker-compose -f docker-compose.production.yml up -d --no-deps frontend
```

**Deploy completed by:** `____________` at `__:__ UTC`

---

## 5️⃣ Post-Deploy Smoke Testing

### Execute Smoke Tests
```bash
API_URL="https://api.prod.example.com" TOKEN="$PROD_TEST_TOKEN" ./scripts/smoke.sh
```

### Or with Validation Script
```bash
API_URL="https://api.prod.example.com" TOKEN="$PROD_TEST_TOKEN" SKIP_MIGRATE=true ./scripts/validate_task_module.sh
```

### Expected Outcomes
- ✅ Task creation works
- ✅ Kanban API returns tenant-isolated data
- ✅ Status transitions succeed/fail according to workflow rules
- ✅ Comments and attachments succeed
- ✅ Audit log entries recorded

| Test | Expected | Actual |
|------|----------|--------|
| Health endpoint | ✅ 200 OK | ☐ |
| Login | ✅ Token received | ☐ |
| Create task | ✅ Task ID returned | ☐ |
| Get task | ✅ 200 OK | ☐ |
| Status transition OPEN→IN_PROGRESS | ✅ 200 OK | ☐ |
| Invalid transition IN_PROGRESS→OPEN | ✅ 409 Conflict | ☐ |
| Kanban endpoint | ✅ 200 OK | ☐ |

### If Failure Occurs
- Inspect server logs
- Inspect Sentry exceptions
- If critical (tenant breach, data integrity issues) → proceed to rollback

**Smoke tests passed:** ☐ YES  ☐ NO (if NO, proceed to rollback)

---

## 6️⃣ Monitoring (First 30–60 Minutes Post-Deploy)

### Monitor Endpoints
```bash
# GET /api/health
watch -n 10 'curl -s $API_URL/api/health | jq .'
```

### Monitor Logs & Traces
- Sentry for exceptions
- Application logs for 5xx bursts

### Monitor Prometheus/Grafana Dashboard
Specifically check alerts:
- TaskStatusChangeErrorsHigh / Critical
- TaskCreationErrorsHigh
- TaskRateLimitHitsHigh
- TaskListLatencyHigh
- KanbanLatencyHigh

| Alert | Threshold | Status |
|-------|-----------|--------|
| TaskStatusChangeErrorsHigh | >5 errors/5m | ☐ OK |
| TaskStatusChangeErrorsCritical | >20 errors/15m | ☐ OK |
| TaskCreationErrorsHigh | >10% error rate | ☐ OK |
| TaskRateLimitHitsHigh | >50 hits/10m | ☐ OK |
| TaskListLatencyHigh | P95 > 2s | ☐ OK |
| KanbanLatencyHigh | P95 > 3s | ☐ OK |

### Quick Manual Queries
```bash
# Recent tasks (verify tenant isolation)
SELECT id, tenant_id, title, status 
FROM workflow_tasks 
ORDER BY created_at DESC LIMIT 5;

# Audit log entries (verify logging works)
SELECT * 
FROM task_audit_logs 
WHERE created_at > NOW() - interval '10 minutes' 
ORDER BY created_at DESC LIMIT 20;
```

### Sentry/Error Tracking
- [ ] No new exceptions in last 30 minutes
- [ ] Error rate within normal bounds
- [ ] No tenant isolation violations

**Monitoring completed by:** `____________` at `__:__ UTC`

---

## 7️⃣ Rollback Procedure (If Critical Failure)

### A. Soft Rollback (Recommended First)
Revert to previous stable application version:

```bash
kubectl set image deployment/bisman-api \
  bisman-api=registry.example.com/bisman-api:previous-tag \
  -n production

kubectl rollout status deployment/bisman-api -n production

# Or rollback Helm release
helm rollback bisman-api -n production
```

### B. Database Rollback (Last Resort)
Only performed if schema change caused unrecoverable issues.

```bash
# DANGER: This is destructive - coordinate with stakeholders first!

# 1. Scale down app to prevent writes
kubectl scale deployment/bisman-api --replicas=0 -n production

# 2. Restore database
pg_restore --clean --no-owner --dbname="$DATABASE_URL" \
  prod_pre_migration_2025-12-11_1200.dump

# 3. Deploy previous app version
kubectl set image deployment/bisman-api \
  bisman-api=registry.example.com/bisman-api:previous-tag \
  -n production

# 4. Scale back up
kubectl scale deployment/bisman-api --replicas=3 -n production
```

---

## 8️⃣ Post-Deploy Housekeeping

| # | Task | Owner | Status |
|---|------|-------|--------|
| 8.1 | Remove maintenance banner (if set) | DevOps | ☐ |
| 8.2 | Update CHANGELOG | Dev | ☐ |
| 8.3 | Document migration notes, schema changes, and new alerts | Dev | ☐ |
| 8.4 | Tag release in Git: `git tag v2.X.X && git push --tags` | Dev | ☐ |
| 8.5 | Notify engineering and business stakeholders | PM | ☐ |
| 8.6 | Schedule post-deployment review (if issues detected) | SRE | ☐ |

---

## 9️⃣ Quick Command Reference

### Backup
```bash
pg_dump -Fc --no-acl --no-owner "$PROD_DB_URL" > prod_pre_migration.dump
```

### Apply Prisma Migration
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Apply SQL Migration
```bash
psql "$PROD_DB_URL" -f migrations/005_task_module_enhancements.sql
```

### Run Smoke Tests
```bash
API_URL="https://api.prod.example.com" TOKEN="$PROD_TEST_TOKEN" ./scripts/smoke.sh
```

### Check Audit Logs
```bash
psql "$PROD_DB_URL" -c "SELECT created_at, tenant_id, user_id, action, resource, resource_id FROM task_audit_logs ORDER BY created_at DESC LIMIT 50;"
```

### Panic Rollback
```bash
kubectl set image deployment/bisman-api \
  bisman-api=registry.example.com/bisman-api:previous-tag \
  -n production
```

---

## 🔟 SRE Recommendations (Post-Release)

- [ ] Monitor rate limiter thresholds and tune as load patterns stabilize
- [ ] Ensure all Prometheus alerts have corresponding runbooks
- [ ] Schedule automated smoke tests every hour for first 48 hours (alert on failure)
- [ ] Add retention monitoring for `task_audit_logs`
- [ ] Validate error-rate charts remain stable for 24 hours

### Ongoing
- [ ] Review and tune rate limiter thresholds based on actual traffic
- [ ] Add retention policy for `task_audit_logs` (e.g., 90 days)
- [ ] Consider adding synthetic monitoring for critical paths

---

## Sign-Off

| Role | Name | Signature | Date/Time |
|------|------|-----------|-----------|
| Developer | | | |
| QA Lead | | | |
| SRE/DevOps | | | |
| Product Owner | | | |

---

## Appendix: Files Changed in This Release

| File | Change Type | Description |
|------|-------------|-------------|
| `database/migrations/005_task_module_enhancements.sql` | New | Schema changes |
| `monitoring/alerts/task-module-alerts.yml` | New | Prometheus alerts |
| `middleware/advancedRateLimiter.js` | Modified | Added task/upload limiters |
| `routes/tasksV2.js` | Modified | Applied rate limiters |
| `scripts/smoke.sh` | New | Post-deploy verification |
| `scripts/validate_task_module.sh` | New | Full validation script |
| `controllers/taskControllerV2.js` | Modified | Status alias mapping |
