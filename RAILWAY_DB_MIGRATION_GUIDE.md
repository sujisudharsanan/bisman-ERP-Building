# 🚂 Railway Database Migration Guide

**Date**: October 26, 2025  
**Project**: BISMAN ERP Multi-Tenant System  
**Database**: PostgreSQL  
**Status**: Ready for Migration

---

## 📋 Pre-Migration Checklist

Before starting the migration, ensure you have:

- [ ] Railway account created (railway.app)
- [ ] Railway CLI installed
- [ ] Local database backup created
- [ ] Environment variables documented
- [ ] Git repository pushed to GitHub
- [ ] PostgreSQL client tools installed (`psql`, `pg_dump`)

---

## 🎯 Migration Strategy

### Option 1: Fresh Railway Database (Recommended for New Deployments)
- Create new PostgreSQL database on Railway
- Run Prisma migrations
- Seed initial data
- **Pros**: Clean start, no migration conflicts
- **Cons**: No existing data transferred

### Option 2: Migrate Existing Data
- Create new Railway PostgreSQL database
- Export local database
- Import to Railway database
- Run any pending migrations
- **Pros**: Preserves all existing data
- **Cons**: Requires careful data transfer

---

## 🚀 Step-by-Step Migration

### Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or with Homebrew
brew install railway

# Login to Railway
railway login
```

### Step 2: Create Railway Project

```bash
# Navigate to project directory
cd "/Users/abhi/Desktop/BISMAN ERP"

# Initialize Railway project
railway init

# Link to your GitHub repository
railway link
```

### Step 3: Add PostgreSQL Database

#### Via Railway Dashboard (Recommended)

1. Go to https://railway.app/dashboard
2. Select your project
3. Click "+ New" → "Database" → "PostgreSQL"
4. Railway will automatically provision the database
5. Database credentials are auto-injected as environment variables

#### Via Railway CLI

```bash
# Add PostgreSQL plugin
railway add postgresql

# Get database URL
railway variables
```

### Step 4: Export Local Database

```bash
# Create backup directory
mkdir -p backups

# Export schema and data
pg_dump $DATABASE_URL > backups/bisman_backup_$(date +%Y%m%d_%H%M%S).sql

# Or export only schema
pg_dump --schema-only $DATABASE_URL > backups/bisman_schema.sql

# Or export only data
pg_dump --data-only $DATABASE_URL > backups/bisman_data.sql
```

### Step 5: Get Railway Database Credentials

```bash
# Get Railway database URL
railway variables get DATABASE_URL

# Or view all variables
railway variables
```

Example Railway database URL format:
```
postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway
```

### Step 6: Import Database to Railway

#### Method A: Using Railway CLI

```bash
# Connect to Railway environment
railway run bash

# Import database (inside Railway shell)
psql $DATABASE_URL < backups/bisman_backup_TIMESTAMP.sql
```

#### Method B: Using psql Directly

```bash
# Set Railway database URL
export RAILWAY_DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway"

# Import database
psql $RAILWAY_DATABASE_URL < backups/bisman_backup_TIMESTAMP.sql
```

#### Method C: Using Prisma Migrations (Fresh Start)

```bash
# Set Railway database URL in environment
export DATABASE_URL="<RAILWAY_DATABASE_URL>"

# Navigate to backend
cd my-backend

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
node seed-enterprise-admin.js
node seed-demo-data.js
```

### Step 7: Verify Migration

```bash
# Connect to Railway database
railway run psql $DATABASE_URL

# Check tables
\dt

# Check user count
SELECT COUNT(*) FROM users;

# Check roles
SELECT * FROM roles;

# Check modules
SELECT * FROM modules;

# Exit psql
\q
```

### Step 8: Update Environment Variables

#### Backend Environment Variables

```bash
# Set in Railway dashboard or CLI
railway variables set DATABASE_URL="<RAILWAY_DATABASE_URL>"
railway variables set JWT_SECRET="<your-production-jwt-secret>"
railway variables set ENTERPRISE_JWT_SECRET="<enterprise-secret>"
railway variables set CLIENT_JWT_SECRET="<client-secret>"
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set FRONTEND_URL="https://your-frontend.railway.app"
```

#### Frontend Environment Variables

```bash
railway variables set NEXT_PUBLIC_API_URL="https://your-backend.railway.app"
```

### Step 9: Deploy Application

```bash
# Deploy backend
cd my-backend
railway up

# Deploy frontend (in separate Railway service)
cd ../my-frontend
railway up
```

---

## 🔧 Automated Migration Script

Create this script as `migrate-db-to-railway.sh`:

```bash
#!/bin/bash

# BISMAN ERP - Railway Database Migration Script
# Run this script to migrate your local database to Railway

set -e

echo "🚂 BISMAN ERP - Railway Database Migration"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"
echo ""

# Step 1: Login check
echo -e "${BLUE}Step 1: Checking Railway authentication...${NC}"
railway whoami || railway login
echo ""

# Step 2: Create backup
echo -e "${BLUE}Step 2: Creating local database backup...${NC}"
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bisman_backup_$TIMESTAMP.sql"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Please set it first:${NC}"
    echo "export DATABASE_URL='postgresql://user:pass@localhost:5432/BISMAN'"
    exit 1
fi

pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "   Size: $BACKUP_SIZE"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi
echo ""

# Step 3: Get Railway database URL
echo -e "${BLUE}Step 3: Getting Railway database URL...${NC}"
RAILWAY_DB_URL=$(railway variables get DATABASE_URL 2>/dev/null)

if [ -z "$RAILWAY_DB_URL" ]; then
    echo -e "${YELLOW}⚠️  Railway database not found. Creating one...${NC}"
    railway add postgresql
    sleep 5
    RAILWAY_DB_URL=$(railway variables get DATABASE_URL)
fi

echo -e "${GREEN}✅ Railway database ready${NC}"
echo ""

# Step 4: Import to Railway
echo -e "${BLUE}Step 4: Importing database to Railway...${NC}"
echo -e "${YELLOW}This may take a few minutes depending on database size...${NC}"

railway run bash -c "psql \$DATABASE_URL < $BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database imported successfully!${NC}"
else
    echo -e "${RED}❌ Import failed! Trying alternative method...${NC}"
    
    # Try direct connection
    psql "$RAILWAY_DB_URL" < $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database imported successfully (alternative method)!${NC}"
    else
        echo -e "${RED}❌ Import failed!${NC}"
        exit 1
    fi
fi
echo ""

# Step 5: Verify migration
echo -e "${BLUE}Step 5: Verifying migration...${NC}"
railway run bash -c "psql \$DATABASE_URL -c 'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = '\''public'\'';'"
railway run bash -c "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM users;' 2>/dev/null || echo 'Users table verification skipped'"
echo ""

# Step 6: Run Prisma migrations (if needed)
echo -e "${BLUE}Step 6: Running Prisma migrations...${NC}"
cd my-backend
railway run npx prisma migrate deploy
echo ""

# Step 7: Summary
echo -e "${GREEN}=========================================="
echo "✅ Migration Complete!"
echo "==========================================${NC}"
echo ""
echo "📊 Summary:"
echo "  - Local backup: $BACKUP_FILE ($BACKUP_SIZE)"
echo "  - Railway database: Connected"
echo "  - Prisma migrations: Applied"
echo ""
echo "🎯 Next Steps:"
echo "  1. Verify data in Railway dashboard"
echo "  2. Update environment variables"
echo "  3. Deploy your application"
echo "  4. Test database connection"
echo ""
echo "📝 Commands:"
echo "  railway run psql \$DATABASE_URL  # Connect to Railway DB"
echo "  railway logs                     # View deployment logs"
echo "  railway status                   # Check service status"
echo ""
```

Save and make executable:

```bash
chmod +x migrate-db-to-railway.sh
./migrate-db-to-railway.sh
```

---

## 🔍 Troubleshooting

### Issue: Connection Timeout

```bash
# Check Railway service status
railway status

# Check database logs
railway logs --service postgresql

# Test connection
railway run psql $DATABASE_URL -c "SELECT version();"
```

### Issue: Migration Failed

```bash
# Drop all tables and retry
railway run psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run fresh migrations
cd my-backend
railway run npx prisma migrate deploy
```

### Issue: Environment Variables Not Set

```bash
# View all variables
railway variables

# Set missing variables
railway variables set KEY="VALUE"

# Delete variable
railway variables delete KEY
```

### Issue: Database Connection Limit Exceeded

Railway PostgreSQL limits:
- **Starter Plan**: 100 connections
- **Developer Plan**: 500 connections
- **Pro Plan**: 1000 connections

Solution:
```bash
# Reduce connection pool size in Prisma
# Edit prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 20
}
```

---

## 📊 Post-Migration Verification

### 1. Check Tables

```bash
railway run psql $DATABASE_URL -c "\dt"
```

Expected tables:
- `users`
- `roles`
- `permissions`
- `modules`
- `super_admins`
- `enterprise_admins`
- `clients`
- `audit_logs`
- etc.

### 2. Check Data Integrity

```bash
# User count
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Roles
railway run psql $DATABASE_URL -c "SELECT * FROM roles;"

# Modules
railway run psql $DATABASE_URL -c "SELECT id, name FROM modules;"
```

### 3. Test Authentication

```bash
# Test login endpoint
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enterprise@bisman.erp","password":"enterprise123"}'
```

### 4. Check Prisma Studio

```bash
# Open Prisma Studio connected to Railway DB
cd my-backend
railway run npx prisma studio
```

---

## 🔐 Security Best Practices

### 1. Rotate Database Credentials

After migration, consider rotating database passwords:

```bash
# In Railway dashboard:
# 1. Go to PostgreSQL service
# 2. Click "Settings"
# 3. Click "Regenerate Credentials"
# 4. Update DATABASE_URL in all services
```

### 2. Enable SSL

Railway PostgreSQL uses SSL by default. Verify:

```bash
railway run psql $DATABASE_URL -c "SHOW ssl;"
```

### 3. Backup Strategy

Set up automated backups:

```bash
# Create backup script
cat > railway-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="railway-backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
railway run pg_dump \$DATABASE_URL > "$BACKUP_DIR/railway_backup_$TIMESTAMP.sql"
echo "Backup created: $BACKUP_DIR/railway_backup_$TIMESTAMP.sql"
EOF

chmod +x railway-backup.sh

# Run daily with cron
# crontab -e
# 0 2 * * * /path/to/railway-backup.sh
```

---

## 📈 Performance Optimization

### 1. Connection Pooling

Use PgBouncer or Prisma connection pooling:

```typescript
// In your database configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
  connection_limit: 20,
  pool_timeout: 30,
});
```

### 2. Indices

Ensure critical indices are created:

```sql
-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### 3. Query Optimization

Monitor slow queries:

```bash
railway run psql $DATABASE_URL -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
"
```

---

## ✅ Migration Completion Checklist

After successful migration:

- [ ] Database imported to Railway
- [ ] All tables verified
- [ ] Data integrity checked
- [ ] Prisma migrations applied
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Authentication tested
- [ ] API endpoints working
- [ ] Frontend connected
- [ ] Backup script configured
- [ ] Documentation updated

---

## 🎉 Success!

Your BISMAN ERP database is now running on Railway! 🚂

### Quick Commands Reference

```bash
# Connect to Railway DB
railway run psql $DATABASE_URL

# View logs
railway logs

# Check status
railway status

# Open dashboard
railway open

# Create backup
railway run pg_dump \$DATABASE_URL > backup.sql

# Run migrations
railway run npx prisma migrate deploy

# Open Prisma Studio
railway run npx prisma studio
```

---

**Generated**: October 26, 2025  
**Railway Migration Guide**: BISMAN ERP  
**Status**: Ready for Migration 🚀
