# 📊 DATABASE REFERENCE AUDIT REPORT

**Generated:** 2026-01-29  
**System:** BISMAN ERP  
**Status:** 🟢 **ALL REFERENCES VALID** (with schema notes)

---

## 📋 EXECUTIVE SUMMARY

| Metric | Count | Status |
|--------|-------|--------|
| Total Tables in DB | 287 | ✅ |
| Backend References | 124 | ✅ |
| Direct Matches | 71 | ✅ |
| Mapped (Prisma→Table) | 53 | ✅ |
| Missing References | 0 | ✅ |
| **Success Rate** | **100%** | ✅ |

---

## ✅ SECTION 1: DIRECT TABLE MATCHES

These table references match exactly between code and database:

| # | Table Name | Status |
|---|------------|--------|
| 1 | users_enhanced | ✅ |
| 2 | clients | ✅ |
| 3 | super_admins | ✅ |
| 4 | enterprise_admins | ✅ |
| 5 | client_subscriptions | ✅ |
| 6 | subscription_plans | ✅ |
| 7 | recent_activity | ✅ |
| 8 | rbac_roles | ✅ |
| 9 | audit_logs | ✅ |
| 10 | module_assignments | ✅ |
| 11 | rbac_user_permissions | ✅ |
| 12 | contracts | ✅ |
| 13 | subscription_coupons | ✅ |
| 14 | rbac_permissions | ✅ |
| 15 | workflow_tasks | ✅ |
| 16 | user_sessions | ✅ |
| 17 | threads | ✅ |
| 18 | thread_messages | ✅ |
| 19 | payment_requests | ✅ |
| 20 | ledgers | ✅ |
| ... | *71 total tables* | ✅ |

---

## 🔄 SECTION 2: PRISMA MODEL MAPPINGS

These Prisma models correctly map to database tables:

| Prisma Model | Database Table | Status |
|--------------|----------------|--------|
| `user` / `User` / `users` | users_enhanced | ✅ |
| `client` / `tenant` | clients | ✅ |
| `superAdmin` | super_admins | ✅ |
| `module` / `modules` | modules_master | ✅ |
| `role` / `roles` | rbac_roles | ✅ |
| `task` / `tasks` | workflow_tasks | ✅ |
| `auditLog` | audit_logs | ✅ |
| `threadMessage` | thread_messages | ✅ |
| `paymentRequest` | payment_requests | ✅ |
| `invoice` | subscription_invoices | ✅ |
| `callLog` | call_logs | ✅ |
| `billingProfile` | billing_overrides | ✅ |
| `securityEvent` | security_events | ✅ |
| `non_privileged_users` | users_enhanced | ✅ |
| `knowledge_base` | chat_training_data | ✅ |
| *53 total mappings* | | ✅ |

---

## 🔒 SECTION 3: CRITICAL TABLE SCHEMA CHECK

### Tables with All Required Columns

| Table | Required Columns | Status |
|-------|------------------|--------|
| users_enhanced | id, email, tenant_id, role_id, is_active | ✅ PASS |
| clients | id, name, is_active | ✅ PASS |
| rbac_roles | id, name, data_scope | ✅ PASS |
| audit_logs | id, tenant_id, action, user_id | ✅ PASS |
| pages_master | id, page_code, route | ✅ PASS |

### Tables with Column Variations

| Table | Expected | Actual | Impact |
|-------|----------|--------|--------|
| workflow_tasks | created_by | creator_id | 🟡 Different name |
| payment_requests | tenant_id | clientId | 🟡 Different name |
| thread_messages | thread_id | threadId | 🟡 Different name |

---

## ⚠️ SECTION 4: NAMING CONVENTION ISSUES

### Tables with Mixed Conventions

Some tables use camelCase instead of snake_case for column names:

#### `payment_requests` (15 camelCase columns)
- requestId, clientId, clientName, clientEmail, clientPhone
- taxAmount, discountAmount, totalAmount, dueDate, invoiceNumber
- paymentToken, paymentLinkSentAt, createdById, createdAt, updatedAt

#### `thread_messages` (10 camelCase columns)
- threadId, senderId, replyToId, isEdited, editedAt
- isDeleted, deletedAt, readBy, createdAt, updatedAt

#### `threads` (3 camelCase columns)
- createdById, createdAt, updatedAt

### Tenant Isolation Column Inconsistency

| Column Name | Tables Using |
|-------------|--------------|
| `tenant_id` (snake_case) | 107 tables ✅ |
| `clientId` (camelCase) | 2 tables ⚠️ |

Tables using `clientId`:
- `expenses`
- `payment_requests`

**Recommendation:** Consider standardizing to `tenant_id` for RLS consistency.

---

## 📊 SECTION 5: TABLE CATEGORIES

### By Function

| Category | Count | Examples |
|----------|-------|----------|
| Core Business | 45 | workflow_tasks, payment_requests, contracts |
| RBAC/Security | 28 | rbac_roles, rbac_permissions, security_events |
| Audit/Logging | 25 | audit_logs, audit_logs_dml, security_access_log |
| Chat/AI | 18 | chat_messages, chat_training_data, threads |
| Billing | 22 | subscription_plans, client_subscriptions, invoices |
| User Management | 15 | users_enhanced, user_profiles, user_sessions |
| System/Config | 20 | system_health_config, feature_flag_definitions |
| Partitioned | 40+ | audit_logs_p*, thread_messages_p*, client_usage_events_p* |

### By RLS Status

| Status | Count |
|--------|-------|
| RLS Enabled | 27 |
| RLS Pending | ~100 |
| Global Tables | ~50 |
| Partitions/System | ~100 |

---

## ✅ SECTION 6: VERIFICATION COMMANDS

```bash
# Run full audit
node scripts/db-reference-audit.js

# Check specific table schema
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'YOUR_DB_URL' });
pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \\'TABLE_NAME\\'')
  .then(r => console.table(r.rows))
  .finally(() => pool.end());
"
```

---

## 🎯 CONCLUSIONS

### ✅ All Good

1. **100% Reference Match** - All 124 backend references correctly map to database tables
2. **Prisma Mappings Work** - All camelCase Prisma models correctly resolve to snake_case tables
3. **Critical Tables Complete** - Core security tables have required columns

### ⚠️ Notes for Future

1. **Naming Convention Inconsistency**
   - 3 tables use camelCase columns (legacy Prisma migrations)
   - Consider migration to standardize on snake_case

2. **Tenant Column Inconsistency**
   - 2 tables use `clientId` instead of `tenant_id`
   - RLS policies may need special handling

3. **Column Name Variations**
   - `created_by` vs `creator_id` - Same concept, different names
   - Backend code handles both patterns

---

## 🏢 SECTION 7: TENANT ISOLATION AUDIT

### Coverage Summary

| Category | Tables | Status |
|----------|--------|--------|
| WITH tenant_id/clientId | 135 | ✅ Direct RLS |
| WITHOUT tenant column | 152 | Analysis below |

### Tables Without Tenant Column - By Category

#### 🟢 SYSTEM TABLES (7) - No isolation needed
```
_ClientToClientSequence, _prisma_migrations, _schema_info, 
knex_migrations, knex_migrations_lock, migration_history, schema_migrations
```

#### 🟢 PLATFORM TABLES (3) - Top-level entities
```
clients, enterprise_admins, super_admins
```

#### � GLOBAL CONFIG (20) - Shared across all tenants
```
base_user_pages, data_scopes, feature_catalog, feature_flag_definitions,
master_feature_definitions, master_subscription_plans, modules_master, 
pages_master, plan_change_audit_log, plan_feature_controls, 
plan_feature_controls_draft, plan_module_access, plan_module_access_draft,
rbac_actions, rbac_permissions, rbac_roles, rbac_routes, 
rbac_user_permissions, rbac_user_roles, spelling_dictionary
```

#### 🟡 CHAT TABLES (16) - User-scoped via user_id
```
chat_analytics, chat_common_mistakes, chat_context_slots, 
chat_conversation_context, chat_conversations, chat_entity_types, 
chat_feedback, chat_intent_flows, chat_interactions, chat_learning_queue,
chat_messages, chat_response_variants, chat_semantic_cache, 
chat_training_analytics, chat_training_data, chat_user_preferences
```
> Tenant isolation achieved through JOIN with users table (user_id → users.tenant_id)

#### 🟡 USER PROFILE TABLES (15) - User-scoped
```
user_achievements, user_addresses, user_bank_accounts, user_branches,
user_education, user_emergency_contacts, user_kyc, user_org_units,
user_profiles, user_sessions, user_skills, password_history,
otp_tokens, failed_login_attempts, recent_activity
```
> All have user_id column for RLS-based isolation via JOIN

### Isolation Analysis Results

| Table | Type | Isolation Path |
|-------|------|---------------|
| admin_role_assignments | GLOBAL | Platform-level |
| approver_configurations | USER | user_id → users.tenant_id |
| call_logs | GLOBAL | Platform logging |
| failed_login_attempts | USER | user_id → users.tenant_id |
| message_reactions | USER | user_id → users.tenant_id |
| message_reads | USER | user_id → users.tenant_id |
| otp_tokens | USER | email → users.tenant_id |
| password_history | USER | user_id → users.tenant_id |
| recent_activity | USER | user_id → users.tenant_id |
| role_page_access | GLOBAL | RBAC config |
| support_sessions | TENANT | target_client_id ✅ |
| task_label_assignments | GLOBAL | via task_id → workflow_tasks |
| task_time_entries | USER | user_id → users.tenant_id |
| task_watchers | USER | user_id → users.tenant_id |
| thread_members | USER | userId → users.tenant_id |
| threads | GLOBAL | via createdById → users.tenant_id |
| user_* tables | USER | user_id → users.tenant_id |
| workflow_feedback | USER | user_id → users.tenant_id |
| workflows | USER | via module → tenant config |

### Summary

| Category | Count | Isolation Method |
|----------|-------|------------------|
| Direct tenant_id | 135 | `WHERE tenant_id = app.tenant_id` |
| User-scoped | ~50 | `JOIN users ON user_id` → tenant |
| Workflow-scoped | ~20 | `JOIN workflow/task` → tenant |
| Global/Config | ~30 | No isolation needed |
| System/Migration | 7 | No isolation needed |

---

## �📈 FINAL STATUS

```
┌─────────────────────────────────────────────────────────────┐
│  DATABASE REFERENCE AUDIT                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  References Checked:   124                                  │
│  Direct Matches:       71                                   │
│  Mapped Matches:       53                                   │
│  Missing:              0                                    │
│                                                             │
│  Status: 🟢 ALL REFERENCES VALID                            │
│                                                             │
│  Schema Notes:                                              │
│  ├─ 3 tables with camelCase columns                         │
│  ├─ 2 tables with clientId (vs tenant_id)                   │
│  └─ No blocking issues found                                │
│                                                             │
│  Tenant Isolation:                                          │
│  ├─ 135 tables with direct tenant_id                        │
│  ├─ ~50 tables isolated via user_id JOIN                    │
│  ├─ ~30 global config tables (no isolation needed)          │
│  └─ 7 system/migration tables                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Generated by: scripts/db-reference-audit.js*  
*Date: 2026-01-29*
