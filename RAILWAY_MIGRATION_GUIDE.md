# Railway Database Migration Guide

**Date:** October 24, 2025  
**Migrations:** 003 (Bank Accounts) & 004 (Payment Module)  
**Status:** Ready to Deploy

---

## 📋 Overview

This guide helps you migrate the new database updates to Railway for the BISMAN ERP application.

### New Migrations:
1. **003_bank_accounts.sql** - Bank account management system
2. **004_payment_module.sql** - Payment requests and non-privileged users

---

## 🎯 Quick Start

### Option 1: Using Migration Script (Recommended)

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
./migrate-to-railway.sh
```

The script will:
- ✅ Check Railway CLI installation
- ✅ Offer backup before migration
- ✅ Apply migrations safely
- ✅ Verify table creation
- ✅ Provide detailed feedback

### Option 2: Manual Railway CLI

```bash
# 1. Make sure you're linked to Railway project
railway link

# 2. Create backup (optional but recommended)
railway run psql -c "\dt" > backup_tables_before_migration.txt

# 3. Apply migrations
railway run psql < database/migrations/003_bank_accounts.sql
railway run psql < database/migrations/004_payment_module.sql

# 4. Verify
railway run psql -c "\dt bank_accounts"
railway run psql -c "\dt non_privileged_users"
```

### Option 3: Direct Database URL

```bash
# 1. Get your Railway DATABASE_URL
railway variables get DATABASE_URL

# 2. Apply migrations
psql "your-database-url-here" < database/migrations/003_bank_accounts.sql
psql "your-database-url-here" < database/migrations/004_payment_module.sql
```

---

## 🗄️ Migration Details

### Migration 003: Bank Accounts

**Creates:**
- `bank_accounts` table
- ENUM types: `account_type`, `account_status`
- Indexes for performance
- Constraints for data integrity

**Features:**
- User bank account details
- Multiple routing codes (IFSC, SWIFT, IBAN, BSB, etc.)
- Account verification system
- Primary account designation
- Document upload support
- Audit trail

**Tables Created:**
```sql
bank_accounts (
    id UUID,
    user_id UUID,
    account_holder_name VARCHAR(255),
    account_number VARCHAR(50),
    account_type ENUM,
    bank_name VARCHAR(255),
    branch_name VARCHAR(255),
    ifsc_code VARCHAR(20),
    swift_code VARCHAR(20),
    iban VARCHAR(50),
    routing_number VARCHAR(20),
    sort_code VARCHAR(10),
    bsb_number VARCHAR(10),
    branch_address TEXT,
    currency VARCHAR(3),
    is_primary BOOLEAN,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    status ENUM,
    verified_by UUID,
    verified_at TIMESTAMP,
    verification_notes TEXT,
    documents JSONB,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
)
```

---

### Migration 004: Payment Module

**Creates:**
- `non_privileged_users` table
- `payment_requests` table
- `payment_approvals` table
- Multiple ENUM types
- Auto-generated payment references
- Trigger for payment reference generation

**Features:**
- Non-privileged user management (vendors, building owners, creditors)
- Payment request system
- Two-level approval workflow (Manager → Admin)
- Recurring payment support
- Multiple payment modes
- Complete audit trail
- Document management

**Tables Created:**

1. **non_privileged_users**
```sql
non_privileged_users (
    id UUID,
    full_name VARCHAR(255),
    business_name VARCHAR(255),
    role_type ENUM('vendor', 'building_owner', 'creditor'),
    gst_type ENUM('with_gst', 'without_gst'),
    service_type ENUM('rent', 'maintenance', 'transport', 'consultancy', 'others'),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_number VARCHAR(20),
    email VARCHAR(255),
    bank_holder_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    upi_id VARCHAR(100),
    pan_number VARCHAR(10),
    gst_number VARCHAR(15),
    remarks TEXT,
    is_recurring BOOLEAN,
    recurring_start_date DATE,
    recurring_end_date DATE,
    recurring_amount DECIMAL(15,2),
    recurring_frequency VARCHAR(50),
    uploaded_files JSONB,
    hub_manager_id UUID,
    status ENUM,
    manager_remarks TEXT,
    manager_approved_by UUID,
    manager_approved_at TIMESTAMP,
    admin_remarks TEXT,
    admin_approved_by UUID,
    admin_approved_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
)
```

2. **payment_requests**
```sql
payment_requests (
    id UUID,
    payment_ref VARCHAR(50) UNIQUE, -- Auto-generated: PR-YYYY-MM-XXXXX
    non_privileged_user_id UUID,
    requested_by UUID,
    amount DECIMAL(15,2),
    payment_mode ENUM,
    payment_date DATE,
    description TEXT,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    invoice_amount DECIMAL(15,2),
    invoice_file JSONB,
    purpose TEXT,
    category VARCHAR(100),
    priority VARCHAR(20),
    status ENUM,
    manager_status VARCHAR(20),
    manager_approved_by UUID,
    manager_approved_at TIMESTAMP,
    manager_remarks TEXT,
    admin_status VARCHAR(20),
    admin_approved_by UUID,
    admin_approved_at TIMESTAMP,
    admin_remarks TEXT,
    payment_transaction_id VARCHAR(100),
    payment_completed_at TIMESTAMP,
    payment_proof JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
)
```

3. **payment_approvals**
```sql
payment_approvals (
    id UUID,
    payment_request_id UUID,
    approved_by UUID,
    approval_level VARCHAR(20),
    status VARCHAR(20),
    remarks TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP
)
```

---

## ⚙️ Prerequisites

### 1. Railway CLI Installation

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link
```

### 2. PostgreSQL Client (for manual method)

```bash
# macOS
brew install postgresql

# Verify installation
psql --version
```

### 3. Verify Railway Connection

```bash
# Test connection
railway run psql -c "SELECT version();"

# List current tables
railway run psql -c "\dt"
```

---

## 🔍 Pre-Migration Checklist

- [ ] Railway CLI installed and logged in
- [ ] Linked to correct Railway project
- [ ] Database backup created
- [ ] Verified database connection
- [ ] Reviewed migration SQL files
- [ ] Confirmed no conflicting table names
- [ ] Tested migrations locally first (recommended)

---

## 🚀 Step-by-Step Migration

### Step 1: Backup Current Database

```bash
# Using Railway CLI
railway run pg_dump > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Or using direct URL
DATABASE_URL=$(railway variables get DATABASE_URL)
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Verify Current State

```bash
# Check if tables already exist
railway run psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Check for bank_accounts
railway run psql -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_accounts');"

# Check for payment module tables
railway run psql -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'non_privileged_users');"
```

### Step 3: Apply Migration 003 (Bank Accounts)

```bash
railway run psql < database/migrations/003_bank_accounts.sql
```

**Expected Output:**
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

### Step 4: Apply Migration 004 (Payment Module)

```bash
railway run psql < database/migrations/004_payment_module.sql
```

**Expected Output:**
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
... (multiple CREATE TYPE statements)
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE FUNCTION
CREATE TRIGGER
CREATE INDEX
... (multiple CREATE INDEX statements)
```

### Step 5: Verify Tables Created

```bash
# List all tables
railway run psql -c "\dt"

# Describe bank_accounts table
railway run psql -c "\d bank_accounts"

# Describe non_privileged_users table
railway run psql -c "\d non_privileged_users"

# Check row counts (should be 0)
railway run psql -c "SELECT COUNT(*) FROM bank_accounts;"
railway run psql -c "SELECT COUNT(*) FROM non_privileged_users;"
railway run psql -c "SELECT COUNT(*) FROM payment_requests;"
```

### Step 6: Test Basic Operations

```bash
# Test bank accounts insertion
railway run psql -c "
INSERT INTO bank_accounts (
    user_id, 
    account_holder_name, 
    account_number, 
    bank_name, 
    account_type, 
    currency
) VALUES (
    (SELECT id FROM users LIMIT 1),
    'Test User',
    '1234567890',
    'Test Bank',
    'savings',
    'INR'
) RETURNING id;
"

# Verify
railway run psql -c "SELECT * FROM bank_accounts LIMIT 1;"

# Clean up test data
railway run psql -c "DELETE FROM bank_accounts WHERE account_holder_name = 'Test User';"
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All tables created successfully
- [ ] ENUM types created
- [ ] Indexes created
- [ ] Triggers created (payment_ref generation)
- [ ] Foreign key constraints working
- [ ] Can insert test data
- [ ] Can query data
- [ ] Application can connect
- [ ] No errors in Railway logs

---

## 🔧 Troubleshooting

### Issue: "relation already exists"

**Solution:**
```bash
# Check if table exists
railway run psql -c "\dt bank_accounts"

# If you need to drop and recreate
railway run psql -c "DROP TABLE IF EXISTS bank_accounts CASCADE;"
railway run psql < database/migrations/003_bank_accounts.sql
```

### Issue: "type already exists"

**Solution:**
```bash
# Check existing types
railway run psql -c "SELECT typname FROM pg_type WHERE typtype = 'e';"

# Drop type if needed (will fail if in use)
railway run psql -c "DROP TYPE IF EXISTS account_type CASCADE;"
```

### Issue: Railway CLI not connected

**Solution:**
```bash
# Relink to project
railway unlink
railway link

# Or login again
railway logout
railway login
```

### Issue: Permission denied

**Solution:**
```bash
# Make sure you're using the correct database user
railway variables get DATABASE_URL

# Check user permissions
railway run psql -c "SELECT current_user, session_user;"
```

### Issue: Connection timeout

**Solution:**
```bash
# Check Railway service status
railway status

# Restart database if needed (from Railway dashboard)

# Test connection
railway run psql -c "SELECT 1;"
```

---

## 🔄 Rollback Plan

If migration fails or causes issues:

### Rollback to Previous State

```bash
# 1. Drop new tables
railway run psql -c "DROP TABLE IF EXISTS bank_accounts CASCADE;"
railway run psql -c "DROP TABLE IF EXISTS non_privileged_users CASCADE;"
railway run psql -c "DROP TABLE IF EXISTS payment_requests CASCADE;"
railway run psql -c "DROP TABLE IF EXISTS payment_approvals CASCADE;"

# 2. Drop new types
railway run psql -c "DROP TYPE IF EXISTS account_type CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS account_status CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS user_role_type CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS gst_type CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS service_type CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS approval_status CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS payment_mode CASCADE;"
railway run psql -c "DROP TYPE IF EXISTS payment_status CASCADE;"

# 3. Restore from backup
railway run psql < backup_before_migration.sql
```

---

## 📊 Post-Migration Tasks

### 1. Update Environment Variables (if needed)

```bash
# Check current variables
railway variables

# Add any new variables if required
railway variables set ENABLE_BANK_ACCOUNTS=true
railway variables set ENABLE_PAYMENT_MODULE=true
```

### 2. Update Backend Services

Make sure your backend code is updated to:
- Use new tables
- Handle new ENUM types
- Implement bank account APIs
- Implement payment request APIs

### 3. Test Application

```bash
# Start local development with Railway DB
railway run npm run dev:both

# Test endpoints:
# - GET /api/bank-accounts
# - POST /api/bank-accounts
# - GET /api/non-privileged-users
# - POST /api/payment-requests
```

### 4. Monitor Railway Logs

```bash
# Watch logs in real-time
railway logs

# Or view in Railway dashboard
# https://railway.app/project/your-project/deployments
```

---

## 📈 Performance Optimization

After migration, consider:

### 1. Add Additional Indexes (if needed)

```sql
-- Index for frequently queried fields
CREATE INDEX idx_bank_accounts_user_primary 
ON bank_accounts(user_id, is_primary) 
WHERE is_active = true;

CREATE INDEX idx_payment_requests_status_date 
ON payment_requests(status, payment_date) 
WHERE deleted_at IS NULL;
```

### 2. Analyze Tables

```bash
railway run psql -c "ANALYZE bank_accounts;"
railway run psql -c "ANALYZE non_privileged_users;"
railway run psql -c "ANALYZE payment_requests;"
```

### 3. Monitor Query Performance

```sql
-- Enable query logging (if needed)
ALTER DATABASE your_database_name SET log_min_duration_statement = 1000;
```

---

## 📝 Migration Log Template

Keep a record of your migration:

```
Migration Date: _______________
Railway Project: _______________
Database Name: _______________
Performed By: _______________

Pre-Migration:
- [ ] Backup created: _______________
- [ ] Current tables count: _______________
- [ ] Current database size: _______________

Migration:
- [ ] Migration 003 applied at: _______________
- [ ] Migration 004 applied at: _______________
- [ ] Errors encountered: _______________

Post-Migration:
- [ ] Tables verified: _______________
- [ ] Test data inserted: _______________
- [ ] Application tested: _______________
- [ ] Production tested: _______________

Issues/Notes:
_______________________________________________
_______________________________________________
```

---

## 🔗 Useful Commands Reference

```bash
# Connection & Status
railway login
railway link
railway status
railway logs

# Database Operations
railway run psql                          # Open psql console
railway run psql -c "COMMAND"             # Run single command
railway run psql < file.sql               # Run SQL file
railway variables get DATABASE_URL        # Get connection string

# Backup & Restore
railway run pg_dump > backup.sql          # Backup
railway run psql < backup.sql             # Restore

# Table Management
railway run psql -c "\dt"                 # List tables
railway run psql -c "\d table_name"       # Describe table
railway run psql -c "\du"                 # List users
railway run psql -c "\l"                  # List databases

# Query Data
railway run psql -c "SELECT * FROM table_name;"
railway run psql -c "SELECT COUNT(*) FROM table_name;"
```

---

## 📞 Support

### Railway Support:
- Dashboard: https://railway.app
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

### Project Support:
- Check logs: `railway logs`
- Review migrations: `database/migrations/`
- Documentation: See project README files

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ All tables created without errors
2. ✅ All indexes created
3. ✅ All constraints active
4. ✅ Triggers working (payment_ref generation)
5. ✅ Can insert test data
6. ✅ Application connects successfully
7. ✅ No errors in logs
8. ✅ Queries perform well

---

**Migration Prepared:** October 24, 2025  
**Ready to Deploy:** ✅ Yes  
**Estimated Time:** 5-10 minutes  
**Risk Level:** 🟢 Low (new tables only)  

**Good luck with your migration! 🚀**
