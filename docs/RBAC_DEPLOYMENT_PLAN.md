# ============================================================================
# PHASE 6: RBAC DEPLOYMENT PLAN
# ============================================================================
# 
# Safe rollout order with feature flags, monitoring, and rollback steps.
# 
# CRITICAL: This is a SECURITY deployment. When in doubt, DENY.
# ============================================================================

## 1. PRE-DEPLOYMENT CHECKLIST

### 1.1 Required Artifacts
- [ ] `migration_040_bootstrap_approval_chain.js` tested in staging
- [ ] `migration_041_cleanup_strategy.js` reviewed
- [ ] `effectiveAccessService.js` with PHASE 3 fixes
- [ ] `authorize.js` middleware
- [ ] `menuRoutesSecure.js` endpoint
- [ ] `userCreationValidator.js` integrated
- [ ] `rbacInvariants.js` deployed
- [ ] `rbacAuditLogger.js` configured
- [ ] `rbacHealthCheck.js` endpoint ready

### 1.2 Pre-Flight Queries
Run these BEFORE deployment to establish baseline:

```sql
-- Baseline counts
SELECT 'admin_page_assignments' as table_name, COUNT(*) FROM admin_page_assignments
UNION ALL
SELECT 'role_page_access', COUNT(*) FROM role_page_access
UNION ALL
SELECT 'rbac_user_permissions', COUNT(*) FROM rbac_user_permissions
UNION ALL
SELECT 'active users', COUNT(*) FROM users WHERE is_active = true;

-- SUPER_ADMIN count
SELECT COUNT(*) as superadmin_count
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'SUPER_ADMIN' AND u.is_active = true;

-- Current access levels
SELECT r.name, COUNT(DISTINCT rpa.page_id) as page_count
FROM roles r
LEFT JOIN role_page_access rpa ON r.name = rpa.role_name
GROUP BY r.name
ORDER BY page_count DESC;
```

## 2. ROLLOUT ORDER

### Phase 2.1: Database Bootstrap (LOW RISK)
**Duration**: 5 minutes
**Rollback Time**: < 1 minute

1. Run migration_040 to bootstrap admin_page_assignments
2. Verify counts match expected:
   - EA → SA approvals: ~168 (all subscribable pages)
   - SA → ADMIN: ~168
   - SA → USER: ~37 (subset pages)
3. Commit if successful

**Rollback**: Run migration_040.down()

### Phase 2.2: Feature Flag Setup
Add these environment variables:

```bash
# RBAC Feature Flags
RBAC_USE_APPROVAL_CHAIN=false      # Start with false
RBAC_STRICT_MENU=false             # Start with false
RBAC_LOG_ALL_DECISIONS=true        # Always true
RBAC_FAIL_CLOSED=true              # Always true (SECURITY)
```

### Phase 2.3: Canary Deployment (5% traffic)
**Duration**: 24-48 hours
**Monitoring**: Active

1. Enable `RBAC_USE_APPROVAL_CHAIN=true` for canary pods
2. Monitor for:
   - AUTH_DENY spikes (threshold: > 10% baseline)
   - User complaints about access
   - Error logs from effectiveAccessService
3. If issues: disable flag, investigate

### Phase 2.4: Gradual Rollout
**Duration**: 1 week

| Day | Traffic % | Action |
|-----|-----------|--------|
| 1   | 5%        | Canary |
| 2   | 10%       | Expand if no issues |
| 3   | 25%       | Quarter traffic |
| 5   | 50%       | Half traffic |
| 7   | 100%      | Full rollout |

### Phase 2.5: Menu Switch
After 100% approval chain usage is stable:

1. Enable `RBAC_STRICT_MENU=true`
2. This switches from `/api/menu` to `/api/menu-secure`
3. Frontend fetches menu from new endpoint

## 3. MONITORING SIGNALS

### 3.1 Key Metrics to Watch

```yaml
# Prometheus metrics (example)
metrics:
  - name: rbac_auth_decisions_total
    type: counter
    labels: [decision, reason, route]
    
  - name: rbac_effective_access_latency_ms
    type: histogram
    labels: [user_type]
    
  - name: rbac_invariant_violations_total
    type: counter
    labels: [invariant_id]
    alert_threshold: 1
    
  - name: rbac_approval_chain_length
    type: gauge
    labels: [user_id]
```

### 3.2 Dashboard Queries

```sql
-- Real-time access decisions (last hour)
SELECT 
  date_trunc('minute', created_at) as minute,
  decision,
  COUNT(*) as count
FROM rbac_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Denial reasons breakdown
SELECT 
  reason_code,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM rbac_audit_log
WHERE decision = 'DENY'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 2 DESC;

-- Users affected by new denials
SELECT 
  u.email,
  COUNT(*) as deny_count
FROM rbac_audit_log ral
JOIN users u ON ral.user_id = u.id
WHERE ral.decision = 'DENY'
  AND ral.created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

### 3.3 Alert Rules

```yaml
alerts:
  - name: RbacHighDenyRate
    condition: rbac_auth_decisions_total{decision="DENY"} / rbac_auth_decisions_total > 0.15
    duration: 5m
    severity: warning
    action: Slack #security-alerts
    
  - name: RbacInvariantViolation
    condition: rbac_invariant_violations_total > 0
    duration: 0s  # Immediate
    severity: critical
    action: PagerDuty
    
  - name: RbacServiceLatency
    condition: rbac_effective_access_latency_ms_p99 > 500
    duration: 5m
    severity: warning
    action: Slack #backend-alerts
```

## 4. ROLLBACK PROCEDURES

### 4.1 Immediate Rollback (< 5 minutes)
If critical issues detected:

```bash
# Option A: Feature flag
export RBAC_USE_APPROVAL_CHAIN=false
# Restart pods

# Option B: Revert code
git revert HEAD
git push origin main
# Trigger deploy
```

### 4.2 Database Rollback
If data corruption detected:

```sql
-- Disable the feature first!
-- Then rollback migration
BEGIN;

-- Archive current state
CREATE TABLE admin_page_assignments_corrupted AS 
SELECT * FROM admin_page_assignments;

-- Truncate
TRUNCATE admin_page_assignments;

-- If backup exists, restore
-- INSERT INTO admin_page_assignments SELECT * FROM admin_page_assignments_backup;

COMMIT;
```

### 4.3 Partial Rollback (User-Specific)
If specific users affected:

```sql
-- Grant temporary access via legacy system
INSERT INTO rbac_user_permissions (user_id, page_id, can_view, granted_by, created_at)
SELECT 
  $user_id,
  pm.id,
  true,
  $admin_id,
  NOW()
FROM pages_master pm
WHERE pm.page_code IN ('DASHBOARD', 'PROFILE', ...);
```

## 5. SUCCESS CRITERIA

### 5.1 After 24 Hours
- [ ] No CRITICAL alerts fired
- [ ] Deny rate < 5% of baseline
- [ ] No user-reported access issues
- [ ] Latency < 200ms p99

### 5.2 After 7 Days
- [ ] All users accessing expected pages
- [ ] Approval chain coverage > 95% of active users
- [ ] Health check returning HEALTHY
- [ ] No invariant violations

### 5.3 After 30 Days
- [ ] Begin role_page_access sunset Phase 1
- [ ] All new users created through approval chain
- [ ] Legacy queries removed from code

## 6. EMERGENCY CONTACTS

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| On-Call | #oncall-security | Immediate |
| Security Lead | @security-lead | 15 min |
| Engineering Lead | @eng-lead | 30 min |
| Database Admin | @dba | 15 min |

## 7. POST-DEPLOYMENT VERIFICATION

Run these after deployment:

```bash
# 1. Health check
curl -s https://api.bisman.erp/api/admin/rbac-health | jq

# 2. Test user access
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.bisman.erp/api/menu-secure | jq '.effectivePages | length'

# 3. Verify approval chain
curl -s -H "Authorization: Bearer $SA_TOKEN" \
  https://api.bisman.erp/api/admin/approval-chain/status | jq
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**Author**: RBAC Security Team
**Approved By**: [Pending]
