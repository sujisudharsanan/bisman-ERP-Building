# P2 Auditing, Detection & Monitoring

## Overview

This document describes the P2 security implementation for auditing, detection, and monitoring in the BISMAN ERP system.

## Components Implemented

### 1. Statement Logging

Statement-level logging is configured for all `bisman_*` database roles:

| Role | Log Level | Description |
|------|-----------|-------------|
| `bisman_backend` | `mod` | Logs INSERT/UPDATE/DELETE statements |
| `bisman_frontend` | `mod` | Logs INSERT/UPDATE/DELETE statements |
| `bisman_worker` | `all` | Logs all statements (for debugging) |

### 2. Database Tables

#### `audit_logs` (Enhanced)
Main audit log table with new columns:
- `service_name` - Which service made the change
- `service_user` - Database user used
- `request_id` - HTTP request ID for tracing
- `tenant_id` - Tenant context
- `super_admin_id` - Owner context
- `changed_fields` - Array of fields that were modified
- `operation_context` - Additional JSON context

#### `service_table_usage`
Aggregated statistics for monitoring:
```sql
SELECT * FROM service_table_usage;
-- service_name | table_name | operation | total_count | avg_execution_ms
```

#### `statement_logs`
Detailed statement logging for debugging:
```sql
SELECT * FROM statement_logs 
WHERE execution_time_ms > 100
ORDER BY logged_at DESC;
```

#### `security_events`
Security-relevant events:
```sql
SELECT * FROM security_events
WHERE severity IN ('ERROR', 'CRITICAL')
ORDER BY created_at DESC;
```

### 3. Audit Triggers

Enhanced triggers are installed on 17 sensitive tables:
- `clients`
- `super_admins`
- `enterprise_admins`
- `users_enhanced`
- `user_kyc`
- `user_bank_accounts`
- `payment_requests`
- `expenses`
- `approvals`
- `rbac_roles`
- `rbac_permissions`
- `permissions`
- `module_assignments`
- `admin_role_assignments`
- `client_module_permissions`
- `user_sessions`
- `branches`

### 4. Views for Monitoring

```sql
-- 24-hour audit summary
SELECT * FROM v_audit_summary_24h;

-- Service usage summary
SELECT * FROM v_service_usage_summary;

-- Security events summary
SELECT * FROM v_security_events_24h;

-- Table activity heatmap
SELECT * FROM v_table_activity_heatmap;
```

## API Endpoints

### Audit Logs

```
GET /api/audit/logs
GET /api/audit/logs/:id
GET /api/audit/summary
```

Query parameters for `/api/audit/logs`:
- `table_name` - Filter by table
- `action` - Filter by action (INSERT, UPDATE, DELETE)
- `user_id` - Filter by user
- `service_name` - Filter by service
- `tenant_id` - Filter by tenant
- `start_date` - Filter from date
- `end_date` - Filter to date
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset

### Service Usage

```
GET /api/audit/services
GET /api/audit/services/:name
GET /api/audit/services/table/:table
```

### Security Events

```
GET /api/audit/security
GET /api/audit/security/summary
POST /api/audit/security/event
```

### Dashboard

```
GET /api/audit/dashboard
GET /api/audit/dashboard/stats
```

### Maintenance

```
POST /api/audit/cleanup
GET /api/audit/statements
```

## Usage in Application

### Setting Audit Context

The application should set audit context at the start of each request:

```javascript
const { setAuditContext } = require('./middleware/auditContext');

// In app.js - add after authenticate middleware
app.use('/api/protected', authenticate, setAuditContext, routes);
```

Or manually in a handler:

```javascript
const { auditService } = require('./services/auditService');

router.post('/action', async (req, res) => {
  await auditService.setContext(req);
  // ... your code
});
```

### Logging Security Events

```javascript
const { auditService } = require('./services/auditService');

// Log a login attempt
await auditService.logLoginAttempt(true, 'user@example.com', '192.168.1.1', {
  userType: 'SUPER_ADMIN',
  userId: 123
});

// Log a permission denied event
await auditService.logPermissionDenied(req, 'ADMIN_ACCESS');

// Log suspicious activity
await auditService.logSuspiciousActivity('RATE_LIMIT_EXCEEDED', req, {
  attempts: 100
});
```

### Tracking Table Usage

```javascript
const { auditService } = require('./services/auditService');

// Track a database operation
await auditService.trackTableUsage('clients', 'SELECT', executionMs, true);
```

## Dashboard Data

The `/api/audit/dashboard` endpoint returns:

```json
{
  "success": true,
  "data": {
    "audit": {
      "summary": [...],
      "recentActivity": [...]
    },
    "services": [...],
    "security": [...],
    "charts": {
      "tableHeatmap": [...],
      "hourlyTrend": [...]
    },
    "generatedAt": "2024-12-04T..."
  }
}
```

## Database Functions

### Set Audit Context
```sql
SELECT set_audit_context(
  123,        -- user_id
  'uuid...',  -- tenant_id
  1,          -- super_admin_id
  'backend',  -- service_name
  'uuid...',  -- request_id
  false       -- is_platform_admin
);
```

### Log Security Event
```sql
SELECT log_security_event(
  'LOGIN_FAILURE',  -- event_type
  'WARNING',        -- severity
  NULL,             -- user_id
  'user@test.com',  -- user_email
  NULL,             -- user_type
  '192.168.1.1',    -- ip_address
  '{"reason": "Invalid password"}'::JSONB  -- details
);
```

### Update Service Usage
```sql
SELECT update_service_usage(
  'backend',   -- service_name
  'clients',   -- table_name
  'SELECT',    -- operation
  50,          -- execution_ms
  true         -- success
);
```

### Cleanup Old Logs
```sql
SELECT * FROM cleanup_old_audit_logs(90);  -- Keep 90 days
```

## Monitoring Queries

### Most Active Tables (24h)
```sql
SELECT table_name, action, COUNT(*) 
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, action
ORDER BY COUNT(*) DESC
LIMIT 10;
```

### Security Alerts
```sql
SELECT * FROM security_events
WHERE severity IN ('ERROR', 'CRITICAL')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Failed Logins by IP
```sql
SELECT ip_address, COUNT(*) as failures
FROM security_events
WHERE event_type = 'LOGIN_FAILURE'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failures DESC;
```

### Slow Operations
```sql
SELECT * FROM service_table_usage
WHERE avg_execution_ms > 100
ORDER BY avg_execution_ms DESC;
```

## Maintenance

### Daily Cleanup (Cron Job)
```bash
# Add to crontab
0 3 * * * psql -U postgres -d BISMAN -c "SELECT cleanup_old_audit_logs(90);"
```

### Retention Policy
- `audit_logs`: 90 days
- `statement_logs`: 30 days
- `security_events`: Indefinite (archived after 90 days)

## Migration Files

- `database/migrations/011_p2_auditing_monitoring.sql`

## Files Created/Modified

### New Files
- `my-backend/routes/audit.js` - Audit API routes
- `my-backend/services/auditService.js` - Audit service
- `my-backend/middleware/auditContext.js` - Audit context middleware

### Modified Files
- `my-backend/routes/auth.js` - Added login audit logging
- `my-backend/app.js` - Added audit routes

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-04  
**Author**: Security Team
