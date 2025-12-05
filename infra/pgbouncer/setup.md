# PgBouncer Setup Guide for BISMAN ERP

## Overview

PgBouncer is a lightweight connection pooler for PostgreSQL that helps prevent database connection exhaustion when running multiple application instances. This guide covers deploying PgBouncer between your Node.js backend and PostgreSQL.

## Why PgBouncer?

| Problem | Solution |
|---------|----------|
| Each app instance opens its own DB connections | PgBouncer multiplexes connections |
| Cloud Postgres has connection limits (e.g., 100-500) | Pool connections efficiently |
| Connection setup overhead | Reuse existing connections |
| Horizontal scaling exhausts connections | Fixed pool size regardless of app instances |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   App Instance  │────▶│    PgBouncer    │────▶│   PostgreSQL    │
│   (my-backend)  │     │   (port 6432)   │     │   (port 5432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
┌─────────────────┐            │
│   App Instance  │────────────┘
│   (replica 2)   │
└─────────────────┘
┌─────────────────┐            │
│   App Instance  │────────────┘
│   (replica N)   │
└─────────────────┘
```

---

## Quick Start

### 1. Create Configuration Files

The following files should be in `infra/pgbouncer/`:

- `pgbouncer.ini` - Main configuration
- `userlist.txt` - User authentication
- `Dockerfile` (optional, for custom image)

### 2. Generate Password Hash

```bash
# Method 1: Using pg_md5 (if installed)
pg_md5 --username=dbuser yourpassword

# Method 2: Using PostgreSQL
psql -c "SELECT 'md5' || md5('yourpassword' || 'dbuser');"

# Method 3: Using bash
echo -n "yourpassworddbuser" | md5sum | awk '{print "md5"$1}'
```

### 3. Update userlist.txt

```txt
"dbuser" "md5<generated-hash>"
```

### 4. Deploy with Docker Compose

```bash
cd infra/pgbouncer
docker-compose up -d
```

### 5. Update Application DATABASE_URL

```env
# Before (direct to Postgres)
DATABASE_URL="postgresql://dbuser:password@postgres-host:5432/bisman_prod"

# After (via PgBouncer)
DATABASE_URL="postgresql://dbuser:password@pgbouncer-host:6432/bisman_prod?pgbouncer=true"
```

---

## Configuration Details

### Pool Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `session` | Connection held for entire session | Legacy apps with session state |
| `transaction` | Connection released after each transaction | **Recommended for web apps** |
| `statement` | Connection released after each statement | Read-only workloads |

We use `transaction` mode for optimal connection reuse with Prisma.

### Tuning Parameters

| Parameter | Default | Recommended | Notes |
|-----------|---------|-------------|-------|
| `default_pool_size` | 20 | 20-50 | Connections per user/database pair |
| `min_pool_size` | 0 | 5 | Keep warm connections |
| `reserve_pool_size` | 0 | 5 | Emergency connections |
| `max_client_conn` | 100 | 500-1000 | Max client connections to PgBouncer |
| `max_db_connections` | unlimited | 90 | Total connections to Postgres |

### Formula for Sizing

```
max_db_connections = (num_app_instances × connections_per_instance) + headroom

# Example: 5 app instances, 20 connections each
max_db_connections = (5 × 20) + 10 = 110

# But if Postgres limit is 100, set:
default_pool_size = 15
max_db_connections = 90 (leave 10 for admin)
```

---

## Prisma Compatibility

### Important Notes

1. **Transaction mode works with Prisma** - No changes to schema.prisma needed
2. **Add `pgbouncer=true`** to DATABASE_URL for proper handling
3. **Prepared statements** - Prisma handles this automatically

### schema.prisma (unchanged)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Connection String Format

```env
# Standard format with PgBouncer
DATABASE_URL="postgresql://user:password@pgbouncer:6432/dbname?pgbouncer=true&connection_limit=10"
```

The `pgbouncer=true` parameter tells Prisma to:
- Disable prepared statements at the protocol level
- Use text protocol for parameters

---

## AWS RDS Deployment

### RDS-Specific Configuration

```ini
[databases]
* = host=your-rds-instance.region.rds.amazonaws.com port=5432 user=${PGUSER} password=${PGPASSWORD}

[pgbouncer]
# ... other settings ...

# RDS TLS Configuration
server_tls_sslmode = require
server_tls_ca_file = /etc/ssl/certs/rds-ca-bundle.pem
```

### Download RDS CA Bundle

```bash
# Add to Dockerfile or download at runtime
curl -o /etc/ssl/certs/rds-ca-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

### Environment Variables for RDS

```env
# PgBouncer settings
PGBOUNCER_HOST=pgbouncer.internal
PGBOUNCER_PORT=6432

# RDS settings (for PgBouncer to connect)
PG_HOST=mydb.abc123.us-east-1.rds.amazonaws.com
PG_PORT=5432
PG_DATABASE=bisman_prod
PG_USER=bisman_app
PG_PASSWORD=<secure-password>

# Application DATABASE_URL (points to PgBouncer)
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PGBOUNCER_HOST}:${PGBOUNCER_PORT}/${PG_DATABASE}?sslmode=require&pgbouncer=true"
```

---

## Health Checks

### Docker Compose Health Check

```yaml
healthcheck:
  test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### Application-Level Health Check

```javascript
// my-backend/lib/pgbouncerHealth.js
const { Pool } = require('pg');

async function checkPgBouncer() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as health');
    client.release();
    await pool.end();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

module.exports = { checkPgBouncer };
```

### Kubernetes Probe

```yaml
livenessProbe:
  exec:
    command:
      - pg_isready
      - -h
      - localhost
      - -p
      - "6432"
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  exec:
    command:
      - psql
      - -h
      - localhost
      - -p
      - "6432"
      - -U
      - pgbouncer
      - -d
      - pgbouncer
      - -c
      - "SHOW STATS"
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Monitoring

### PgBouncer Admin Console

```bash
# Connect to admin console
psql -h pgbouncer-host -p 6432 -U pgbouncer pgbouncer

# Useful commands
SHOW STATS;          -- Connection statistics
SHOW POOLS;          -- Pool status
SHOW CLIENTS;        -- Connected clients
SHOW SERVERS;        -- Backend server connections
SHOW DATABASES;      -- Database configuration
SHOW CONFIG;         -- Current configuration
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Notes |
|--------|-----------------|-------|
| `cl_active` | > 80% of max_client_conn | Client connections |
| `sv_active` | > 80% of pool_size | Server connections |
| `avg_wait_time` | > 100ms | Connection wait time |
| `total_xact_count` | Trend | Transaction throughput |

### Prometheus Metrics (via pgbouncer_exporter)

```yaml
# Add to docker-compose.yml
pgbouncer-exporter:
  image: prometheuscommunity/pgbouncer-exporter
  environment:
    - PGBOUNCER_EXPORTER_HOST=pgbouncer
    - PGBOUNCER_EXPORTER_PORT=6432
    - PGBOUNCER_EXPORTER_USER=pgbouncer
    - PGBOUNCER_EXPORTER_PASSWORD=${PGBOUNCER_STATS_PASSWORD}
  ports:
    - "9127:9127"
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "too many clients" | max_client_conn reached | Increase max_client_conn or reduce app pool size |
| "no more connections allowed" | Pool exhausted | Increase default_pool_size or check for leaks |
| Slow queries | Pool contention | Check SHOW POOLS for waiting clients |
| Auth failures | Wrong hash format | Regenerate md5 hash with correct username |

### Debug Logging

```ini
# In pgbouncer.ini
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
verbose = 1
```

### Connection Leak Detection

```sql
-- Run on PostgreSQL directly
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  NOW() - query_start as query_duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

---

## Deployment Checklist

- [ ] Generate MD5 password hash for userlist.txt
- [ ] Configure pgbouncer.ini with correct Postgres host
- [ ] Set appropriate pool_size based on Postgres max_connections
- [ ] Update application DATABASE_URL with `?pgbouncer=true`
- [ ] Deploy PgBouncer container
- [ ] Verify health check passes
- [ ] Test application connectivity
- [ ] Set up monitoring/alerting
- [ ] Document connection string in secrets manager

---

## References

- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [Prisma + PgBouncer](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)
- [AWS RDS + PgBouncer](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
