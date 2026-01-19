# PAGE MAPPING & SIDEBAR VISIBILITY AUDIT

**Generated:** January 2025  
**System:** BISMAN ERP  
**Status:** ✅ Comprehensive Analysis Complete

---

## 📊 EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| **Pages in Database (`pages_master`)** | 174 |
| **Pages in Frontend Registry (`page-registry.ts`)** | 271 |
| **Actual Page Files in Filesystem** | 309 |
| **Pages Visible in Sidebar (DB)** | 134 |
| **Pages Hidden from Sidebar (DB)** | 40 |
| **Pages Hidden from Sidebar (Frontend)** | 60 |

---

## 📁 MODULE BREAKDOWN (Database)

| Module ID | Module Code | Display Name | Total Pages | Visible | Hidden |
|-----------|-------------|--------------|-------------|---------|--------|
| 1 | SYSTEM | System Administration | 13 | 9 | 4 |
| 2 | FINANCE | Finance & Accounting | 12 | 8 | 4 |
| 3 | PROCUREMENT | Procurement | 1 | 1 | 0 |
| 4 | OPERATIONS | Operations | 4 | 4 | 0 |
| 5 | COMPLIANCE | Compliance & Legal | 2 | 2 | 0 |
| 6 | HR | Human Resources | 1 | 1 | 0 |
| 7 | BILLING | Billing & Subscription | 2 | 2 | 0 |
| 8 | REPORTS | Reports | 2 | 2 | 0 |
| 9 | GOVERNANCE | Governance | 4 | 4 | 0 |
| 10 | INTERNAL | Internal Operations | 4 | 4 | 0 |
| 11 | SUPER_ADMIN | Super Admin | 17 | 13 | 4 |
| 12 | ENTERPRISE_ADMIN | Enterprise Admin | 24 | 19 | 5 |
| 13 | ADMIN | Admin Console | 20 | 14 | 6 |
| 14 | QA | QA & Testing | 8 | 4 | 4 |
| 15 | COMMON | Common | 24 | 17 | 7 |
| 16 | DASHBOARD | Dashboard | 3 | 3 | 0 |
| 17 | SUBSCRIPTIONS | Subscriptions | 8 | 2 | 6 |
| 18 | ONBOARDING | Onboarding | 7 | 7 | 0 |
| 19 | PUBLIC | Public Pages | 10 | 10 | 0 |
| 20 | AUTH | Authentication | 8 | 8 | 0 |
| **TOTAL** | | | **174** | **134** | **40** |

---

## 🔴 PAGES HIDDEN FROM SIDEBAR (Database: `show_in_sidebar = false`)

These pages exist but are intentionally hidden from sidebar navigation (accessible via direct URL or programmatic navigation):

### System Module (4)
- `SYSTEM_ABOUT_ME` → `/system/about-me`
- `SYSTEM_CLIENT_EDIT` → `/system/clients/[id]/edit`
- `SYSTEM_CLIENT_NEW` → `/system/clients/new`
- `SYSTEM_USER_CREATION` → `/system/user-creation`

### Finance Module (4)
- `FINANCE_APPROVAL_DETAIL` → `/finance/approval-details/[taskId]`
- `RECONCILIATION_DETAIL` → `/reconciliation/[id]`
- `RECONCILIATION_UPLOAD` → `/reconciliation/upload`
- `SETTLEMENT_DETAIL` → `/settlements/[id]`

### Super Admin Module (4)
- `SA_SYSTEM_ABOUT_ME` → `/super-admin/system/about-me`
- `SA_USER_USAGE_DETAIL` → `/super-admin/user-usage/[id]`
- `SUPER_ADMIN_PERMISSION_MANAGER` → `/super-admin/system/permission-manager`
- `SUPER_ADMIN_ROLES_USERS` → `/super-admin/system/roles-users-report`

### Enterprise Admin Module (5)
- `EA_MONITORING_DATABASE` → `/enterprise-admin/monitoring/database`
- `EA_MONITORING_LIVE` → `/enterprise-admin/monitoring/live`
- `EA_MONITORING_PERFORMANCE` → `/enterprise-admin/monitoring/performance`
- `EA_SUPER_ADMINS_CREATE` → `/enterprise-admin/super-admins/create`
- `EA_USER_USAGE_DETAIL` → `/enterprise-admin/user-usage/[id]`

### Admin Module (6)
- `ADMIN_BILLING_TENANT_DETAIL` → `/admin/billing/tenants/[id]`
- `ADMIN_BRANCHES_CREATE` → `/admin/branches/create`
- `ADMIN_CLIENT_PERMISSIONS` → `/admin/clients/[id]/permissions`
- `ADMIN_TASK_APPROVAL_DETAIL` → `/admin/task-approvals/[taskId]`
- `ADMIN_USER_USAGE_DETAIL` → `/admin/user-usage/[id]`
- `ADMIN_USERS_CREATE` → `/admin/users/create`

### QA Module (4)
- `QA_ISSUE_DETAIL` → `/qa/issues/[id]`
- `QA_ISSUE_NEW` → `/qa/issues/new`
- `QA_TEST_TASK_DETAIL` → `/qa/test-tasks/[id]`
- `QA_TEST_TASK_NEW` → `/qa/test-tasks/new`

### Common Module (7)
- `COMMON_ABOUT_ME` → `/common/about-me`
- `COMMON_CLIENTS_CREATE` → `/clients/create`
- `COMMON_SECURITY_SETTINGS` → `/common/security-settings`
- `COMMON_SETTINGS_SECURITY` → `/settings/security`
- `COMMON_TASK_APPROVAL_DETAIL` → `/common/task-approvals/[id]`
- `COMMON_TASKS_CREATE` → `/tasks/create`
- `COMMON_USER_CREATION` → `/common/user-creation`

### Subscriptions Module (6)
- `SUBSCRIPTION_AUDIT` → `/super-admin/subscriptions/audit`
- `SUBSCRIPTION_BILLING` → `/super-admin/subscriptions/billing`
- `SUBSCRIPTION_COUPONS` → `/super-admin/subscriptions/coupons`
- `SUBSCRIPTION_MICRO_UNLOCK` → `/super-admin/subscriptions/micro-unlock`
- `SUBSCRIPTION_PLANS` → `/super-admin/subscriptions/plans`
- `SUBSCRIPTION_TENANTS` → `/super-admin/subscriptions/tenants`

---

## ⚠️ DISCREPANCY ANALYSIS

### 1. Pages in DB but NOT in Frontend Registry (34)
These are mainly dynamic routes with parameters or public/auth pages:

| Route | Notes |
|-------|-------|
| `/(public)/landing` | Public landing page |
| `/admin/billing/tenants/[id]` | Dynamic route - tenant detail |
| `/admin/clients/[id]/permissions` | Dynamic route |
| `/admin/task-approvals/[taskId]` | Dynamic route |
| `/admin/user-usage/[id]` | Dynamic route |
| `/auth/admin-login` | Auth page |
| `/auth/forgot-password` | Auth page |
| `/auth/hub-incharge-login` | Auth page |
| `/auth/login` | Auth page |
| `/auth/portals` | Auth page |
| `/auth/reset-password` | Auth page |
| `/auth/standard-login` | Auth page |
| `/common/messages` | Messages page |
| `/common/task-approvals/[id]` | Dynamic route |
| `/enterprise-admin/user-usage/[id]` | Dynamic route |
| `/finance/approval-details/[taskId]` | Dynamic route |
| `/get-started` | Onboarding page |
| `/login` | Root login redirect |
| `/onboarding/clients/new` | Onboarding |
| `/onboarding/trial` | Trial onboarding |
| `/onboarding/trial/quick` | Quick trial |
| `/onboarding/trial/resume/[token]` | Dynamic route |
| `/qa/issues/[id]` | Dynamic route |
| `/qa/test-tasks/[id]` | Dynamic route |
| `/reconciliation/[id]` | Dynamic route |
| `/settlements/[id]` | Dynamic route |
| `/signup` | Public signup |
| `/status` | Status page |
| `/super-admin/user-usage/[id]` | Dynamic route |
| `/system/clients/[id]/edit` | Dynamic route |
| `/unauthorized` | Error page |
| `/welcome` | Welcome page |
| `/welcome/branding` | Onboarding |
| `/welcome/launching` | Onboarding |

**Analysis:** Most of these are expected to be hidden (dynamic detail pages, auth flows, public pages).

### 2. Pages in Frontend Registry but NOT in DB (131)
These are pages registered in the frontend for routing but not tracked in `pages_master`:

**Sample (top 60):**
- `/` - Root redirect
- `/accounts` - Accounts page
- `/accounts-payable` - Accounts payable
- `/admin/ai` - AI admin
- `/admin/billing` - Billing admin
- `/admin/billing/tenants` - Tenant billing list
- `/admin/client-dashboard` - Client dashboard
- `/admin/contracts` - Contracts
- `/admin/contracts/create` - Create contract
- `/admin/developer` - Developer tools
- `/admin/integrations` - Integrations
- `/admin/modules` - Module management
- `/admin/notifications` - Notifications
- `/admin/organizations` - Organizations
- `/admin/reports` - Admin reports
- `/admin/support` - Support
- `/admin/user-usage` - User usage
- `/admin/users` - Users list
- `/assets/maintenance-scheduling` - Asset maintenance
- `/banker` - Banker dashboard
- `/cfo-dashboard` - CFO dashboard
- `/chat` - Chat
- `/chat/ai` - AI Chat
- `/common/change-password` - Change password
- `/common/help-center` - Help center
- `/common/payment-requests/create` - Create payment request
- `/common/user-settings` - User settings
- `/communication/internal-chat` - Internal chat
- `/compliance-officer` - Compliance officer dashboard
- `/compliance/*` (multiple) - Various compliance pages
- `/enterprise-admin/*` (multiple) - EA pages
- `/finance/*` (multiple) - Finance pages
- `/operations/*` (multiple) - Operations pages
- ... and more

**Analysis:** These 131 pages are in the frontend registry for routing/navigation but haven't been added to `pages_master` table for governance tracking.

### 3. Filesystem Pages NOT in Frontend Registry (57)
Actual page files that exist but are not registered:

| Page Path | Notes |
|-----------|-------|
| `/(dashboard)/admin/*` | Dashboard group route pages |
| `/(dashboard)/assets/*` | Asset pages in dashboard group |
| `/(dashboard)/communication/*` | Communication pages |
| `/(dashboard)/inventory/*` | Inventory pages |
| `/(dashboard)/notifications` | Notifications |
| `/(dashboard)/production/*` | Production pages |
| `/(dashboard)/sales/*` | Sales pages |
| `/(dashboard)/shipping/*` | Shipping pages |
| `/(dashboard)/warehouse/*` | Warehouse pages |
| `/contact-sales` | Contact sales page |
| `/docs/sla` | SLA documentation |
| `/privacy` | Privacy page |
| `/status/rss` | RSS feed |
| `/status/subscribe` | Status subscribe |
| `/support` | Support page |
| Dynamic `[id]` routes | Expected behavior |

**Analysis:** Most are route group pages `(dashboard)` which are organizational only, plus public pages and dynamic routes.

---

## ✅ PAGES CORRECTLY VISIBLE IN SIDEBAR (Database)

All 134 pages with `show_in_sidebar = true` are correctly configured for sidebar display.

**Key Visible Pages by Module:**

### System Administration (9 visible)
- Backup & Restore, System Health, Integration Settings
- Pages & Roles Report, Permission Manager, Role & Access Explorer
- Modules & Roles, Server Logs, Client Management

### Finance & Accounting (8 visible)
- Accounts Payable, Accounts Receivable, Approval Structure
- Executive Dashboard, General Ledger, Payment Approval Queue
- Bank Reconciliation, Settlements

### Super Admin (13 visible)
- Dashboard, Client Management, Pages & Roles Report
- Subscription Overview, System Overview, Backup & Restore
- Deployment Tools, Fallback & Recovery, Integration Settings
- Security Management, System Health, Decision Load
- Subscription Settings

### Enterprise Admin (19 visible)
- Enterprise Dashboard, Module Management, Role Management
- Subscription Access Control, Super Admins, System Logs
- Activity Logs, Page Governance, Billing Management
- Enterprise Settings, System Monitoring, Integrations
- Live Dashboard, RBAC Security, Security Operations
- Subscriptions, Support, Production Ready Docs

---

## 📋 RECOMMENDATIONS

### 1. **Add Missing Pages to `pages_master`** (Priority: Medium)
The 131 pages in frontend registry but not in DB should be reviewed:
- Determine if they need governance tracking
- Add important pages to `pages_master` for RBAC/subscription enforcement
- Mark deprecated pages for cleanup

### 2. **Verify Dynamic Routes** (Priority: Low)
Dynamic routes like `/[id]` pages are correctly hidden from sidebar but should be:
- ✅ Accessible via direct navigation
- ✅ Subject to same permission checks as parent page

### 3. **Route Group Pages** (Priority: Info)
Pages under `(dashboard)/` route groups are organizational and don't need sidebar entries:
- These use Next.js route groups for layout organization
- Not intended for direct navigation

### 4. **Frontend Registry Cleanup** (Priority: Low)
Consider removing obsolete entries from `page-registry.ts`:
- Pages that no longer exist
- Duplicate routes with different IDs

---

## 🔒 SUBSCRIPTION GATING STATUS

All module layouts have been updated with `ModuleGate` protection:

| Module | Layout Path | ModuleGate | HTTP 402 |
|--------|-------------|------------|----------|
| finance | `/finance/layout.tsx` | ✅ | ✅ |
| analytics | `/analytics/layout.tsx` | ✅ | ✅ |
| procurement | `/procurement/layout.tsx` | ✅ | ✅ |
| operations | `/operations/layout.tsx` | ✅ | ✅ |
| compliance | `/compliance/layout.tsx` | ✅ | ✅ |
| hr | `/hr/layout.tsx` | ✅ | ✅ |
| qa | `/qa/layout.tsx` | ✅ | ✅ |
| reports | `/reports/layout.tsx` | ✅ | ✅ |
| governance | `/governance/layout.tsx` | ✅ | ✅ |
| settlements | `/settlements/layout.tsx` | ✅ | ✅ |
| reconciliation | `/reconciliation/layout.tsx` | ✅ | ✅ |
| internal | `/internal/layout.tsx` | ✅ | ✅ |

---

## 📈 SYNC STATUS

| Data Source | Status |
|-------------|--------|
| Database `pages_master` | ✅ 174 pages tracked |
| Frontend `page-registry.ts` | ✅ 271 routes registered |
| Filesystem `page.tsx` files | ✅ 309 pages exist |
| Sidebar visibility | ✅ 134 visible, 40 hidden |
| ModuleGate protection | ✅ 12 modules protected |
| API plan enforcement | ✅ HTTP 402 for unpaid modules |

---

**Report Generated By:** BISMAN ERP Audit System  
**Last Updated:** January 2025
