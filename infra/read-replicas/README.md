# PostgreSQL Read Replicas Design

## Overview

Read replicas offload read-heavy queries from the primary database, improving performance and scalability. This document describes how to configure Prisma to route reads to replicas and writes to the primary.

## Architecture

```
                                    ┌─────────────────────┐
                                    │   Read Replica 1    │
                                    │  (read-only copy)   │
                                    └──────────▲──────────┘
                                               │
┌─────────────┐    ┌─────────────────┐         │         ┌─────────────────────┐
│  Application │───▶│  Query Router   │─────────┼────────▶│   Read Replica 2    │
│  (my-backend)│    │  (dbClient.js)  │         │         │  (read-only copy)   │
└─────────────┘    └────────┬────────┘         │         └─────────────────────┘
                            │                  │
                            │ WRITES           │ READS
                            ▼                  │
                   ┌─────────────────┐         │
                   │     Primary     │─────────┘
                   │   (read/write)  │  Async Replication
                   └─────────────────┘
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Primary** | Handles all writes; source of truth |
| **Replica** | Read-only copy; eventually consistent |
| **Replication Lag** | Delay between write on primary and visibility on replica (typically <100ms) |
| **Read-after-Write** | If you need to read data you just wrote, use primary |

---

## Implementation

### 1. Environment Variables

```env
# Primary (read/write)
DATABASE_URL_PRIMARY="postgresql://user:pwd@primary.db.example.com:5432/bisman_prod?sslmode=require"

# Replica(s) (read-only)
DATABASE_URL_REPLICA="postgresql://user:pwd@replica1.db.example.com:5432/bisman_prod?sslmode=require"

# Optional: Multiple replicas (comma-separated)
DATABASE_URL_REPLICAS="postgresql://user:pwd@replica1:5432/bisman_prod,postgresql://user:pwd@replica2:5432/bisman_prod"

# Fallback: If replica fails, use primary for reads
DATABASE_REPLICA_FALLBACK=true

# Legacy compatibility
DATABASE_URL="${DATABASE_URL_PRIMARY}"
```

### 2. Core Files

| File | Purpose |
|------|---------|
| `lib/prisma.js` | Creates primary and replica Prisma clients |
| `lib/dbClient.js` | Query router with failover logic |
| `lib/queryContext.js` | Context for read-after-write consistency |
| `services/queryService.js` | High-level query helpers |

### 3. Query Routing Strategies

| Strategy | When to Use |
|----------|-------------|
| **Explicit** | Call `db.read.user.findMany()` or `db.write.user.create()` |
| **Automatic** | Middleware detects query type (find* → replica, create/update/delete → primary) |
| **Context-based** | After a write, subsequent reads in same request use primary |

---

## Usage Examples

### Basic Read/Write Separation

```javascript
const db = require('./lib/dbClient');

// Reads go to replica
const users = await db.read.user.findMany({ where: { active: true } });

// Writes go to primary
const newUser = await db.write.user.create({ data: { name: 'John' } });
```

### Read-After-Write Consistency

```javascript
const db = require('./lib/dbClient');

// Create user on primary
const user = await db.write.user.create({ data: { name: 'Jane' } });

// Immediately read from primary (not replica) to see the new user
const freshUser = await db.primary.user.findUnique({ where: { id: user.id } });
```

### With Transactions

```javascript
const db = require('./lib/dbClient');

// Transactions always use primary
const result = await db.write.$transaction([
  db.write.user.create({ data: { name: 'User1' } }),
  db.write.user.create({ data: { name: 'User2' } }),
]);
```

### Using Query Helpers

```javascript
const { findReadOnly, createEntity } = require('./services/queryService');

// Read from replica
const products = await findReadOnly('product', { 
  where: { active: true },
  take: 100 
});

// Write to primary
const order = await createEntity('order', {
  customerId: 123,
  items: [{ productId: 1, qty: 2 }]
});
```

---

## Failover Behavior

```
1. Application tries to query replica
2. If replica fails (connection error, timeout):
   a. Log the failure
   b. Mark replica as unhealthy
   c. Fall back to primary for this request
   d. Start health check timer for replica
3. After cooldown period, retry replica
4. If replica recovers, resume using it
```

### Health Check Logic

```javascript
// Replica health status
const replicaHealth = {
  healthy: true,
  lastCheck: Date.now(),
  consecutiveFailures: 0,
  cooldownUntil: 0,
};

// Check before each read
function isReplicaAvailable() {
  if (Date.now() < replicaHealth.cooldownUntil) {
    return false; // Still in cooldown
  }
  return replicaHealth.healthy;
}
```

---

## Best Practices

### ✅ DO

- Use replicas for: Reports, dashboards, search, analytics, list views
- Use primary for: Creating/updating data, reading data you just wrote
- Monitor replication lag
- Set appropriate connection pool sizes per client
- Use health checks for failover

### ❌ DON'T

- Don't use replicas for time-sensitive reads after writes
- Don't assume zero replication lag
- Don't ignore connection errors (implement failover)
- Don't create too many Prisma clients (memory overhead)

---

## Monitoring

### Key Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| `replication_lag_seconds` | > 1s | Delay between primary and replica |
| `replica_query_count` | - | Reads served by replicas |
| `replica_failover_count` | > 5/min | Failovers to primary |
| `replica_error_rate` | > 1% | Failed replica queries |

### Prometheus Metrics (example)

```javascript
// In queryRouter
const replicaQueries = new Counter({
  name: 'db_replica_queries_total',
  help: 'Total queries sent to read replicas',
});

const primaryFallbacks = new Counter({
  name: 'db_primary_fallback_total', 
  help: 'Queries that fell back to primary',
});
```

---

## Cloud Provider Setup

### AWS RDS

```env
DATABASE_URL_PRIMARY="postgresql://user:pwd@mydb.abc123.us-east-1.rds.amazonaws.com:5432/bisman_prod?sslmode=require"
DATABASE_URL_REPLICA="postgresql://user:pwd@mydb-replica.abc123.us-east-1.rds.amazonaws.com:5432/bisman_prod?sslmode=require"
```

### Google Cloud SQL

```env
DATABASE_URL_PRIMARY="postgresql://user:pwd@/bisman_prod?host=/cloudsql/project:region:instance"
DATABASE_URL_REPLICA="postgresql://user:pwd@/bisman_prod?host=/cloudsql/project:region:instance-replica"
```

### Azure Database for PostgreSQL

```env
DATABASE_URL_PRIMARY="postgresql://user:pwd@myserver.postgres.database.azure.com:5432/bisman_prod?sslmode=require"
DATABASE_URL_REPLICA="postgresql://user:pwd@myserver-replica.postgres.database.azure.com:5432/bisman_prod?sslmode=require"
```

---

## Migration Guide

### Step 1: Create Replica (Cloud Console)

1. Go to your cloud provider's database console
2. Create a read replica from your primary instance
3. Wait for initial sync to complete
4. Note the replica endpoint

### Step 2: Update Environment

```bash
# Add to .env.production
DATABASE_URL_REPLICA="postgresql://..."
DATABASE_REPLICA_FALLBACK=true
```

### Step 3: Update Code

Replace direct Prisma usage:

```javascript
// Before
const prisma = require('./lib/prisma');
const users = await prisma.user.findMany();

// After
const db = require('./lib/dbClient');
const users = await db.read.user.findMany();
```

### Step 4: Test

```bash
# Verify reads go to replica
curl http://localhost:3000/api/users  # Check logs for "replica" label

# Verify writes go to primary  
curl -X POST http://localhost:3000/api/users -d '{"name":"Test"}'
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Stale reads | Replication lag | Read from primary for consistency-sensitive ops |
| Connection errors | Replica down | Failover logic falls back to primary |
| High primary load | Not enough reads routed to replica | Review query routing |
| Memory issues | Too many Prisma clients | Share clients, limit pool size |

---

## References

- [Prisma Data Proxy](https://www.prisma.io/docs/data-platform/data-proxy)
- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/high-availability.html)
