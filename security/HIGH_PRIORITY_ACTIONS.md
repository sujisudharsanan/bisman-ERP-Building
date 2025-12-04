# BISMAN ERP - Security High Priority Actions

> **Status**: Active  
> **Created**: 2025-12-05  
> **Owner**: Security Team  
> **Review Frequency**: Weekly

---

## 📋 Action Items Summary

| # | Action | Priority | Status | Target Date | Owner |
|---|--------|----------|--------|-------------|-------|
| 1 | External Penetration Test | 🔴 High | ⏳ Pending | TBD | Security |
| 2 | Monthly Restore Drills | 🟠 Medium | ⏳ Pending | Monthly | DevOps |
| 3 | Audit Volume Alerting | 🔴 High | ⏳ Pending | 1 week | DevOps |
| 4 | Failed Auth Alerting | 🔴 High | ⏳ Pending | 1 week | DevOps |
| 5 | Unknown DB Connection Alerting | 🔴 High | ⏳ Pending | 1 week | DevOps |
| 6 | DB Credential Rotation Schedule | 🟠 Medium | ⏳ Pending | 2 weeks | Security |
| 7 | Compliance Artifacts (ISO/GDPR) | 🟡 Low | ⏳ Pending | 1 month | Compliance |

---

## 1. 🔒 External Penetration Test

### Scope
- **Focus Areas**:
  - RBAC bypass attempts
  - Privilege escalation vectors
  - Tenant isolation boundaries
  - API authentication/authorization
  - Session management vulnerabilities

### Vendor Requirements
- [ ] CREST/OSCP certified testers
- [ ] Experience with multi-tenant SaaS
- [ ] Familiarity with Node.js/PostgreSQL stack
- [ ] NDA and insurance in place

### Pre-Test Checklist
- [ ] Define scope boundaries (production replica vs staging)
- [ ] Create test tenant with all role types
- [ ] Prepare emergency rollback procedure
- [ ] Schedule during low-traffic window
- [ ] Notify relevant stakeholders

### Test Scenarios to Request
```
1. RBAC Bypass Tests:
   - Attempt to access resources without proper role
   - Try horizontal privilege escalation (user A → user B's data)
   - Try vertical privilege escalation (user → admin)
   - Test role inheritance edge cases

2. Tenant Isolation Tests:
   - Cross-tenant data access attempts
   - Tenant ID manipulation in requests
   - RLS policy bypass attempts
   - Shared resource enumeration

3. Session Management Tests:
   - Session fixation/hijacking
   - Token manipulation
   - Concurrent session handling
   - Session timeout enforcement

4. API Security Tests:
   - Authentication bypass
   - Authorization header manipulation
   - Rate limiting effectiveness
   - Input validation (SQLi, XSS, etc.)
```

### Deliverables Expected
- Executive summary with risk ratings
- Technical findings with reproduction steps
- Remediation recommendations prioritized by risk
- Re-test validation after fixes

---

## 2. 📅 Monthly Restore Drills

### Schedule
- **Frequency**: First Monday of each month
- **Duration**: 2-4 hours
- **Participants**: DevOps + Security + DB Admin

### Drill Procedure

```bash
#!/bin/bash
# Monthly Restore Drill Script
# Run on staging environment only

DRILL_DATE=$(date +%Y%m%d)
BACKUP_FILE="latest_backup.dump"
STAGING_DB="bisman_restore_test_${DRILL_DATE}"

echo "🔄 Starting Monthly Restore Drill - ${DRILL_DATE}"

# Step 1: Create fresh database
psql -c "CREATE DATABASE ${STAGING_DB};"

# Step 2: Restore backup
pg_restore --dbname="${STAGING_DB}" --verbose "${BACKUP_FILE}"

# Step 3: Verify RLS policies exist
psql -d "${STAGING_DB}" -c "
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';
"

# Step 4: Verify audit triggers exist
psql -d "${STAGING_DB}" -c "
SELECT COUNT(*) as trigger_count 
FROM pg_trigger 
WHERE tgname LIKE '%audit%';
"

# Step 5: Verify audit_logs_dml has data
psql -d "${STAGING_DB}" -c "
SELECT COUNT(*) as audit_count,
       MIN(changed_at) as earliest,
       MAX(changed_at) as latest
FROM audit_logs_dml;
"

# Step 6: Test sample queries
psql -d "${STAGING_DB}" -c "
-- Verify tenant isolation works
SET app.current_tenant_id = 'test-tenant';
SELECT COUNT(*) FROM users_enhanced;
"

# Step 7: Cleanup
psql -c "DROP DATABASE ${STAGING_DB};"

echo "✅ Restore Drill Complete"
```

### Drill Checklist
- [ ] Backup file integrity verified (checksum)
- [ ] Restore completes without errors
- [ ] RLS policies present and functional
- [ ] Audit triggers present and functional
- [ ] Audit log data intact with expected date range
- [ ] Sample queries return expected results
- [ ] Restore time documented (RTO metric)
- [ ] Findings documented and tickets created

### Drill Report Template
```markdown
## Restore Drill Report - [DATE]

**Backup Source**: [production/staging]
**Backup Date**: [date]
**Backup Size**: [X GB]
**Restore Time**: [X minutes]

### Verification Results
| Check | Status | Notes |
|-------|--------|-------|
| Backup integrity | ✅/❌ | |
| Restore completion | ✅/❌ | |
| RLS policies (count) | ✅/❌ | X policies |
| Audit triggers (count) | ✅/❌ | X triggers |
| Audit data integrity | ✅/❌ | Date range: X to Y |
| Sample queries | ✅/❌ | |

### Issues Found
1. [Issue description and severity]

### Action Items
1. [Action item and owner]
```

---

## 3. 🚨 Alerting Configuration

### 3.1 Audit Volume Drop Alert

**Condition**: Audit log volume drops >50% compared to same hour previous day

```sql
-- Query for Prometheus/Grafana
-- Run every 5 minutes, alert if current_count < (previous_count * 0.5)

WITH current_hour AS (
  SELECT COUNT(*) as cnt
  FROM audit_logs_dml
  WHERE changed_at >= date_trunc('hour', NOW())
),
previous_day_same_hour AS (
  SELECT COUNT(*) as cnt
  FROM audit_logs_dml
  WHERE changed_at >= date_trunc('hour', NOW() - INTERVAL '1 day')
    AND changed_at < date_trunc('hour', NOW() - INTERVAL '1 day') + INTERVAL '1 hour'
)
SELECT 
  c.cnt as current_count,
  p.cnt as previous_count,
  CASE WHEN p.cnt > 0 THEN (c.cnt::float / p.cnt * 100) ELSE 0 END as percentage
FROM current_hour c, previous_day_same_hour p;
```

**Alert Configuration (Prometheus)**:
```yaml
groups:
  - name: audit_alerts
    rules:
      - alert: AuditVolumeDropped
        expr: audit_logs_count_1h < (audit_logs_count_1h offset 1d) * 0.5
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Audit log volume dropped significantly"
          description: "Current hour audit count is less than 50% of same hour yesterday"
```

### 3.2 Failed Auth Spike Alert

**Condition**: >10 failed auth attempts from same user/IP in 5 minutes

```sql
-- Query for monitoring
SELECT 
  user_id,
  ip_address,
  COUNT(*) as failed_count,
  MAX(attempted_at) as last_attempt
FROM auth_attempts
WHERE success = false
  AND attempted_at >= NOW() - INTERVAL '5 minutes'
GROUP BY user_id, ip_address
HAVING COUNT(*) > 10
ORDER BY failed_count DESC;
```

**Express Middleware for Real-time Detection**:
```javascript
// middleware/authAttemptMonitor.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const THRESHOLD = 10;
const WINDOW_SECONDS = 300; // 5 minutes

async function trackFailedAuth(userId, ipAddress) {
  const key = `failed_auth:${userId || 'anon'}:${ipAddress}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  
  if (count > THRESHOLD) {
    // Trigger alert
    console.error(`[SECURITY ALERT] Excessive failed auth: user=${userId}, ip=${ipAddress}, count=${count}`);
    
    // Publish to monitoring channel
    await redis.publish('security:alerts', JSON.stringify({
      type: 'excessive_failed_auth',
      userId,
      ipAddress,
      count,
      timestamp: new Date().toISOString()
    }));
    
    return true; // Indicates threshold exceeded
  }
  
  return false;
}

module.exports = { trackFailedAuth };
```

### 3.3 Unknown DB Connection Alert

**Condition**: New application_name not in whitelist connects to DB

```sql
-- Whitelist of known application names
CREATE TABLE IF NOT EXISTS db_connection_whitelist (
  application_name TEXT PRIMARY KEY,
  description TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT
);

INSERT INTO db_connection_whitelist (application_name, description) VALUES
  ('bisman_erp_app', 'Main application'),
  ('bisman_erp_worker', 'Background job worker'),
  ('bisman_erp_migration', 'Migration runner'),
  ('pgAdmin 4', 'Admin tool'),
  ('psql', 'CLI access'),
  ('prisma', 'Prisma client'),
  ('pg_dump', 'Backup tool'),
  ('pg_restore', 'Restore tool');

-- Query to detect unknown connections
SELECT 
  application_name,
  client_addr,
  usename,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE application_name NOT IN (
  SELECT application_name FROM db_connection_whitelist
)
AND application_name != ''
AND state = 'active';
```

**Monitoring Script**:
```javascript
// scripts/monitorDbConnections.js
const { Pool } = require('pg');

const WHITELIST = [
  'bisman_erp_app',
  'bisman_erp_worker',
  'bisman_erp_migration',
  'pgAdmin 4',
  'psql',
  'prisma',
  'pg_dump',
  'pg_restore'
];

async function checkUnknownConnections() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const result = await pool.query(`
    SELECT DISTINCT application_name, client_addr, usename
    FROM pg_stat_activity
    WHERE application_name NOT IN (${WHITELIST.map((_, i) => `$${i+1}`).join(',')})
    AND application_name != ''
    AND state = 'active'
  `, WHITELIST);
  
  if (result.rows.length > 0) {
    console.error('[SECURITY ALERT] Unknown DB connections detected:');
    result.rows.forEach(row => {
      console.error(`  - App: ${row.application_name}, IP: ${row.client_addr}, User: ${row.usename}`);
    });
    
    // Send to alerting system
    // await sendAlert('unknown_db_connection', result.rows);
  }
  
  await pool.end();
}

// Run every minute
setInterval(checkUnknownConnections, 60000);
```

---

## 4. 🔑 DB Credential Rotation Schedule

### Policy Options

| Policy | Rotation Frequency | Use Case |
|--------|-------------------|----------|
| Standard | 90 days | Low-risk environments |
| Enhanced | 30 days | Production, compliance-required |
| High Security | 7 days | High-risk, financial data |

### Rotation Procedure

```bash
#!/bin/bash
# DB Credential Rotation Script
# Schedule: cron job or manual execution

set -e

NEW_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
ROTATION_DATE=$(date +%Y%m%d)
NEW_USER="bisman_app_${ROTATION_DATE}"

echo "🔐 Starting DB Credential Rotation"

# Step 1: Create new user with same privileges
psql "$ADMIN_DATABASE_URL" << SQL
-- Create new user
CREATE USER ${NEW_USER} WITH PASSWORD '${NEW_PASSWORD}';

-- Grant privileges
GRANT CONNECT ON DATABASE bisman_erp TO ${NEW_USER};
GRANT USAGE ON SCHEMA public TO ${NEW_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${NEW_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${NEW_USER};

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${NEW_USER};
SQL

echo "✅ New user created: ${NEW_USER}"

# Step 2: Update application secret (Railway example)
# railway variables set DATABASE_URL="postgresql://${NEW_USER}:${NEW_PASSWORD}@host:5432/bisman_erp"

# Step 3: Wait for deployment and verify
echo "⏳ Waiting for application restart..."
sleep 60

# Step 4: Verify new credentials work
if psql "postgresql://${NEW_USER}:${NEW_PASSWORD}@host:5432/bisman_erp" -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ New credentials verified"
else
  echo "❌ New credentials failed - ROLLBACK REQUIRED"
  exit 1
fi

# Step 5: Revoke old user (after grace period)
echo "📝 Schedule old user revocation in 24 hours"
# Add to scheduled job or manual checklist

echo "🎉 Rotation Complete"
```

### Rotation Checklist
- [ ] Generate new credentials
- [ ] Create new DB user
- [ ] Update application secrets
- [ ] Deploy and verify
- [ ] Monitor for errors (24h)
- [ ] Revoke old credentials
- [ ] Update documentation
- [ ] Notify security team

---

## 5. 📋 Compliance Artifacts (ISO 27001 / GDPR)

### Data Inventory Template

```markdown
## Data Inventory - BISMAN ERP

### Personal Data Categories

| Category | Data Elements | Retention | Legal Basis | Storage Location |
|----------|--------------|-----------|-------------|------------------|
| User Identity | name, email, phone | Account lifetime + 7 years | Contract | PostgreSQL (encrypted) |
| Authentication | password_hash, sessions | Active only | Contract | PostgreSQL + Redis |
| Audit Logs | user_id, actions, timestamps | 7 years | Legal obligation | PostgreSQL |
| Financial | invoices, payments | 10 years | Legal obligation | PostgreSQL (encrypted) |

### Data Flow Diagram
[Attach data flow diagram showing how PII moves through system]

### Third-Party Processors
| Vendor | Purpose | Data Shared | DPA Signed |
|--------|---------|-------------|------------|
| Railway | Hosting | All data | Yes |
| Redis Cloud | Caching | Session data | Yes |
| [Other] | [Purpose] | [Data] | [Yes/No] |
```

### Retention Policy Document

```markdown
## Data Retention Policy

### Retention Periods

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| User accounts | Lifetime + 30 days after deletion request | Soft delete → Hard delete |
| Session data | 7 days inactive | Automatic expiry |
| Audit logs | 7 years | Archived to cold storage |
| Financial records | 10 years | Archived to cold storage |
| System logs | 90 days | Automatic rotation |

### Deletion Procedures
1. User requests deletion via [method]
2. Identity verified within 48 hours
3. Soft delete applied immediately
4. Hard delete after 30-day grace period
5. Confirmation sent to user
6. Audit log entry created (retained for compliance)
```

### Consent Records Schema

```sql
-- Consent tracking table
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'third_party'
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_text TEXT, -- The actual text user agreed to
  consent_version TEXT, -- Version of consent form
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_user ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(consent_type);

-- Audit trigger for consent changes
CREATE TRIGGER consent_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### GDPR Rights Implementation Checklist

| Right | Endpoint | Implemented | Tested |
|-------|----------|-------------|--------|
| Access (Art. 15) | GET /api/user/data-export | ⏳ | ⏳ |
| Rectification (Art. 16) | PUT /api/user/profile | ✅ | ✅ |
| Erasure (Art. 17) | DELETE /api/user/account | ⏳ | ⏳ |
| Portability (Art. 20) | GET /api/user/data-export?format=json | ⏳ | ⏳ |
| Object (Art. 21) | PUT /api/user/consent | ⏳ | ⏳ |

---

## 📊 Tracking & Review

### Weekly Security Standup Agenda
1. Review open action items
2. Check alerting effectiveness
3. Review any security incidents
4. Update risk register
5. Plan next week's priorities

### Monthly Security Review
1. Restore drill results
2. Credential rotation status
3. Penetration test progress
4. Compliance artifact updates
5. Training completion rates

### Quarterly Security Board Report
1. Executive summary of security posture
2. Key metrics and trends
3. Incident summary
4. Upcoming initiatives
5. Budget/resource needs

---

## 📞 Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Security Lead | TBD | security@company.com | - |
| DevOps Lead | TBD | devops@company.com | - |
| Compliance Officer | TBD | compliance@company.com | - |
| External Pen Test Vendor | TBD | - | - |

---

*Document Version: 1.0*  
*Last Updated: 2025-12-05*  
*Next Review: 2025-12-12*
