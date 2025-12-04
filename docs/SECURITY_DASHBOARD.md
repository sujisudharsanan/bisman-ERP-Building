# 🛡️ Enterprise Security Operations Dashboard

## Overview

This document describes the comprehensive Security Operations Dashboard built for BISMAN ERP Enterprise Admin. The dashboard provides real-time visibility into all security infrastructure components.

## Features Displayed

### 1. Security Scan Results
- **Route Security Analysis**: Shows all API routes with their auth/RBAC status
- **Raw SQL Detection**: Identifies potential SQL injection risks
- **Audit Log Analysis**: Patterns from audit logs (failed logins, bulk exports, permission changes)
- **Database Connections**: Active/idle/waiting connections status

### 2. Service → Table Usage Tracking
- Tracks which services access which database tables
- Filter by: All / Sensitive / Suspicious
- Mark services as suspicious with one click
- Shows operation type (SELECT/INSERT/UPDATE/DELETE) and access count

### 3. Rate Limiting Statistics
- Per-endpoint rate limit usage visualization
- Progress bars showing current vs limit
- Blocked request counts
- Window duration display

### 4. Distributed Lock Status
- Active locks with owner information
- TTL remaining
- Acquisition timestamp

### 5. Redis Cache Health
- Total keys count
- Memory usage
- Hit/miss rate
- Active PUB/SUB channels
- Connected clients

### 6. Background Cleanup Jobs
- Job name and status (scheduled/running/completed/failed)
- Last run / Next run times
- Records processed count
- Duration

### 7. Audit Log Viewer
- Expandable log entries
- Shows action, table, user, timestamp
- Old vs new values diff view
- IP address and user agent

## File Structure

```
my-frontend/
├── src/
│   ├── app/
│   │   └── enterprise-admin/
│   │       └── security-operations/
│   │           └── page.tsx                    # Page route
│   ├── components/
│   │   └── enterprise/
│   │       └── EnterpriseSecurityDashboard.tsx # Main dashboard component (1100+ lines)
│   └── hooks/
│       └── useSecurityDashboard.ts             # API hook with all fetch functions

my-backend/
├── routes/
│   ├── security.js                             # Security scan endpoints
│   ├── securityDashboard.js                    # Dashboard data aggregation
│   └── serviceTableUsage.js                    # Service-table usage tracking
└── app.js                                      # Routes registered here
```

## API Endpoints

### Security Scans (`/api/security/*`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/scan` | GET | Full security scan |
| `/api/security/routes` | GET | Unprotected routes |
| `/api/security/raw-sql` | GET | Raw SQL usage |
| `/api/security/cache` | GET | Stale cache entries |
| `/api/security/audit` | GET | Audit log analysis |
| `/api/security/connections` | GET | DB connections |

### Security Dashboard (`/api/security-dashboard/*`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security-dashboard/cache-health` | GET | Redis cache health |
| `/api/security-dashboard/rate-limit-stats` | GET | Rate limiting stats |
| `/api/security-dashboard/active-locks` | GET | Distributed locks |
| `/api/security-dashboard/job-status` | GET | Cleanup job status |
| `/api/security-dashboard/all` | GET | All dashboard data |

### Service Table Usage (`/api/admin/*`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/service-table-usage` | GET | All usage data |
| `/api/admin/service-table-usage/:name` | GET | Usage by service |
| `/api/admin/sensitive-tables` | GET | Sensitive table access |
| `/api/admin/mark-suspicious` | POST | Mark service suspicious |

## Access Control

- All endpoints require `ENTERPRISE_ADMIN` role
- Uses existing authentication middleware
- Routes protected by RBAC middleware

## Usage

### Frontend Hook Usage
```typescript
import { useSecurityDashboard } from '@/hooks/useSecurityDashboard';

function MyComponent() {
  const {
    scanResult,
    serviceTableUsage,
    rateLimitStats,
    cacheHealth,
    cleanupJobs,
    auditLogs,
    activeLocks,
    loading,
    fetchAll,
    markSuspicious,
  } = useSecurityDashboard({
    autoRefresh: true,
    refreshInterval: 30000,
    useMockData: false, // Set to true for development
  });
  
  // ... use the data
}
```

### Sidebar Navigation
The dashboard is accessible from Enterprise Admin sidebar:
- **🛡️ Security Operations** → `/enterprise-admin/security-operations`

## Auto-Refresh

The dashboard automatically refreshes every 30 seconds. Manual refresh is available via the "Refresh All" button.

## Export

Export functionality placeholder is included for generating security reports.

## Development Mode

Set `useMockData: true` in the hook to use mock data during development without backend connection.

## Related Documentation

- [REDIS_SAFE_PATTERNS.md](./REDIS_SAFE_PATTERNS.md) - Redis patterns for rate limiting, locks, PUB/SUB
- [RBAC_ENFORCEMENT.md](./RBAC_ENFORCEMENT.md) - RBAC middleware implementation
- [INFRASTRUCTURE_SETTINGS.md](./INFRASTRUCTURE_SETTINGS.md) - Infrastructure and DB settings
