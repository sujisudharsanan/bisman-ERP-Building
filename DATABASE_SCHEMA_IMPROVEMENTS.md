# Improved Multi-Tenant Database Schema for Bisman ERP

**Created**: November 26, 2025  
**Database**: PostgreSQL  
**ORM**: Prisma

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Key Improvements](#key-improvements)
3. [Schema Design](#schema-design)
4. [Tables Reference](#tables-reference)
5. [Enums](#enums)
6. [Migration Guide](#migration-guide)
7. [Usage Examples](#usage-examples)

---

## 🎯 Overview

This improved schema addresses the original requirements with:
- ✅ **Security fields** added to users table
- ✅ **Normalized permissions** (no more JSON columns)
- ✅ **Separated profile data** from authentication data
- ✅ **Multi-address support** per user
- ✅ **Complete audit trail** for login and password changes
- ✅ **Soft delete** support across all entities
- ✅ **Multi-tenant** architecture maintained

---

## 🚀 Key Improvements

### 1. Enhanced Users Table
**Added Security & Lifecycle Fields:**
- `password_changed_at` → Track password changes for token invalidation
- `last_login_at` → Track last successful login
- `deleted_at` → Soft delete support (NULL = active, timestamp = deleted)

### 2. Normalized Permissions (Removed JSON)

**Before:**
```sql
assignedModules JSONB → ['inventory', 'billing', 'reports']
pagePermissions JSONB → {'/tasks': {view: true, create: false}}
```

**After:**
```sql
-- Modules in separate table
user_modules table:
- user_id, module_key, is_enabled

-- Page permissions in separate table  
user_page_permissions table:
- user_id, page_key, can_view, can_create, can_update, can_delete, can_export, can_approve
```

**Benefits:**
- ✅ Queryable with SQL (no JSON parsing)
- ✅ Enforceable foreign key constraints
- ✅ Better indexes and performance
- ✅ Easier to audit and report

### 3. Separated Profile Data

**Before:** All in `users` table

**After:**
- `users` → Authentication & authorization only
- `user_profiles` → Extended profile information
- `user_addresses` → Multiple addresses per user

**Benefits:**
- ✅ Cleaner separation of concerns
- ✅ Smaller users table for faster auth queries
- ✅ Multiple addresses support (home, office, billing, shipping)
- ✅ Easier to extend profile fields

---

## 📊 Schema Design

### Database Diagram

```
┌─────────────┐
│   clients   │ (Multi-tenant)
└──────┬──────┘
       │
       │ tenant_id
       ▼
┌─────────────┐         ┌──────────────────┐
│    users    │────────▶│  user_profiles   │
└──────┬──────┘         └──────────────────┘
       │                         
       ├────────────────┬────────────────┬────────────────┐
       ▼                ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ user_modules │ │ user_page_   │ │ user_        │ │ login_       │
│              │ │ permissions  │ │ addresses    │ │ history      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 📚 Tables Reference

### Core Tables

#### 1. `clients` (Tenants)
Multi-tenant support - each client is a separate organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Client/company name |
| slug | VARCHAR(100) | URL-safe unique identifier |
| domain | VARCHAR(255) | Optional custom domain |
| is_active | BOOLEAN | Active status |
| subscription_tier | VARCHAR(50) | Subscription plan |
| subscription_expires_at | TIMESTAMP | Subscription expiry |
| deleted_at | TIMESTAMP | Soft delete |

#### 2. `users` (Enhanced)
Core authentication and authorization.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| username | VARCHAR(100) | Username |
| email | VARCHAR(150) | **Unique** email |
| password | VARCHAR(255) | Bcrypt hashed |
| **password_changed_at** | **TIMESTAMP** | **🆕 Last password change** |
| **last_login_at** | **TIMESTAMP** | **🆕 Last successful login** |
| role | ENUM | User role (see enums) |
| is_active | BOOLEAN | Active status |
| **deleted_at** | **TIMESTAMP** | **🆕 Soft delete** |
| tenant_id | UUID | FK → clients |
| product_type | ENUM | Product type |
| super_admin_id | INT | FK → super_admins |

**Unique Constraints:**
- `email` must be globally unique
- `(username, tenant_id)` must be unique per tenant

#### 3. `user_profiles` (New)
Extended profile information separate from auth data.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users (unique) |
| full_name | VARCHAR(255) | Full name |
| phone | VARCHAR(20) | Phone number |
| phone_verified | BOOLEAN | Phone verification |
| date_of_birth | DATE | Birth date |
| gender | ENUM | Gender type |
| profile_pic_url | TEXT | Profile picture |
| cover_pic_url | TEXT | Cover photo |
| bio | TEXT | Biography |
| department | VARCHAR(100) | Department |
| designation | VARCHAR(100) | Job title |
| employee_id | VARCHAR(50) | Employee ID |
| emergency_contact_name | VARCHAR(255) | Emergency contact |
| emergency_contact_phone | VARCHAR(20) | Emergency phone |
| emergency_contact_relationship | VARCHAR(50) | Relationship |

#### 4. `user_addresses` (New)
Multiple addresses per user with type categorization.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users |
| address_type | ENUM | HOME, OFFICE, BILLING, SHIPPING |
| line1 | VARCHAR(255) | Address line 1 |
| line2 | VARCHAR(255) | Address line 2 (optional) |
| city | VARCHAR(100) | City |
| state | VARCHAR(100) | State/Province |
| postal_code | VARCHAR(20) | ZIP/Postal code |
| country | VARCHAR(100) | Country (default: India) |
| is_default | BOOLEAN | Default address flag |
| is_active | BOOLEAN | Active status |

---

### Permission Tables (Normalized)

#### 5. `modules` (Master)
Defines available system modules.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| module_key | VARCHAR(100) | Unique key (e.g., 'inventory') |
| module_name | VARCHAR(255) | Display name |
| description | TEXT | Module description |
| icon | VARCHAR(50) | Icon name |
| display_order | INT | Sort order |
| is_active | BOOLEAN | Active status |
| product_type | ENUM | Which product |

#### 6. `user_modules` (User Assignments)
Links users to their assigned modules.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users |
| module_key | VARCHAR(100) | FK → modules.module_key |
| is_enabled | BOOLEAN | Module enabled for user |

**Unique:** `(user_id, module_key)`

#### 7. `pages` (Master)
Defines all pages/routes in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| page_key | VARCHAR(100) | Unique key |
| route | VARCHAR(255) | URL route (e.g., '/manager/tasks') |
| page_name | VARCHAR(255) | Display name |
| description | TEXT | Page description |
| module_key | VARCHAR(100) | FK → modules |
| icon | VARCHAR(50) | Icon name |
| product_type | ENUM | Which product |

#### 8. `user_page_permissions` (Granular CRUD)
Granular permissions per user per page.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users |
| page_key | VARCHAR(100) | FK → pages.page_key |
| can_view | BOOLEAN | View permission |
| can_create | BOOLEAN | Create permission |
| can_update | BOOLEAN | Update permission |
| can_delete | BOOLEAN | Delete permission |
| can_export | BOOLEAN | Export permission |
| can_approve | BOOLEAN | Approval permission |

**Unique:** `(user_id, page_key)`

---

### Audit & Security Tables

#### 9. `login_history` (New)
Complete audit trail of all login attempts.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users (nullable) |
| email | VARCHAR(150) | Login email |
| ip_address | INET | IP address |
| user_agent | TEXT | Browser/device info |
| login_status | ENUM | SUCCESS, FAILED, BLOCKED |
| failure_reason | VARCHAR(255) | Why login failed |
| session_id | VARCHAR(255) | Session identifier |
| created_at | TIMESTAMP | Login attempt time |

#### 10. `password_history` (New)
Track password changes for security compliance.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users |
| password_hash | VARCHAR(255) | Old password hash |
| changed_by | INT | FK → users (who changed it) |
| created_at | TIMESTAMP | When changed |

**Use Case:** Prevent password reuse, compliance reporting

#### 11. `user_sessions` (New)
Active session management with tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK → users |
| session_token | VARCHAR(255) | Unique session token |
| refresh_token | VARCHAR(255) | Refresh token |
| ip_address | INET | Session IP |
| user_agent | TEXT | Device info |
| expires_at | TIMESTAMP | Expiration time |
| last_activity_at | TIMESTAMP | Last activity |
| is_active | BOOLEAN | Session active |

---

## 🔤 Enums

### UserRole
```typescript
enum UserRole {
  SUPER_ADMIN, ENTERPRISE_ADMIN, ADMIN, IT_ADMIN,
  CFO, FINANCE_CONTROLLER, TREASURY, ACCOUNTS, 
  ACCOUNTS_PAYABLE, ACCOUNTS_RECEIVABLE, BANKER,
  PROCUREMENT_OFFICER, PROCUREMENT_HEAD, PROCUREMENT_MANAGER,
  OPERATIONS_MANAGER, WAREHOUSE_MANAGER, LOGISTICS_MANAGER,
  HUB_INCHARGE, STORE_INCHARGE,
  COMPLIANCE, COMPLIANCE_OFFICER, LEGAL,
  HR, HR_MANAGER, STAFF, MANAGER, USER
}
```

### ProductType
```typescript
enum ProductType {
  BUSINESS_ERP,
  PETROL_PUMP_ERP,
  LOGISTICS_ERP,
  RETAIL_ERP
}
```

### AddressType
```typescript
enum AddressType {
  HOME, OFFICE, BILLING, SHIPPING, WAREHOUSE, OTHER
}
```

### GenderType
```typescript
enum GenderType {
  MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
}
```

### LoginStatus
```typescript
enum LoginStatus {
  SUCCESS, FAILED, BLOCKED
}
```

---

## 🔄 Migration Guide

### Step 1: Backup Existing Data
```bash
pg_dump -U postgres BISMAN > backup_before_migration_$(date +%Y%m%d).sql
```

### Step 2: Extract Current JSON Data
```sql
-- Extract modules from JSONB
CREATE TEMP TABLE temp_user_modules AS
SELECT 
    u.id as user_id,
    jsonb_array_elements_text(u."assignedModules") as module_key
FROM users u
WHERE u."assignedModules" IS NOT NULL;

-- Extract page permissions from JSONB
CREATE TEMP TABLE temp_user_permissions AS
SELECT 
    u.id as user_id,
    perm.key as page_key,
    (perm.value->>'view')::boolean as can_view,
    (perm.value->>'create')::boolean as can_create,
    (perm.value->>'update')::boolean as can_update,
    (perm.value->>'delete')::boolean as can_delete
FROM users u,
LATERAL jsonb_each(u."pagePermissions") as perm
WHERE u."pagePermissions" IS NOT NULL;
```

### Step 3: Create New Tables
```bash
# Run the improved schema SQL
psql -U postgres BISMAN < improved-database-schema.sql
```

### Step 4: Migrate Data
```sql
-- Migrate user profiles
INSERT INTO user_profiles (user_id, profile_pic_url, created_at, updated_at)
SELECT 
    id, 
    profile_pic_url,
    created_at,
    updated_at
FROM users
WHERE profile_pic_url IS NOT NULL;

-- Migrate user modules
INSERT INTO user_modules (user_id, module_key, is_enabled)
SELECT 
    user_id,
    module_key,
    true
FROM temp_user_modules;

-- Migrate page permissions
INSERT INTO user_page_permissions (
    user_id, page_key, can_view, can_create, can_update, can_delete
)
SELECT 
    user_id, page_key, 
    COALESCE(can_view, false),
    COALESCE(can_create, false),
    COALESCE(can_update, false),
    COALESCE(can_delete, false)
FROM temp_user_permissions;
```

### Step 5: Update Users Table
```sql
-- Add new columns if not using fresh install
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Drop old JSON columns after verification
-- ALTER TABLE users DROP COLUMN "assignedModules";
-- ALTER TABLE users DROP COLUMN "pagePermissions";
-- ALTER TABLE users DROP COLUMN profile_pic_url; -- moved to user_profiles
```

---

## 💻 Usage Examples

### Example 1: Create User with Profile
```typescript
const newUser = await prisma.user.create({
  data: {
    username: 'john.doe',
    email: 'john@company.com',
    password: hashedPassword,
    role: 'MANAGER',
    tenantId: 'uuid-here',
    profile: {
      create: {
        fullName: 'John Doe',
        phone: '+91-9876543210',
        department: 'Operations',
        designation: 'Operations Manager'
      }
    }
  },
  include: {
    profile: true
  }
});
```

### Example 2: Add Module Permission
```typescript
await prisma.userModule.create({
  data: {
    userId: userId,
    moduleKey: 'inventory',
    isEnabled: true
  }
});
```

### Example 3: Set Page Permissions
```typescript
await prisma.userPagePermission.create({
  data: {
    userId: userId,
    pageKey: 'tasks_list',
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canExport: true,
    canApprove: false
  }
});
```

### Example 4: Query User with All Permissions
```typescript
const userWithPermissions = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
    addresses: {
      where: { isActive: true }
    },
    modules: {
      where: { isEnabled: true },
      include: {
        module: true
      }
    },
    pagePermissions: {
      include: {
        page: true
      }
    }
  }
});
```

### Example 5: Track Login
```typescript
await prisma.loginHistory.create({
  data: {
    userId: user.id,
    email: email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    loginStatus: 'SUCCESS',
    sessionId: sessionToken
  }
});

// Update last login
await prisma.user.update({
  where: { id: user.id },
  data: { lastLoginAt: new Date() }
});
```

### Example 6: Soft Delete User
```typescript
// Soft delete (preferred)
await prisma.user.update({
  where: { id: userId },
  data: { 
    deletedAt: new Date(),
    isActive: false
  }
});

// Query only active users
const activeUsers = await prisma.user.findMany({
  where: {
    deletedAt: null,
    isActive: true
  }
});
```

### Example 7: Check Password Change for Token Invalidation
```typescript
// When validating JWT
const tokenIssuedAt = new Date(decodedToken.iat * 1000);
const user = await prisma.user.findUnique({
  where: { id: userId }
});

if (user.passwordChangedAt > tokenIssuedAt) {
  // Password changed after token was issued - invalidate token
  throw new Error('Token invalidated due to password change');
}
```

---

## 🎯 Benefits Summary

### Security Improvements
- ✅ Password change tracking for token invalidation
- ✅ Complete login audit trail
- ✅ Password history to prevent reuse
- ✅ Session management for device tracking
- ✅ Soft delete for data retention

### Performance Improvements
- ✅ No more JSON parsing in queries
- ✅ Proper indexes on permission tables
- ✅ Smaller users table (faster auth queries)
- ✅ Efficient permission checking

### Maintainability Improvements
- ✅ Normalized data (easier to query and update)
- ✅ Clear separation of concerns
- ✅ Type-safe with Prisma
- ✅ Easily extensible

### Compliance Improvements
- ✅ Audit trail for all logins
- ✅ Password history tracking
- ✅ Soft delete for GDPR compliance
- ✅ Multi-address support

---

## 📁 Files Provided

1. ✅ `improved-database-schema.sql` - PostgreSQL CREATE statements
2. ✅ `improved-prisma-schema.prisma` - Prisma schema definition
3. ✅ `DATABASE_SCHEMA_IMPROVEMENTS.md` - This documentation

---

**Status**: ✅ Ready for implementation
**Next Steps**: Review, test, and migrate existing data
