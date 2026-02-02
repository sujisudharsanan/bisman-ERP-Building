# BISMAN ERP - COMPREHENSIVE RBAC AUDIT REPORT
Generated: 2026-02-02T10:02:47.710Z
Database: Railway Production


================================================================================
1. ROLE DEFINITIONS (rbac_roles)
================================================================================
| ID | Name | Display | Level | Status | System | RPA Pages | APA Pages | Sync |
|----|------|---------|-------|--------|--------|-----------|-----------|------|
| 24 | ADMIN | Admin / Client | 10 | active | N | 12 | 168 | ❌ |
| 33 | BISMAN_BILLING | Bisman Billing | 10 | active | N | 6 | 0 | ❌ |
| 38 | BISMAN_CUSTOMER_CARE | Bisman Customer Care | 10 | active | N | 4 | 0 | ❌ |
| 41 | BISMAN_ENGINEERING | Bisman Engineering | 10 | active | N | 12 | 0 | ❌ |
| 29 | BISMAN_FINANCE | Bisman Finance | 10 | active | N | 6 | 0 | ❌ |
| 36 | BISMAN_SUPPORT | Bisman Support | 10 | active | N | 4 | 0 | ❌ |
| 20 | CEO | Chief Executive Officer | 10 | active | N | 3 | 0 | ❌ |
| 9 | CFO | - | 10 | active | N | 41 | 0 | ❌ |
| 21 | COO | Chief Operating Officer | 10 | active | N | 17 | 0 | ❌ |
| 22 | CTO | Chief Technology Officer | 10 | active | N | 0 | 0 | ✅ |
| 25 | SUPER_ADMIN | Super Admin | 10 | active | N | 19 | 168 | ❌ |
| 26 | ADMIN_OPS | Admin Ops | 9 | active | N | 9 | 9 | ✅ |
| 34 | ENTERPRISE_ADMIN | Enterprise Admin | 9 | active | N | 17 | 0 | ❌ |
| 10 | FINANCE_CONTROLLER | Finance Controller | 9 | active | N | 10 | 0 | ❌ |
| 23 | HR_MANAGER | HR Manager | 9 | active | N | 5 | 0 | ❌ |
| 3 | SYSTEM_ADMIN | System Administrator | 9 | active | N | 64 | 0 | ❌ |
| 13 | ACCOUNTS_PAYABLE | Accounts Payable | 7 | active | N | 4 | 0 | ❌ |
| 37 | BRANCH_INCHARGE | Branch Incharge | 7 | active | N | 1 | 0 | ❌ |
| 39 | HUB_INCHARGE_SR | Hub Incharge Sr | 7 | active | N | 1 | 0 | ❌ |
| 6 | MANAGER | Manager | 7 | active | N | 0 | 0 | ✅ |
| 5 | OPERATIONS_MANAGER | Operations Manager | 7 | active | N | 16 | 16 | ✅ |
| 15 | PROCUREMENT_OFFICER | Procurement Officer | 7 | active | N | 9 | 0 | ❌ |
| 31 | SALES_MANAGER | Sales Manager | 7 | active | N | 1 | 0 | ❌ |
| 42 | STORE_INCHARGE_SR | Store Incharge Sr | 7 | active | N | 2 | 0 | ❌ |
| 11 | TREASURY | Treasury | 7 | active | N | 1 | 0 | ❌ |
| 30 | AUDITOR | Auditor | 6 | active | N | 19 | 0 | ❌ |
| 18 | COMPLIANCE | Compliance | 6 | active | N | 18 | 0 | ❌ |
| 19 | LEGAL | Legal | 6 | active | N | 15 | 0 | ❌ |
| 32 | QA | Qa | 6 | active | N | 8 | 0 | ❌ |
| 35 | ACCOUNTANT | Accountant | 5 | active | N | 36 | 0 | ❌ |
| 40 | HR | Hr | 5 | active | N | 5 | 0 | ❌ |
| 17 | HUB_INCHARGE | Hub Incharge | 5 | active | N | 15 | 0 | ❌ |
| 16 | STORE_INCHARGE | Store Incharge | 5 | active | N | 15 | 0 | ❌ |
| 12 | ACCOUNTS | Accounts | 4 | active | N | 8 | 0 | ❌ |
| 14 | BANKER | Banker | 4 | active | N | 3 | 0 | ❌ |
| 4 | IT_ADMIN | IT Admin | 3 | active | N | 4 | 0 | ❌ |
| 7 | STAFF | Staff | 3 | active | N | 0 | 0 | ✅ |
| 27 | BASE_USER | Base User | 1 | active | Y | 0 | 0 | ✅ |
| 8 | DEMO_USER | Demo User | 1 | active | N | 0 | 0 | ✅ |

Total Roles: 39

================================================================================
2. MODULES (modules_master)
================================================================================
| ID | Code | Name | Sort | Active | Product | Pages |
|----|------|------|------|--------|---------|-------|
| 12 | ENTERPRISE_ADMIN | Enterprise Admin | -3 | Y | ALL | 17 |
| 11 | SUPER_ADMIN | Super Admin | -2 | Y | ALL | 10 |
| 10 | INTERNAL | Internal Operations | -1 | Y | ALL | 4 |
| 16 | DASHBOARD | Dashboard | 0 | Y | ALL | 1 |
| 9 | GOVERNANCE | Governance | 0 | Y | ALL | 4 |
| 1 | SYSTEM | System Administration | 1 | Y | ALL | 2 |
| 2 | FINANCE | Finance & Accounting | 2 | Y | ALL | 36 |
| 3 | PROCUREMENT | Procurement | 3 | Y | ALL | 9 |
| 17 | SUBSCRIPTIONS | Subscriptions | 3 | Y | ALL | 7 |
| 4 | OPERATIONS | Operations | 4 | Y | ALL | 15 |
| 5 | COMPLIANCE | Compliance & Legal | 5 | Y | ALL | 14 |
| 6 | HR | Human Resources | 6 | Y | ALL | 4 |
| 7 | BILLING | Billing & Subscription | 7 | Y | ALL | 2 |
| 8 | REPORTS | Reports | 8 | Y | ALL | 1 |
| 13 | ADMIN | Admin Console | 9 | Y | ALL | 12 |
| 14 | QA | QA & Testing | 10 | Y | ALL | 8 |
| 18 | ONBOARDING | Onboarding | 100 | Y | ALL | 4 |
| 20 | AUTH | Authentication | 998 | Y | ALL | 2 |
| 15 | COMMON | Common | 999 | Y | ALL | 11 |
| 19 | PUBLIC | Public Pages | 999 | Y | ALL | 5 |

Total Modules: 20

================================================================================
3. PAGES SUMMARY (pages_master)
================================================================================
Total Pages: 300
Active: 168
Show in Sidebar: 144
Public: 29
Governed: 273
Compulsory: 7
UI Pages: 299
API Routes: 0

================================================================================
4. PERMISSION TABLES COMPARISON
================================================================================

Table Counts:
  role_page_access: 410 rows
  admin_page_assignments: 409 rows

Sync Status by Role:
  Total roles with data: 35
  In sync: 2
  Mismatches: 33

  Mismatched roles:
    - ACCOUNTANT: RPA=36, APA=0
    - ACCOUNTS: RPA=8, APA=0
    - ACCOUNTS_PAYABLE: RPA=4, APA=0
    - ADMIN: RPA=12, APA=168
    - AUDITOR: RPA=19, APA=0
    - BANKER: RPA=3, APA=0
    - BISMAN_BILLING: RPA=6, APA=0
    - BISMAN_CUSTOMER_CARE: RPA=4, APA=0
    - BISMAN_ENGINEERING: RPA=12, APA=0
    - BISMAN_FINANCE: RPA=6, APA=0
    - BISMAN_SUPPORT: RPA=4, APA=0
    - BRANCH_INCHARGE: RPA=1, APA=0
    - CEO: RPA=3, APA=0
    - CFO: RPA=41, APA=0
    - COMPLIANCE: RPA=18, APA=0
    - COO: RPA=17, APA=0
    - ENTERPRISE_ADMIN: RPA=17, APA=0
    - FINANCE_CONTROLLER: RPA=10, APA=0
    - HR: RPA=5, APA=0
    - HR_MANAGER: RPA=5, APA=0
    - HUB_INCHARGE: RPA=15, APA=0
    - HUB_INCHARGE_SR: RPA=1, APA=0
    - IT_ADMIN: RPA=4, APA=0
    - LEGAL: RPA=15, APA=0
    - PROCUREMENT_OFFICER: RPA=9, APA=0
    - QA: RPA=8, APA=0
    - SALES_MANAGER: RPA=1, APA=0
    - STORE_INCHARGE: RPA=15, APA=0
    - STORE_INCHARGE_SR: RPA=2, APA=0
    - SUPER_ADMIN: RPA=19, APA=168
    - SYSTEM_ADMIN: RPA=64, APA=0
    - TREASURY: RPA=1, APA=0
    - USER: RPA=0, APA=37

================================================================================
5. BASE USER PAGES (inherited by all users)
================================================================================
  - [83] About Me (/common/about-me)
  - [149] Analytics (/analytics)
  - [80] Calendar (/common/calendar)
  - [162] Create Task (/tasks/create)
  - [86] My Dashboard (/dashboard)
  - [85] Security Settings (/common/security-settings)
  - [273] User Settings (/common/user-settings)
  - [118] Welcome (/welcome)
  - [119] Welcome Branding (/welcome/branding)
  - [120] Welcome Launching (/welcome/launching)

Total Base User Pages: 10

================================================================================
6. DATA INTEGRITY CHECKS
================================================================================
Orphan Assignments (page not active):
  role_page_access: 0
  admin_page_assignments: 0

Duplicate Entries in role_page_access: 0

Roles in role_page_access but NOT in rbac_roles: 0

================================================================================
7. PAGE DISTRIBUTION BY ROLE
================================================================================
  SYSTEM_ADMIN                   64 pages
  CFO                            41 pages
  ACCOUNTANT                     36 pages
  AUDITOR                        19 pages
  SUPER_ADMIN                    19 pages
  COMPLIANCE                     18 pages
  ENTERPRISE_ADMIN               17 pages
  COO                            17 pages
  OPERATIONS_MANAGER             16 pages
  STORE_INCHARGE                 15 pages
  LEGAL                          15 pages
  HUB_INCHARGE                   15 pages
  ADMIN                          12 pages
  BISMAN_ENGINEERING             12 pages
  FINANCE_CONTROLLER             10 pages
  ADMIN_OPS                      9 pages
  PROCUREMENT_OFFICER            9 pages
  ACCOUNTS                       8 pages
  QA                             8 pages
  BISMAN_FINANCE                 6 pages
  BISMAN_BILLING                 6 pages
  HR_MANAGER                     5 pages
  HR                             5 pages
  IT_ADMIN                       4 pages
  BISMAN_CUSTOMER_CARE           4 pages
  BISMAN_SUPPORT                 4 pages
  ACCOUNTS_PAYABLE               4 pages
  CEO                            3 pages
  BANKER                         3 pages
  STORE_INCHARGE_SR              2 pages
  HUB_INCHARGE_SR                1 pages
  BRANCH_INCHARGE                1 pages
  TREASURY                       1 pages
  SALES_MANAGER                  1 pages
