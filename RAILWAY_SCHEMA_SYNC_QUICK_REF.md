# Railway Schema Sync - Quick Reference ⚡

**Status:** ✅ **COMPLETE** - Local schema pushed to Railway  
**Date:** November 24, 2025

---

## What Was Done

1. ✅ Generated migration SQL from local `prisma/schema.prisma`
2. ✅ Applied 1,294 lines of SQL to Railway database
3. ✅ All **48 tables** now present with correct structure
4. ✅ Migration history updated (baseline applied)
5. ✅ User data preserved (20 rows)

---

## New Tables on Railway

### System Health & Observability
- `system_health_config` (with retention settings)
- `system_metric_samples` (with reqCount, errCount)
- `system_metric_daily` (aggregates)
- `load_test_reports`
- `rate_limit_violations`

### Communication
- `threads`
- `thread_members`
- `call_logs`

### Enhanced Approver System
- `approver_configurations`
- `approver_selection_logs`

---

## Quick Verification

```bash
# Run the verification script
cd my-backend
./scripts/verify-railway-schema.sh

# Or check manually
railway connect bisman-erp-db
\dt                    # List all tables (should show 48)
\d system_health_config  # Check structure
SELECT * FROM _prisma_migrations ORDER BY started_at DESC;
\q
```

---

## Next: Trigger Railway Redeploy

### Option 1: Auto-deploy (Recommended)
Already done! The commit will trigger Railway auto-deploy.

```bash
# Watch deployment
railway logs --service bisman-erp-backend --follow
```

### Option 2: Manual Deploy
```bash
railway up --service bisman-erp-backend
```

---

## Verify Backend Working

### 1. Health Check
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "uptime": "..."
}
```

### 2. System Health Settings
```bash
# Get a JWT token first (login via frontend or API)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://bisman-erp-backend-production.up.railway.app/api/system-health/settings
```

Expected response:
```json
{
  "success": true,
  "data": {
    "thresholds": {...},
    "backupLocation": "/backups/railway",
    "refreshInterval": 30000,
    "metricsRetentionDays": 7,
    "aggregateRetentionDays": 365
  }
}
```

---

## Initialize System Health Config

Run once to create the config row:

```bash
railway connect bisman-erp-db <<'EOF'
INSERT INTO system_health_config (
  id, thresholds, backupLocation, refreshInterval, 
  metricsRetentionDays, aggregateRetentionDays
)
VALUES (
  1,
  '{"latency":{"warning":500,"critical":1000},"p95Latency":{"warning":800,"critical":1500},"errorRate":{"warning":1,"critical":5},"cacheHitRate":{"warning":70,"critical":50},"slowQueries":{"warning":100,"critical":200},"cpuUsage":{"warning":70,"critical":85},"memoryUsage":{"warning":80,"critical":90}}'::jsonb,
  '/backups/railway',
  30000, 7, 365
)
ON CONFLICT (id) DO NOTHING;
EOF
```

---

## Expected Deployment Logs

✅ Good signs to look for:
```
[setup] migrate deploy succeeded
✅ All tables verified
Server listening on port 8080
No P3009 migration errors
```

❌ Issues (should NOT appear):
```
P3009: Failed migration found
Can't reach database server
Migration failed
```

---

## Files Created

| File | Description |
|------|-------------|
| `railway-push-schema.sql` | Complete migration SQL (1,294 lines) |
| `scripts/verify-railway-schema.sh` | Verification tool |
| `RAILWAY_SCHEMA_SYNC_COMPLETE.md` | Full documentation |
| `RAILWAY_SCHEMA_SYNC_QUICK_REF.md` | This quick reference |

---

## Troubleshooting

### Issue: Backend won't start
```bash
# Check logs
railway logs --service bisman-erp-backend

# Verify DB connection
railway variables --service bisman-erp-backend | grep DATABASE_URL
```

### Issue: Migration errors persist
```bash
# Check migration state
railway connect bisman-erp-db
SELECT * FROM _prisma_migrations ORDER BY started_at DESC;
\q
```

### Issue: Tables missing
```bash
# Re-run verification
./scripts/verify-railway-schema.sh

# Manually check
railway connect bisman-erp-db
\dt
```

---

## Success Criteria Checklist

- [x] 48 tables in Railway DB
- [x] `system_health_config` has retention columns
- [x] Baseline migration marked as applied
- [x] Legacy migration marked as rolled back
- [x] No data loss (users table intact)
- [ ] Backend deployment successful (check logs)
- [ ] Health endpoint responding
- [ ] System health endpoints accessible

---

## Related Docs

- `RAILWAY_SCHEMA_SYNC_COMPLETE.md` - Full details
- `PRODUCTION_READY_GUIDE_UPDATED.md` - Production setup
- `DB_RECONCILIATION_PLAN.md` - Original strategy
- `my-backend/scripts/start-with-migrate.js` - Auto-migration

---

**Your Next Action:** Watch Railway deployment logs and verify health endpoint! 🚀
