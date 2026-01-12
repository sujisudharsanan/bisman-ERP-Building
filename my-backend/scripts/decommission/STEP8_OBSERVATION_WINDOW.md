# STEP 8 — Observation Window (30 Days)

**Purpose:** Monitor the system after decommissioning to ensure stability before final cleanup.

---

## Duration

- **Start Date:** _______________ (fill in after deployment)
- **End Date:** _______________ (30 days from start)
- **Minimum Observation:** 30 days

---

## Metrics to Monitor

### 1. Login Metrics

| Metric | Where to Check | Alert Threshold | Check Frequency |
|--------|----------------|-----------------|-----------------|
| Failed login rate | Backend logs | >5% of attempts | Daily |
| Login latency (p95) | APM/Logs | >2 seconds | Daily |
| "User not found" errors | Backend logs | Any increase | Daily |
| Password mismatch errors | Backend logs | Any occurrence | Daily |
| 503 auth errors | Backend logs | Any occurrence | Immediate |

### 2. Database Metrics

| Metric | Where to Check | Alert Threshold | Check Frequency |
|--------|----------------|-----------------|-----------------|
| VIEW query performance | DB slow query log | >100ms | Weekly |
| users_enhanced table size | DB stats | Unexpected growth | Weekly |
| Blocked write attempts | Trigger logs | Any occurrence | Daily |

### 3. Application Errors

| Error Pattern | Where to Check | Action |
|---------------|----------------|--------|
| `WRITE BLOCKED: Legacy users table is frozen` | Backend logs | Fix calling code |
| `INSERT via users VIEW is deprecated` | Backend logs | Fix calling code |
| `UPDATE via users VIEW is deprecated` | Backend logs | Fix calling code |
| `Cannot read property 'id' of null` (user context) | Backend logs | Check user lookup |

---

## Log Queries

### Check for auth issues
```bash
# Backend logs - search for auth errors
grep -E "\[auth\.routes\]|AUTH_DB_ERROR|User not found" logs/app.log | tail -100

# Or with pm2
pm2 logs --lines 500 | grep -E "auth\.routes|password|login"
```

### Check for blocked writes
```bash
# PostgreSQL logs
grep -E "WRITE BLOCKED|Legacy users table|VIEW is deprecated" /var/log/postgresql/*.log
```

### Check for performance issues
```sql
-- Slow queries on users VIEW
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%users%' 
ORDER BY total_time DESC 
LIMIT 10;
```

---

## Daily Checklist (First 7 Days)

| Day | Date | Login Success Rate | Errors Found | Notes | Verified By |
|-----|------|-------------------|--------------|-------|-------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |

---

## Weekly Checklist (Days 8-30)

| Week | Date Range | Issues Found | Resolution | Verified By |
|------|------------|--------------|------------|-------------|
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

---

## Escalation Contacts

| Issue Type | Primary Contact | Secondary Contact |
|------------|-----------------|-------------------|
| Auth failures | | |
| Database issues | | |
| Application errors | | |
| Security concerns | | |

---

## Success Criteria

Before proceeding to Step 9 (Final Deletion), ALL must be true:

| Criteria | Verified | Date |
|----------|----------|------|
| 30 days elapsed with no critical issues | ☐ | |
| Zero password mismatch errors | ☐ | |
| Zero "user not found" errors for valid users | ☐ | |
| All blocked write attempts resolved (code fixed) | ☐ | |
| Login latency unchanged from baseline | ☐ | |
| No rollback was required during observation | ☐ | |
| All stakeholders approve final deletion | ☐ | |

---

## End of Observation Decision

- **PROCEED TO STEP 9** ☐ - All success criteria met
- **EXTEND OBSERVATION** ☐ - Minor issues, need more time
- **ROLLBACK REQUIRED** ☐ - Critical issues found

---

## Notes

_Use this space to document any observations, issues, or learnings during the monitoring period._

```
Date: 
Issue: 
Resolution: 
```
