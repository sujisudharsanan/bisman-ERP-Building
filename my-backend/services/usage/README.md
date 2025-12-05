# Per-Tenant Usage Metering & Quotas

## Overview

This module provides:
1. **Usage Metering** - Track API calls, storage, active users per tenant per day
2. **Quota Enforcement** - Limit requests based on tenant plan (free/pro/enterprise)
3. **Usage API** - Query historical usage data for billing and analytics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
└─────────────────────────────────────────────────────────────────┘

  Request → [tenantQuota] → [usageMeter] → Route Handler → Response
               │                 │
               │                 │
               ▼                 ▼
          ┌─────────┐      ┌──────────────┐
          │  Redis  │      │  PostgreSQL  │
          │ (quota  │      │ (TenantUsage │
          │ counters)│     │   table)     │
          └─────────┘      └──────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | TenantUsage model |
| `migrations/xxx_tenant_usage.sql` | Database migration |
| `middleware/usageMeter.js` | Increment API call counters |
| `middleware/tenantQuota.js` | Enforce rate limits by plan |
| `services/usage/usageService.js` | Usage aggregation service |
| `services/usage/quotaService.js` | Quota configuration service |
| `routes/adminUsage.js` | Admin API for usage data |

## Quick Start

```bash
# 1. Add migration
npx prisma migrate dev --name add_tenant_usage

# 2. Add middleware to app.js
const usageMeter = require('./middleware/usageMeter');
const tenantQuota = require('./middleware/tenantQuota');

app.use(tenantQuota);  // Check quota first
app.use(usageMeter);   // Then record usage
```

## Environment Variables

```env
# Redis for quota counters
REDIS_URL=redis://localhost:6379

# Usage metering
USAGE_METER_ENABLED=true
USAGE_METER_BATCH_SIZE=100
USAGE_METER_FLUSH_INTERVAL_MS=5000

# Default quotas (can be overridden per tenant)
QUOTA_FREE_PER_MINUTE=60
QUOTA_FREE_PER_DAY=5000
QUOTA_PRO_PER_MINUTE=300
QUOTA_PRO_PER_DAY=50000
QUOTA_ENTERPRISE_PER_MINUTE=1000
QUOTA_ENTERPRISE_PER_DAY=500000
```

## Usage Examples

### Check Tenant Usage

```bash
# Get usage for a tenant
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/usage/tenant-uuid?from=2024-01-01&to=2024-01-31"
```

### Response

```json
{
  "tenantId": "uuid-here",
  "period": { "from": "2024-01-01", "to": "2024-01-31" },
  "totals": {
    "apiCalls": 125000,
    "storageBytes": 1073741824,
    "activeUsers": 45
  },
  "daily": [
    { "date": "2024-01-01", "apiCalls": 4500, "storageBytes": 1073741824, "activeUsers": 42 },
    ...
  ]
}
```

### Rate Limit Headers

```
X-RateLimit-Limit-Minute: 300
X-RateLimit-Remaining-Minute: 295
X-RateLimit-Limit-Day: 50000
X-RateLimit-Remaining-Day: 49500
Retry-After: 60  (only if 429)
```
