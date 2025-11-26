# BISMAN ERP - Database Schema (User Tables)

**Generated**: November 26, 2025
**Database**: BISMAN (PostgreSQL)
**Total Tables**: 47

---

## 📊 User-Related Tables Overview

### Core User Tables

#### 1. **users** (4 rows)
**Primary table for all system users**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NOT NULL | - | Primary key |
| username | varchar(100) | NOT NULL | - | Unique username |
| email | varchar(150) | NOT NULL | - | Unique email address |
| password | varchar(255) | NOT NULL | - | Bcrypt hashed password |
| role | varchar(50) | NULL | - | User role (SUPER_ADMIN, ADMIN, etc.) |
| is_active | boolean | NOT NULL | true | Account active status |
| productType | varchar(50) | NULL | 'BUSINESS_ERP' | Product type identifier |
| tenant_id | uuid | NULL | - | Multi-tenant client ID (FK → clients) |
| super_admin_id | integer | NULL | - | Assigned super admin (FK → super_admins) |
| created_at | timestamp | NULL | CURRENT_TIMESTAMP | Account creation date |
| profile_pic_url | text | NULL | - | Profile picture URL |
| updated_at | timestamp | NULL | CURRENT_TIMESTAMP | Last update timestamp |
| assignedModules | jsonb | NULL | - | JSON array of assigned modules |
| pagePermissions | jsonb | NULL | - | JSON object of page permissions |

**Indexes**:
- `users_pkey` (PRIMARY KEY on id)
- `users_email_key` (UNIQUE on email)
- `idx_users_active` (on is_active)
- `idx_users_product_type` (on productType)
- `idx_users_super_admin` (on super_admin_id)
- `idx_users_tenant` (on tenant_id)

**Current Users**:
- enterprise_admin (ENTERPRISE_ADMIN)
- rajesh_kumar (SUPER_ADMIN)
- business_superadmin (SUPER_ADMIN)
- pump_superadmin (SUPER_ADMIN)

---

#### 2. **super_admins** (2 rows)
**Super administrator accounts with elevated privileges**

Stores super admin specific data referenced by `users.super_admin_id`

---

#### 3. **enterprise_admins** (1 row)
**Enterprise-level administrator accounts**

Stores enterprise admin specific data for multi-tenant management

---

### Authentication & Authorization Tables

#### 4. **login_attempts** (0 rows)
**Tracks failed login attempts for security**

Monitors and rate-limits login attempts to prevent brute force attacks

---

#### 5. **roles** (0 rows)
**Role definitions table**

Defines custom roles beyond the default role column in users table

---

#### 6. **permissions** (340 rows)
**Permission definitions**

Defines granular permissions that can be assigned to users/roles

---

### RBAC (Role-Based Access Control) Tables

#### 7. **rbac_roles** (24 rows)
**RBAC role definitions**

Advanced role definitions for fine-grained access control

---

#### 8. **rbac_permissions** (601 rows)
**RBAC permission definitions**

Granular permissions mapped to routes, actions, and resources

---

#### 9. **rbac_user_roles** 
**User-to-role mappings**

Junction table linking users to RBAC roles (many-to-many)

---

#### 10. **rbac_user_permissions**
**Direct user permission assignments**

Allows overriding role permissions for specific users

---

#### 11. **rbac_actions**
**RBAC action definitions**

Defines actions like CREATE, READ, UPDATE, DELETE

---

#### 12. **rbac_routes**
**RBAC route definitions**

Maps API routes to required permissions

---

### Audit & Activity Tables

#### 13. **audit_logs** (0 rows)
**System audit trail**

Tracks all user actions, changes, and system events

Referenced by users table - logs user activities

---

#### 14. **recent_activity**
**Recent user activity tracking**

Stores recent actions for quick access/dashboard display

---

### Module & Page Access Tables

#### 15. **modules**
**System module definitions**

Defines available modules (Finance, HR, Operations, etc.)

---

#### 16. **module_assignments**
**User module assignments**

Links users to their assigned modules

---

#### 17. **actions**
**Action definitions**

Defines specific actions users can perform

---

#### 18. **routes**
**Route definitions**

Maps frontend routes to required permissions

---

### Multi-Tenant Tables

#### 19. **clients**
**Tenant/client organizations**

Stores tenant data for multi-tenant architecture
Referenced by `users.tenant_id`

---

## 📋 User-Related Foreign Key Relationships

### Tables that Reference `users` Table

The `users` table is referenced by 21+ tables across the system:

#### Task Management
- `tasks` → creator_id, assignee_id, approver_id, approved_by
- `task_participants` → user_id, added_by
- `task_history` → user_id
- `task_messages` → sender_id
- `task_attachments` → uploaded_by
- `task_templates` → created_by
- `task_dependencies` → (indirect)

#### Payment System
- `payment_requests` → createdById
- `payment_records` → paidById
- `payment_activity_logs` → userId

#### Approval System
- `approvals` → approverId
- `approver_configurations` → userId
- `approver_selection_logs` → selectedApproverId

#### Expense Management
- `expenses` → createdById

#### Chat/Communication
- `chat_conversations` → user_id
- `chat_messages` → user_id
- `chat_user_preferences` → user_id
- `chat_user_corrections` → user_id
- `chat_feedback` → user_id
- `chat_training_data` → created_by

#### Messaging
- `messages` → senderId

---

## 🔍 Key Database Features

### 1. Multi-Tenancy Support
- Each user can be linked to a `tenant_id` (client organization)
- Enables isolated data per organization
- Cascade delete ensures data cleanup

### 2. Role Hierarchy
- Basic roles stored in `users.role` column
- Advanced RBAC system with separate tables
- Supports custom roles and permissions

### 3. Module-Based Access Control
- Users assigned specific modules via `assignedModules` JSONB
- Page-level permissions via `pagePermissions` JSONB
- Flexible and easily extensible

### 4. Audit Trail
- All user actions logged in `audit_logs`
- Recent activity tracked separately
- Login attempts monitored

### 5. Product Types
- Supports multiple product lines (BUSINESS_ERP, PETROL_PUMP_ERP, LOGISTICS_ERP)
- Different features per product type

---

## 📈 Current Database Stats

| Table | Rows | Status |
|-------|------|--------|
| users | 4 | ✅ Active (production users only) |
| super_admins | 2 | ✅ Active |
| enterprise_admins | 1 | ✅ Active |
| rbac_roles | 24 | ✅ Configured |
| rbac_permissions | 601 | ✅ Configured |
| permissions | 340 | ✅ Configured |
| login_attempts | 0 | ✅ Clean |
| audit_logs | 0 | ⚠️ No logs yet |
| roles | 0 | ⚠️ Unused |

---

## 🔐 User Roles Available

Based on the RBAC system, the following roles are defined:

### Business ERP Roles
- SUPER_ADMIN
- ENTERPRISE_ADMIN
- ADMIN
- IT_ADMIN
- CFO
- FINANCE_CONTROLLER
- TREASURY
- ACCOUNTS
- ACCOUNTS_PAYABLE
- ACCOUNTS_RECEIVABLE
- BANKER
- PROCUREMENT_OFFICER
- PROCUREMENT_HEAD
- PROCUREMENT_MANAGER
- SUPPLIER_MANAGER
- OPERATIONS_MANAGER
- WAREHOUSE_MANAGER
- LOGISTICS_MANAGER
- INVENTORY_CONTROLLER
- HUB_INCHARGE
- STORE_INCHARGE
- COMPLIANCE
- COMPLIANCE_OFFICER
- LEGAL
- LEGAL_HEAD
- RISK_MANAGER
- HR
- HR_MANAGER
- STAFF
- MANAGER

---

## 🛠️ Database Queries

### Get all users with details
```sql
SELECT 
    id,
    username,
    email,
    role,
    is_active,
    productType,
    created_at,
    assignedModules,
    pagePermissions
FROM users
ORDER BY created_at DESC;
```

### Get users with their tenant info
```sql
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    c.name as client_name,
    c.id as tenant_id
FROM users u
LEFT JOIN clients c ON u.tenant_id = c.id
ORDER BY u.id;
```

### Get user permissions
```sql
SELECT 
    u.username,
    u.role,
    u.assignedModules,
    u.pagePermissions
FROM users u
WHERE u.email = 'business_superadmin@bisman.demo';
```

### Check RBAC assignments
```sql
SELECT 
    u.username,
    r.name as role_name,
    r.description
FROM users u
JOIN rbac_user_roles ur ON u.id = ur.user_id
JOIN rbac_roles r ON ur.role_id = r.id
WHERE u.id = 7;
```

---

## 📝 Notes

1. **Demo Users Removed**: All test/demo users have been removed (16 users deleted on 2025-11-26)
2. **Production Users**: 4 active production users remain
3. **RBAC System**: Fully configured with 24 roles and 601 permissions
4. **Multi-Tenant Ready**: Schema supports multi-tenant architecture
5. **Audit Ready**: Audit logging infrastructure in place but not yet populated

---

**Last Updated**: November 26, 2025
**Database Version**: PostgreSQL (via Prisma)
**Schema Status**: ✅ Production Ready
