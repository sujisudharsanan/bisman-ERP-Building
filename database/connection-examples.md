# Database Connection Configuration Examples

## Environment-specific Database URLs

### Development
```bash
DATABASE_URL="postgresql://erp_admin:Suji@123@localhost:5432/erp_main?sslmode=prefer"
SHADOW_DATABASE_URL="postgresql://erp_admin:Suji@123@localhost:5432/erp_shadow?sslmode=prefer"
```

### Production (Direct Connection)
```bash
DATABASE_URL="postgresql://erp_app:SecureAppPassword2025!@db.company.com:5432/erp_main?sslmode=require&sslcert=/path/to/client.crt&sslkey=/path/to/client.key&sslrootcert=/path/to/ca.crt"
```

### Production (via PgBouncer)
```bash
DATABASE_URL="postgresql://erp_app:SecureAppPassword2025!@pgbouncer.company.com:6432/erp_main?sslmode=require"
```

## PgBouncer Configuration

### pgbouncer.ini
```ini
[databases]
erp_main = host=db.company.com port=5432 dbname=erp_main pool_size=25
erp_main_readonly = host=db-replica.company.com port=5432 dbname=erp_main pool_size=10

[pgbouncer]
# Connection pooling
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Timeouts
server_round_robin = 1
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15

# SSL
server_tls_sslmode = require
server_tls_ca_file = /etc/ssl/certs/ca.crt
server_tls_cert_file = /etc/ssl/certs/client.crt
server_tls_key_file = /etc/ssl/private/client.key

client_tls_sslmode = require
client_tls_ca_file = /etc/ssl/certs/ca.crt
client_tls_cert_file = /etc/ssl/certs/server.crt
client_tls_key_file = /etc/ssl/private/server.key

# Admin
admin_users = pgbouncer_admin
stats_users = erp_admin
```

### userlist.txt
```
"erp_app" "md5hash_of_password"
"erp_readonly" "md5hash_of_password"
"pgbouncer_admin" "md5hash_of_admin_password"
```

## Application Connection Examples

### Node.js with pg Pool
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Set to true with proper certificates
    ca: fs.readFileSync('/path/to/ca.crt'),
    cert: fs.readFileSync('/path/to/client.crt'),
    key: fs.readFileSync('/path/to/client.key')
  } : false
});

// Set application context for audit trails
pool.on('connect', async (client) => {
  await client.query(`
    SELECT erp.set_app_context(
      $1::UUID, -- user_id
      $2::TEXT, -- session_id
      $3::INET, -- client_ip
      $4::TEXT  -- user_agent
    )
  `, [userId, sessionId, clientIp, userAgent]);
});

module.exports = pool;
```

### Prisma Configuration
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

### Connection with Read Replicas
```javascript
const { Pool } = require('pg');

const writePool = new Pool({
  connectionString: process.env.DATABASE_URL_WRITE,
  max: 10
});

const readPool = new Pool({
  connectionString: process.env.DATABASE_URL_READ,
  max: 15
});

class DatabaseManager {
  async write(query, params) {
    const client = await writePool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async read(query, params) {
    const client = await readPool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }
}
```

## Docker Compose Configuration

### Production-ready PostgreSQL with PgBouncer
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: erp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_SUPER_PASSWORD}
      POSTGRES_DB: erp_main
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./database/pg_hba.conf:/etc/postgresql/pg_hba.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    networks:
      - db_network
    ports:
      - "5432:5432"

  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    container_name: erp-pgbouncer
    restart: unless-stopped
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: erp_app
      DATABASES_PASSWORD: ${ERP_APP_PASSWORD}
      DATABASES_DBNAME: erp_main
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 200
      DEFAULT_POOL_SIZE: 25
    volumes:
      - ./database/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
      - ./database/userlist.txt:/etc/pgbouncer/userlist.txt
    depends_on:
      - postgres
    networks:
      - db_network
    ports:
      - "6432:6432"

  app:
    build: .
    container_name: erp-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://erp_app:${ERP_APP_PASSWORD}@pgbouncer:6432/erp_main
      NODE_ENV: production
    depends_on:
      - pgbouncer
    networks:
      - db_network
    ports:
      - "3000:3000"

volumes:
  postgres_data:
    name: erp_postgres_data

networks:
  db_network:
    driver: bridge
```

## Monitoring Configuration

### Connection Monitoring Script
```bash
#!/bin/bash
# Monitor database connections and performance

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="erp_main"
DB_USER="erp_admin"

export PGPASSWORD="${DB_PASSWORD}"

echo "=== Connection Status ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity 
WHERE datname = '$DB_NAME';
"

echo "=== PgBouncer Status (if using PgBouncer) ==="
psql -h "pgbouncer" -p "6432" -U "$DB_USER" -d "pgbouncer" -c "SHOW POOLS;" 2>/dev/null || echo "PgBouncer not available"

echo "=== Slow Queries ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC 
LIMIT 5;
" 2>/dev/null || echo "pg_stat_statements not available"
```

## Health Check Configuration

### Application Health Check
```javascript
// health-check.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5000
});

async function healthCheck() {
  try {
    const client = await pool.connect();
    
    // Test basic connectivity
    await client.query('SELECT 1');
    
    // Test ERP schema access
    await client.query('SELECT count(*) FROM erp.users LIMIT 1');
    
    // Test write capability
    await client.query('SELECT current_timestamp');
    
    client.release();
    
    console.log('Database health check: PASSED');
    return true;
  } catch (error) {
    console.error('Database health check: FAILED', error.message);
    return false;
  }
}

module.exports = { healthCheck };
```

### Docker Health Check
```dockerfile
# Add to your application Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node health-check.js || exit 1
```
