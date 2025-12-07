# Database Table Usage Report
## BISMAN ERP - Backend Reference Analysis
**Generated:** December 7, 2025

---

## Summary

| Category | Count |
|----------|-------|
| Total Tables (excluding partitions) | 89 |
| Tables with Data | 34 |
| Empty Tables | 55 |
| Actively Used in Backend | 65+ |
| Unused/Legacy Tables | ~10 |

---

## 🟢 ACTIVELY USED TABLES (High Priority - Keep)

### Core User Management
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `users` / `users_enhanced` | 17 | 400+ references | auth.js, rbacMiddleware.js, all routes |
| `user_sessions` | 149 | 32 references | auth.js, sessionCache.js |
| `user_profiles` | 10 | 31 references | users.js, profile routes |
| `user_addresses` | 20 | 27 references | user profile management |
| `user_bank_accounts` | 10 | 27 references | payment, KYC |
| `user_skills` | 30 | 27 references | HR module |
| `user_education` | 10 | 26 references | HR module |
| `user_emergency_contacts` | 10 | 26 references | HR module |
| `user_kyc` | 10 | 26 references | compliance |
| `user_achievements` | 10 | 25 references | gamification |
| `user_branches` | 0 | 29 references | branch assignment |

### RBAC System (Role-Based Access Control)
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `rbac_roles` | 19 | 41 references | rbacMiddleware.js, rbacAuth.js |
| `rbac_permissions` | 100 | 27 references | permissionCache.js, rbac routes |
| `rbac_user_roles` | 15 | 30 references | rbacMiddleware.js |
| `rbac_user_permissions` | 2 | 33 references | permission management |
| `rbac_routes` | 20 | 31 references | route protection |
| `rbac_actions` | 5 | 27 references | action definitions |
| `admin_role_assignments` | 2 | 28 references | admin management |

### Multi-Tenant / Client Management
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `clients` | 1 | 148 references | tenantContext.js, multiTenantAuth.js |
| `super_admins` | 1 | 108 references | superAdmin routes |
| `enterprise_admins` | 1 | 41 references | enterprise management |
| `modules` | 12 | 71 references | module management |
| `module_assignments` | 2 | 65 references | client module access |
| `client_module_permissions` | 0 | 26 references | permission control |
| `client_daily_usage` | 0 | 30 references | usage tracking |
| `client_usage_events` | 0 | 23 references | event logging |

### Audit & Security
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `audit_logs` | 145 | 49+ references | auditContext.js, all CRUD ops |
| `audit_logs_dml` | 3 | 23 references | DML auditing |
| `security_events` | 80 | 8 references | securityAlerting.js |
| `system_metric_samples` | 1420 | 25 references | metricsMiddleware.js |
| `system_health_config` | 1 | 30 references | health monitoring |
| `rate_limit_violations` | 0 | 22 references | rate limiting |
| `failed_login_attempts` | 0 | 4 references | brute force protection |

### Business Operations
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `tasks` | 0 | 47 references | tasks.js, workflow |
| `payment_requests` | 0 | 46 references | paymentRequests.js |
| `invoices` | 0 | 31 references | invoices.js |
| `bills` | 0 | 22 references | billing module |
| `expenses` | 0 | 22 references | expense tracking |
| `branches` | 0 | 32 references | branch management |
| `call_logs` | 0 | 31 references | CRM module |
| `events` | 0 | 27 references | calendar/events |

### Messaging & Collaboration
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `threads` | 0 | 23 references | messages.js |
| `thread_messages` | 0 | 35 references | chat system |
| `thread_members` | 0 | 29 references | chat participants |
| `messages` | 0 | 23 references | messaging |

### Approval Workflow
| Table | Rows | Backend Usage | Files Using |
|-------|------|---------------|-------------|
| `approval_levels` | 0 | 34 references | workflow engine |
| `approvals` | 0 | 23 references | approval processing |
| `approver_configurations` | 0 | 22 references | approver setup |
| `approver_selection_logs` | 0 | 22 references | audit trail |

---

## 🟡 FUTURE USE TABLES (Empty but Referenced - Keep)

These tables have 0 rows but are actively referenced in backend code for upcoming features:

| Table | Backend Refs | Purpose | Status |
|-------|--------------|---------|--------|
| `onboarding_magic_links` | 21 | Magic link auth | Ready |
| `otp_tokens` | 29 | OTP verification | Ready |
| `password_history` | 0 | Password policy | Ready |
| `payment_records` | 21 | Payment tracking | Ready |
| `payment_activity_logs` | 23 | Payment audit | Ready |
| `billing_profiles` | 42 | Subscription billing | Ready |
| `tenant_usage` | 36 | Usage metering | Ready |
| `tenant_quota_overrides` | 0 | Quota management | Ready |
| `load_test_reports` | 22 | Performance testing | Ready |
| `qa_issues` | 18 | QA tracking | Ready |
| `qa_test_tasks` | 7 | Test management | Ready |
| `assistant_memory` | 27 | AI chat context | Ready |
| `recent_activity` | 76 | Activity feed | Ready |

---

## 🔴 LEGACY/UNUSED TABLES (Safe to Remove)

These tables have NO backend references and appear to be legacy:

| Table | Rows | Recommendation |
|-------|------|----------------|
| `roles` | 0 | **DROP** - Replaced by `rbac_roles` |
| `permissions` | 0 | **DROP** - Replaced by `rbac_permissions` |
| `routes` | 0 | **DROP** - Replaced by `rbac_routes` |
| `actions` | 0 | **DROP** - Replaced by `rbac_actions` |
| `service_table_usage` | 0 | **DROP** - Legacy monitoring |
| `statement_logs` | 0 | **DROP** - Legacy SQL logging |
| `personal_user_dictionary` | 0 | **DROP** - Unused spell check |
| `preprocessing_settings` | 0 | Review - May be AI related |
| `protected_spans` | 20 | Review - Spell check feature |
| `spelling_dictionary` | 61 | Review - Spell check feature |
| `message_reactions` | 0 | **KEEP** - Future chat feature |
| `message_reads` | 0 | **KEEP** - Future chat feature |

---

## 📊 PARTITION TABLES (39 Tables)

These are pre-created time-based partitions. Most are empty and created for future data:

### Thread Messages Partitions
- `thread_messages_p2025_09` through `thread_messages_p2026_11` (15 partitions)
- `thread_messages_p_default`
- `thread_messages_partitioned` (parent)

### Audit Logs Partitions  
- `audit_logs_p2025_12` through `audit_logs_p2026_05` (6 partitions)
- `audit_logs_p_default`
- `audit_logs_partitioned` (parent)

### Client Usage Events Partitions
- `client_usage_events_p2025_09` through `client_usage_events_p2026_11` (15 partitions)
- `client_usage_events_p_default`
- `client_usage_events_partitioned` (parent)

**Recommendation:** Keep partition structure. Empty partitions use minimal space (~8KB each). They enable efficient time-based queries and data archival.

---

## 🔧 OPTIMIZATION RECOMMENDATIONS

### 1. Drop Legacy RBAC Tables
```sql
-- Backup first, then drop unused legacy tables
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;
DROP TABLE IF EXISTS public.actions CASCADE;
```

### 2. Run VACUUM on Bloated Tables
```sql
VACUUM FULL ANALYZE admin_role_assignments;
VACUUM FULL ANALYZE module_assignments;
VACUUM FULL ANALYZE super_admins;
VACUUM FULL ANALYZE clients;
VACUUM FULL ANALYZE users_enhanced;
```

### 3. Clean Up Unused Indexes
Review and drop indexes with 0 usage after monitoring production:
- `idx_erp_users_email`
- `idx_erp_users_tenant_id`
- `erp_users_username_unique`

### 4. Archive Old Partitions
When partitions accumulate data, consider:
```sql
-- Archive old data to cold storage
-- Drop partitions older than retention period
DROP TABLE IF EXISTS audit_logs_p2025_09;
```

---

## 📁 Backend File References

### Most Database-Intensive Files
| File | Tables Used |
|------|-------------|
| `middleware/auth.js` | users, user_sessions, clients |
| `middleware/rbacMiddleware.js` | rbac_*, users |
| `middleware/tenantContext.js` | clients, users, modules |
| `routes/users.js` | users, user_profiles, user_* |
| `routes/paymentRequests.js` | payment_requests, approvals |
| `routes/tasks.js` | tasks, task_*, users |
| `services/chat/*.js` | threads, messages, thread_* |
| `cache/services/permissionCache.js` | rbac_permissions |
| `cache/services/sessionCache.js` | user_sessions |

---

## 📈 Database Health Metrics

| Metric | Value |
|--------|-------|
| Total Size | 19 MB |
| Largest Table | audit_logs (232 KB) |
| Most Active | system_metric_samples (1,420 rows) |
| Dead Tuples | 80+ (needs VACUUM) |
| Unused Indexes | 20+ |

---

*Report generated from live database analysis and backend code grep.*
