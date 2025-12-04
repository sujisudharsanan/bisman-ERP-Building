# Security CI/CD Documentation

> Comprehensive guide for running security tests, migrations, and pre-deployment checks.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Running Tests Locally](#running-tests-locally)
3. [Running Tests in CI](#running-tests-in-ci)
4. [Database Migrations](#database-migrations)
5. [RLS Tests](#rls-tests)
6. [Security Smoke Test](#security-smoke-test)
7. [Pre-Deploy Checklist](#pre-deploy-checklist)
8. [Docker Compose for CI](#docker-compose-for-ci)
9. [Troubleshooting](#troubleshooting)

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (production) | `postgresql://user:pass@host:5432/bisman` |
| `TEST_DB_URL` | PostgreSQL connection for tests | `postgresql://user:pass@localhost:5432/bisman_test` |
| `REDIS_URL` | Redis connection string | `redis://:password@host:6379/0` |
| `ENCRYPTION_KEY` | 32-byte hex key for PII encryption | `a]1b2c3d4e5f6...` (64 hex chars) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | JWT/session signing key | - |
| `RATE_LIMIT_REDIS_PREFIX` | Redis key prefix | `rl:` |
| `AUDIT_LOG_RETENTION_DAYS` | Days to keep audit logs | `90` |

### Generating Secure Keys

```bash
# Generate ENCRYPTION_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -base64 48

# Example .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bisman
TEST_DB_URL=postgresql://postgres:postgres@localhost:5432/bisman_test
REDIS_URL=redis://localhost:6379/0
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -base64 48)
NODE_ENV=development
EOF
```

---

## Running Tests Locally

### Prerequisites

```bash
# Install dependencies
cd my-backend
npm install

# Ensure PostgreSQL and Redis are running
docker-compose up -d postgres redis

# Create test database
createdb bisman_test
```

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests (requires DB)
npm run test:integration

# Security-specific tests
npm run test:security

# Run with coverage
npm run test:coverage
```

### Run Specific Test Suites

```bash
# RLS tests only
npx jest tests/rls.test.js --runInBand --verbose

# Auth tests
npx jest tests/auth.test.js --runInBand

# RBAC middleware tests
npx jest tests/rbac.test.js --runInBand

# All security tests matching pattern
npx jest --testPathPattern="security|rls|rbac|auth" --runInBand
```

### Watch Mode (Development)

```bash
# Watch for changes and re-run tests
npm run test:watch

# Watch specific file
npx jest tests/rls.test.js --watch
```

---

## Running Tests in CI

### GitHub Actions Example

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [main, deployment]
  pull_request:
    branches: [main]

env:
  NODE_ENV: test

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: bisman_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: my-backend/package-lock.json
      
      - name: Install dependencies
        working-directory: my-backend
        run: npm ci
      
      - name: Run migrations
        working-directory: my-backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bisman_test
        run: |
          npm run db:migrate
      
      - name: Run RLS tests
        working-directory: my-backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bisman_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          npx jest tests/rls.test.js --runInBand --verbose
      
      - name: Run security smoke test
        working-directory: my-backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bisman_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          node tools/securitySmokeTest.js
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: my-backend/coverage/
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - test
  - security

variables:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  POSTGRES_DB: bisman_test
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/bisman_test
  REDIS_URL: redis://redis:6379/0

security-tests:
  stage: security
  image: node:20-alpine
  services:
    - postgres:17
    - redis:7-alpine
  before_script:
    - cd my-backend
    - npm ci
  script:
    - npm run db:migrate
    - npx jest tests/rls.test.js --runInBand
    - node tools/securitySmokeTest.js
  artifacts:
    reports:
      junit: my-backend/junit.xml
```

---

## Database Migrations

### Running Migrations

```bash
# Navigate to backend
cd my-backend

# Run all pending migrations
npm run db:migrate

# Or run directly with psql
psql $DATABASE_URL -f database/migrations/013_add_constraints_indexes.sql

# Run specific migration
psql $DATABASE_URL -f database/migrations/001_create_audit_tables.sql
```

### Migration Order

Run migrations in numerical order:

```bash
# List all migrations
ls -la database/migrations/

# Run in order
for f in database/migrations/*.sql; do
  echo "Running $f..."
  psql $DATABASE_URL -f "$f"
done
```

### Verify Migrations

```bash
# Run verification script
psql $DATABASE_URL -f tools/verify_migrations.sql

# Check specific table structure
psql $DATABASE_URL -c "\d+ payment_requests"

# Check RLS status
psql $DATABASE_URL -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'payment_requests';"
```

### Rollback (Emergency)

```bash
# Rollback scripts are in database/migrations/rollback/
psql $DATABASE_URL -f database/migrations/rollback/013_rollback.sql

# Or manual rollback
psql $DATABASE_URL << 'EOF'
-- Remove indexes
DROP INDEX IF EXISTS idx_audit_logs_dml_created_at;
DROP INDEX IF EXISTS idx_payment_requests_tenant_id;

-- Disable RLS (DANGEROUS - only in emergency)
-- ALTER TABLE payment_requests DISABLE ROW LEVEL SECURITY;
EOF
```

---

## RLS Tests

### Understanding RLS Tests

The RLS (Row Level Security) tests verify that:
1. Tenant A can only see Tenant A's data
2. Tenant B cannot see Tenant A's data
3. Cross-tenant writes are blocked
4. Empty tenant context returns no data

### Running RLS Tests Locally

```bash
# Set up test database with RLS
psql $TEST_DB_URL << 'EOF'
-- Enable RLS on test tables
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON payment_requests
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EOF

# Run RLS tests
DATABASE_URL=$TEST_DB_URL npx jest tests/rls.test.js --runInBand --verbose
```

### RLS Test Output Interpretation

```
✅ PASS  tests/rls.test.js
  Row Level Security (RLS) Integration Tests
    Test Data Setup
      ✓ should create test tenants (tenantA and tenantB) (45 ms)
      ✓ should create payment_requests for tenantA only (23 ms)
    RLS Policy Enforcement
      ✓ tenantA session should see tenantA payment_requests (12 ms)
      ✓ tenantB session should see NO payment_requests (isolation) (8 ms)
      ✓ tenantB cannot access tenantA payment_requests by ID (7 ms)
    Cross-Tenant Write Prevention
      ✓ tenantB cannot UPDATE tenantA payment_requests (15 ms)
      ✓ tenantB cannot DELETE tenantA payment_requests (9 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### Common RLS Test Failures

| Error | Cause | Fix |
|-------|-------|-----|
| "All rows returned" | RLS not enabled | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| "No policy exists" | Missing policy | Create tenant_isolation policy |
| "Permission denied" | Wrong DB user | Use non-superuser for tests |
| "UUID cast error" | Empty tenant setting | Check `current_setting` with `true` flag |

---

## Security Smoke Test

### Running the Smoke Test

```bash
# Full smoke test
DATABASE_URL="postgresql://..." \
REDIS_URL="redis://..." \
node tools/securitySmokeTest.js

# Without Redis (partial test)
DATABASE_URL="postgresql://..." \
node tools/securitySmokeTest.js
```

### Interpreting Results

#### Successful Output

```
═══════════════════════════════════════════════════════════════
🔒 BISMAN ERP Security Smoke Test
═══════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────
📋 Database Connection
──────────────────────────────────────────────────────────────
  ✅ DB Connection: Connected to "bisman" as "bisman_backend"

──────────────────────────────────────────────────────────────
📋 Database Roles
──────────────────────────────────────────────────────────────
  ✅ Required Roles: All 4 roles exist

──────────────────────────────────────────────────────────────
📋 Row Level Security (RLS)
──────────────────────────────────────────────────────────────
  ✅ RLS Enabled: All 11 tables have RLS enabled
  ✅ RLS Policies: 15 policies found across 11 tables

═══════════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════════
  ✅ Passed:   12
  ❌ Failed:   0
  ⚠️  Warnings: 2

🎉 ALL SECURITY CHECKS PASSED
```

#### Failed Output (Needs Remediation)

```
──────────────────────────────────────────────────────────────
📋 Row Level Security (RLS)
──────────────────────────────────────────────────────────────
  ❌ RLS Enabled: Missing RLS on: payment_requests, invoices
     💡 Remediation: ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

  ❌ RLS Policies: Tables with RLS but no policies: users_enhanced
     💡 Remediation: CREATE POLICY tenant_isolation ON <table> ...

═══════════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════════
  ✅ Passed:   8
  ❌ Failed:   2
  ⚠️  Warnings: 1

🚨 SECURITY CHECKS FAILED
   Review the failures above and apply remediations before deploying.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (with or without warnings) |
| `1` | One or more checks failed |

### Adding to package.json

```json
{
  "scripts": {
    "security:smoke": "node tools/securitySmokeTest.js",
    "security:verify": "psql $DATABASE_URL -f tools/verify_migrations.sql",
    "security:all": "npm run security:smoke && npm run test:rls"
  }
}
```

---

## Pre-Deploy Checklist

### 🔐 Credentials & Secrets

- [ ] **Rotate database passwords**
  ```bash
  # Generate new password
  openssl rand -base64 32
  
  # Update in PostgreSQL
  psql -c "ALTER USER bisman_backend PASSWORD 'new_password';"
  
  # Update in vault/secrets manager
  ```

- [ ] **Rotate Redis password**
  ```bash
  redis-cli CONFIG SET requirepass "new_password"
  ```

- [ ] **Rotate ENCRYPTION_KEY** (if compromised)
  ```bash
  # WARNING: Requires re-encryption of all PII data
  # 1. Generate new key
  openssl rand -hex 32
  
  # 2. Run re-encryption migration
  node scripts/reencrypt-pii.js --old-key=$OLD_KEY --new-key=$NEW_KEY
  ```

- [ ] **Rotate SESSION_SECRET**
  ```bash
  # WARNING: Will invalidate all active sessions
  openssl rand -base64 48
  ```

### 🔑 Vault/Secrets Manager

- [ ] **Add secrets to vault**
  ```bash
  # HashiCorp Vault example
  vault kv put secret/bisman/production \
    DATABASE_URL="postgresql://..." \
    REDIS_URL="redis://..." \
    ENCRYPTION_KEY="..." \
    SESSION_SECRET="..."
  
  # AWS Secrets Manager
  aws secretsmanager create-secret \
    --name bisman/production \
    --secret-string '{"DATABASE_URL":"..."}'
  ```

- [ ] **Verify vault access**
  ```bash
  vault kv get secret/bisman/production
  ```

- [ ] **Set up secret rotation schedule**

### 💾 Backup

- [ ] **Create database backup**
  ```bash
  # Full backup
  pg_dump $DATABASE_URL -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump
  
  # Schema only (for verification)
  pg_dump $DATABASE_URL --schema-only -f schema_backup.sql
  ```

- [ ] **Verify backup integrity**
  ```bash
  pg_restore --list backup_*.dump | head -20
  ```

- [ ] **Test restore procedure** (on staging)
  ```bash
  createdb bisman_restore_test
  pg_restore -d bisman_restore_test backup_*.dump
  ```

- [ ] **Backup Redis** (if using persistence)
  ```bash
  redis-cli BGSAVE
  cp /var/lib/redis/dump.rdb backup_redis_$(date +%Y%m%d).rdb
  ```

### 🧪 Pre-Deploy Tests

- [ ] **Run security smoke test**
  ```bash
  node tools/securitySmokeTest.js
  ```

- [ ] **Run RLS tests**
  ```bash
  npx jest tests/rls.test.js --runInBand
  ```

- [ ] **Verify migrations**
  ```bash
  psql $DATABASE_URL -f tools/verify_migrations.sql
  ```

- [ ] **Check for SQL injection vulnerabilities**
  ```bash
  # Using sqlmap or similar
  npm run security:scan
  ```

### 📋 Final Verification

- [ ] All environment variables set in production
- [ ] SSL/TLS enabled for database connections
- [ ] Redis password authentication enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error reporting configured (Sentry, etc.)
- [ ] Health check endpoints responding

---

## Docker Compose for CI

### Complete CI Docker Compose

```yaml
# docker-compose.ci.yml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bisman_test
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Pre-load extensions
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/bisman_test
      REDIS_URL: redis://redis:6379/0
      NODE_ENV: test
      ENCRYPTION_KEY: test_encryption_key_32_bytes_hex
    volumes:
      - ./my-backend:/app
      - /app/node_modules
    command: |
      sh -c "
        npm run db:migrate &&
        npm run test:security &&
        node tools/securitySmokeTest.js
      "

volumes:
  postgres_data:
```

### Database Init Script

```sql
-- database/init.sql
-- Pre-load required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application roles
CREATE ROLE bisman_backend WITH LOGIN PASSWORD 'backend_password';
CREATE ROLE bisman_frontend WITH LOGIN PASSWORD 'frontend_password';
CREATE ROLE bisman_worker WITH LOGIN PASSWORD 'worker_password';
CREATE ROLE bisman_migrator WITH LOGIN PASSWORD 'migrator_password';

-- Grant permissions
GRANT CONNECT ON DATABASE bisman_test TO bisman_backend;
GRANT USAGE ON SCHEMA public TO bisman_backend;
```

### Running CI Tests with Docker

```bash
# Start services and run tests
docker-compose -f docker-compose.ci.yml up --build --abort-on-container-exit

# Run specific test
docker-compose -f docker-compose.ci.yml run test-runner \
  npx jest tests/rls.test.js --runInBand

# Clean up
docker-compose -f docker-compose.ci.yml down -v
```

---

## Troubleshooting

### Common Issues

#### "relation does not exist"
```bash
# Run migrations first
npm run db:migrate

# Or check if connected to correct database
psql $DATABASE_URL -c "SELECT current_database();"
```

#### "permission denied for table"
```bash
# Grant permissions to application role
psql $DATABASE_URL -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO bisman_backend;"
```

#### "RLS policies bypass all rows returned"
```bash
# You're connected as superuser - use application role
psql "postgresql://bisman_backend:password@localhost:5432/bisman" -c "SELECT * FROM payment_requests;"
```

#### "Redis connection refused"
```bash
# Check Redis is running
redis-cli ping

# Check connection string
redis-cli -u $REDIS_URL ping
```

#### "ENCRYPTION_KEY invalid"
```bash
# Key must be exactly 64 hex characters (32 bytes)
echo $ENCRYPTION_KEY | wc -c  # Should be 65 (64 + newline)

# Generate valid key
export ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Debug Mode

```bash
# Run smoke test with verbose output
DEBUG=* node tools/securitySmokeTest.js

# Run Jest with verbose
npx jest tests/rls.test.js --verbose --detectOpenHandles

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-17-main.log
```

### Getting Help

1. Check the [Security Implementation Guide](../docs/SECURITY_IMPLEMENTATION.md)
2. Review [RBAC Documentation](../database/RBAC_Implementation_Guide.md)
3. Check audit logs: `SELECT * FROM audit_logs_dml ORDER BY created_at DESC LIMIT 10;`
4. Contact security team: security@bisman.com

---

## Quick Reference

```bash
# Run everything
npm run security:all

# Just smoke test
npm run security:smoke

# Just RLS tests
npm run test:rls

# Verify migrations
npm run security:verify

# Pre-deploy check
npm run predeploy:security
```

---

*Last updated: December 2024*
*Version: 1.0.0*
