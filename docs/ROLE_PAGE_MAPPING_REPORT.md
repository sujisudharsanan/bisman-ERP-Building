# BISMAN ERP - Role & Page Mapping Report

**Generated:** 2026-01-24  
**Source:** Railway Production Database

---

## Executive Summary

The BISMAN ERP system has **24 roles** defined in `rbac_roles` table, with page access controlled via `role_page_access` table mapping roles to `pages_master`.

### Why "Admin Dashboard" Shows for ADMIN_OPS Role

The `ADMIN_OPS` role is explicitly mapped to the **Admin Dashboard** page (page_id: 45, route: `/admin`) in the `role_page_access` table. This is **intentional by design** - the ADMIN_OPS role has limited admin access focused on operational tasks.

---

## Section 1: All Roles Summary

| Role Name | Display Name | Level | Status | Total Pages | Sidebar Pages |
|-----------|--------------|-------|--------|-------------|---------------|
| SUPER_ADMIN | Super Admin | 10 | active | 258 | 194 |
| SYSTEM_ADMIN | System Administrator | 9 | active | 258 | 194 |
| CFO | - | 10 | active | 105 | 83 |
| ADMIN | Administrator | 10 | active | 99 | 68 |
| OPERATIONS_MANAGER | Operations Manager | 7 | active | 71 | 54 |
| HUB_INCHARGE | Hub Incharge | 5 | active | 70 | 53 |
| FINANCE_CONTROLLER | Finance Controller | 9 | active | 67 | 46 |
| MANAGER | Manager | 7 | active | 67 | 49 |
| COO | Chief Operating Officer | 10 | active | 60 | 43 |
| HR_MANAGER | HR Manager | 9 | active | 60 | 42 |
| CEO | Chief Executive Officer | 10 | active | 58 | 41 |
| CTO | Chief Technology Officer | 10 | active | 56 | 38 |
| STAFF | Staff | 3 | active | 53 | 37 |
| STORE_INCHARGE | Store Incharge | 5 | active | 25 | 20 |
| IT_ADMIN | IT Admin | 3 | active | 17 | 7 |
| COMPLIANCE | Compliance | 6 | active | 16 | 14 |
| LEGAL | Legal | 6 | active | 16 | 14 |
| PROCUREMENT_OFFICER | Procurement Officer | 7 | active | 16 | 14 |
| ACCOUNTS | Accounts | 4 | active | 14 | 7 |
| **ADMIN_OPS** | **Admin Ops** | **9** | **active** | **8** | **5** |
| BANKER | Banker | 4 | active | 8 | 3 |
| TREASURY | Treasury | 7 | active | 5 | 2 |
| ACCOUNTS_PAYABLE | Accounts Payable | 7 | active | 1 | 1 |
| DEMO_USER | Demo User | 1 | active | 0 | 0 |

---

## Section 2: ADMIN_OPS Role - Detailed Page Mapping

**Role ID:** 26  
**Role Name:** ADMIN_OPS  
**Display Name:** Admin Ops  
**Level:** 9  
**Total Pages:** 8  
**Sidebar Pages:** 5

### Sidebar Pages (Visible in Navigation)

| Page Name | Page Code | Route |
|-----------|-----------|-------|
| ✓ Admin Dashboard | ADMIN_DASHBOARD | `/admin` |
| ✓ Calendar | COMMON_CALENDAR | `/common/calendar` |
| ✓ Clients | ADMIN_CLIENTS | `/admin/clients` |
| ✓ Notifications | COMMON_NOTIFICATIONS | `/common/notifications` |
| ✓ Task Approvals | COMMON_TASK_APPROVALS | `/common/task-approvals` |

### Hidden Pages (Accessible but not in sidebar)

| Page Name | Page Code | Route |
|-----------|-----------|-------|
| ○ About Me | COMMON_ABOUT_ME | `/common/about-me` |
| ○ Dashboard | DASHBOARD_HOME | `/dashboard` |
| ○ Task Approvals (Admin) | ADMIN_TASK_APPROVALS | `/admin/task-approvals` |

---

## Section 3: Database Tables Reference

### rbac_roles Table
- Contains role definitions with `id`, `name` (key), `display_name`, `level`, `status`
- Role names use SCREAMING_SNAKE_CASE (e.g., `ADMIN_OPS`, `SUPER_ADMIN`)

### role_page_access Table
- Maps roles to pages via `role_name` and `page_id`
- `can_view` boolean controls access
- **Important:** Uses `role_name` (text), not role ID

### pages_master Table
- Contains all page definitions
- Key fields: `page_code`, `display_name`, `route`, `show_in_sidebar`, `is_active`

### users Table
- User's role is stored in `role` column as text (role name, not ID)
- Example: `role = 'ADMIN_OPS'` (correct) vs `role = '26'` (incorrect)

---

## Section 4: User-Role Assignment

| Username | Email | Role |
|----------|-------|------|
| lima_l_0hui | lima@eazymile.in | ADMIN_OPS |
| Suji Sudharsanan | - | ADMIN |

---

## Notes

1. **Calendar is mapped to ADMIN_OPS** - This can be removed from `role_page_access` if not needed
2. **Admin Dashboard is intentionally mapped** - ADMIN_OPS has limited admin access for operational duties
3. **Role names must match exactly** - The `users.role` column must contain the exact role name from `rbac_roles.name`

---

## How to Modify ADMIN_OPS Sidebar

To remove a page from ADMIN_OPS sidebar, run:
```sql
-- Remove Calendar from ADMIN_OPS
DELETE FROM role_page_access 
WHERE role_name = 'ADMIN_OPS' AND page_id = 80;

-- Remove Admin Dashboard from ADMIN_OPS  
DELETE FROM role_page_access 
WHERE role_name = 'ADMIN_OPS' AND page_id = 45;
```

To add a page to ADMIN_OPS sidebar:
```sql
INSERT INTO role_page_access (role_name, page_id, can_view)
VALUES ('ADMIN_OPS', <page_id>, true);
```
