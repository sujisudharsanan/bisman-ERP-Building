# BISMAN ERP - Complete Database Schema

**Date**: November 26, 2025
**Total Tables**: 47

---

## 📊 All Database Tables (Categorized)

### 1. User & Authentication (9 tables)
- `users` - Main user accounts (4 rows)
- `super_admins` - Super administrator data (2 rows)
- `enterprise_admins` - Enterprise admin data (1 row)
- `login_attempts` - Login security tracking (0 rows)
- `roles` - Role definitions (0 rows)
- `permissions` - Permission definitions (340 rows)
- `rbac_roles` - RBAC role definitions (24 rows)
- `rbac_permissions` - RBAC permissions (601 rows)
- `rbac_user_roles` - User-role mappings
- `rbac_user_permissions` - User-specific permissions
- `rbac_actions` - RBAC action definitions
- `rbac_routes` - RBAC route mappings

### 2. Task Management (8 tables)
- `tasks` - Main tasks table
- `task_participants` - Task participants/collaborators
- `task_history` - Task change history
- `task_messages` - Task comments/discussion
- `task_attachments` - Task file attachments
- `task_templates` - Reusable task templates
- `task_dependencies` - Task dependency mapping
- `legacy_tasks_backup_20251125` - Backup of old tasks

### 3. Payment System (5 tables)
- `payment_requests` - Payment request submissions
- `payment_records` - Completed payment records
- `payment_request_line_items` - Payment line items
- `payment_activity_logs` - Payment activity tracking
- `expenses` - Expense management

### 4. Approval Workflow (4 tables)
- `approvals` - Approval records
- `approver_configurations` - Approver setup
- `approver_selection_logs` - Approver selection audit
- `approval_levels` - Multi-level approval definitions

### 5. Chat/AI System (7 tables)
- `chat_conversations` - Chat conversation history
- `chat_messages` - Individual chat messages
- `chat_user_preferences` - User chat preferences
- `chat_user_corrections` - User corrections for AI learning
- `chat_feedback` - Chat feedback from users
- `chat_training_data` - AI training dataset
- `chat_common_mistakes` - Common error tracking

### 6. Multi-Tenant Management (2 tables)
- `clients` - Tenant/client organizations
- `modules` - Available system modules
- `module_assignments` - Module-to-user assignments

### 7. Audit & Logging (4 tables)
- `audit_logs` - Complete audit trail (0 rows)
- `error_logs` - System error logging
- `recent_activity` - Recent user activity
- `migration_history` - Database migration tracking

### 8. Access Control (3 tables)
- `actions` - Action definitions
- `routes` - Route/page definitions
- `messages` - Inter-user messaging

### 9. System Tables (2 tables)
- `_prisma_migrations` - Prisma migration tracking

---

## 🎯 Quick Table Reference

### Most Important Tables
1. **users** - All system users (4 active)
2. **rbac_permissions** - Access control (601 permissions)
3. **permissions** - Legacy permissions (340 entries)
4. **tasks** - Task management
5. **payment_requests** - Payment workflow
6. **chat_messages** - AI chat system

### Tables with FK to users
21+ tables reference the `users` table, including:
- All task tables
- All payment tables
- All approval tables
- All chat tables
- Expense tracking
- Message system

---

## 📈 Database Statistics

| Category | Tables | Status |
|----------|--------|--------|
| User & Auth | 12 | ✅ Configured |
| Task Management | 8 | ✅ Active |
| Payment System | 5 | ✅ Active |
| Approval Workflow | 4 | ✅ Active |
| Chat/AI System | 7 | ✅ Active |
| Multi-Tenant | 3 | ✅ Ready |
| Audit & Logging | 4 | ⚠️ Minimal data |
| Access Control | 3 | ✅ Configured |
| System | 1 | ✅ Active |

**Total**: 47 tables

---

## 🔍 Query to List All Tables

```sql
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 📝 Key Insights

1. **Well-Structured**: Clear separation of concerns
2. **Scalable**: Multi-tenant ready with proper foreign keys
3. **Audit-Ready**: Comprehensive logging infrastructure
4. **RBAC Enabled**: 601 permissions across 24 roles
5. **Feature-Rich**: Supports tasks, payments, approvals, chat, and more

---

**For detailed user table schema, see**: `DATABASE_SCHEMA_USERS.md`
