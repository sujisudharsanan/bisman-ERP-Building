# 👥 BISMAN ERP - Complete User List

**Date:** October 26, 2025  
**Database:** BISMAN (PostgreSQL)

---

## 📊 User Hierarchy Overview

```
ENTERPRISE ADMIN (1)
├── SUPER ADMINS (3)
│   ├── Business ERP Super Admins (2)
│   └── Pump Management Super Admins (1)
├── CLIENTS/TENANTS (4)
│   ├── Business ERP Clients (2)
│   └── Pump Management Clients (2)
└── END USERS (17)
    ├── Admin Users (3)
    ├── Finance Team (7)
    ├── Operations Team (5)
    └── Compliance & Legal (2)
```

---

## 🎯 1. Enterprise Admin (Top Level)

| ID | Username | Email | Role | Status |
|----|----------|-------|------|--------|
| 33 | enterprise_admin | enterprise@bisman.erp | ENTERPRISE_ADMIN | ✅ Active |

**Access Level:** Full system access across all products (Business ERP + Pump Management)

---

## 🔐 2. Super Admins (Product Level)

### Business ERP Super Admins

| ID | Name | Email | Product Type | Status |
|----|------|-------|--------------|--------|
| 1 | Business Super Admin | business_superadmin@bisman.demo | BUSINESS_ERP | ✅ Active |
| 3 | Test Business Super Admin | test_business@bisman.demo | BUSINESS_ERP | ✅ Active |

**Client Count:** 2 clients each  
**Manages:** Business ERP modules (Finance, Procurement, Compliance, Operations)

### Pump Management Super Admins

| ID | Name | Email | Product Type | Status |
|----|------|-------|--------------|--------|
| 2 | Pump Super Admin | pump_superadmin@bisman.demo | PUMP_ERP | ✅ Active |

**Client Count:** 2 clients  
**Manages:** Pump Management modules (Fuel Management, Pump Sales, Inventory, Reports)

---

## 🏢 3. Clients/Tenants (Organization Level)

### Business ERP Clients

| ID | Name | Plan | Super Admin | Status |
|----|------|------|-------------|--------|
| 550e8400-e29b-41d4-a716-446655440001 | ABC Manufacturing Ltd | Premium | Business Super Admin (ID: 1) | ✅ Active |
| 550e8400-e29b-41d4-a716-446655440002 | XYZ Industries Pvt Ltd | Basic | Business Super Admin (ID: 1) | ✅ Active |

**Industry:** Manufacturing, General Business  
**Modules:** Finance, Procurement, Operations, Compliance & Legal

### Pump Management Clients

| ID | Name | Plan | Super Admin | Status |
|----|------|------|-------------|--------|
| 550e8400-e29b-41d4-a716-446655440003 | HP Petrol Pump - Station A | Premium | Pump Super Admin (ID: 2) | ✅ Active |
| 550e8400-e29b-41d4-a716-446655440004 | Shell Fuel Station - Highway | Basic | Pump Super Admin (ID: 2) | ✅ Active |

**Industry:** Petrol Pump, Fuel Stations  
**Modules:** Fuel Management, Pump Sales, Pump Inventory, Pump Reports

---

## 👤 4. End Users (Tenant Level - 17 Users)

### System Administrators (3 users)

| ID | Username | Email | Role | Tenant |
|----|----------|-------|------|--------|
| 34 | demo_super_admin | demo_super_admin@bisman.demo | SUPER_ADMIN | - |
| 35 | demo_it_admin | demo_it_admin@bisman.demo | IT_ADMIN | - |
| 46 | demo_admin | demo_admin@bisman.demo | ADMIN | - |

**Access:** System-wide administrative functions

---

### Finance Team (7 users)

| ID | Username | Email | Role | Department |
|----|----------|-------|------|------------|
| 36 | demo_cfo | demo_cfo@bisman.demo | CFO | Finance - Executive |
| 37 | demo_finance_controller | demo_finance_controller@bisman.demo | FINANCE_CONTROLLER | Finance - Control |
| 38 | demo_treasury | demo_treasury@bisman.demo | TREASURY | Finance - Treasury |
| 39 | demo_accounts | demo_accounts@bisman.demo | ACCOUNTS | Finance - Accounting |
| 40 | demo_accounts_payable | demo_accounts_payable@bisman.demo | ACCOUNTS_PAYABLE | Finance - AP |
| 41 | demo_banker | demo_banker@bisman.demo | BANKER | Finance - Banking |

**Modules:** Finance, General Ledger, Accounts Payable, Accounts Receivable, Treasury

---

### Operations Team (5 users)

| ID | Username | Email | Role | Department |
|----|----------|-------|------|------------|
| 42 | demo_procurement_officer | demo_procurement_officer@bisman.demo | PROCUREMENT_OFFICER | Procurement |
| 43 | demo_store_incharge | demo_store_incharge@bisman.demo | STORE_INCHARGE | Inventory/Stores |
| 47 | demo_operations_manager | demo_operations_manager@bisman.demo | MANAGER | Operations |
| 48 | demo_hub_incharge | demo_hub_incharge@bisman.demo | HUB_INCHARGE | Hub Operations |
| 49 | pump_superadmin | pump_superadmin@bisman.demo | SUPER_ADMIN | Pump Operations |

**Modules:** Operations, Procurement, Inventory, Task Management

---

### Compliance & Legal Team (2 users)

| ID | Username | Email | Role | Department |
|----|----------|-------|------|------------|
| 44 | demo_compliance | demo_compliance@bisman.demo | COMPLIANCE | Compliance |
| 45 | demo_legal | demo_legal@bisman.demo | LEGAL | Legal |

**Modules:** Compliance & Legal

---

## 📊 User Statistics

### By Role Type

| Role | Count | Percentage |
|------|-------|------------|
| SUPER_ADMIN | 2 | 11.8% |
| IT_ADMIN | 1 | 5.9% |
| CFO | 1 | 5.9% |
| FINANCE_CONTROLLER | 1 | 5.9% |
| TREASURY | 1 | 5.9% |
| ACCOUNTS | 1 | 5.9% |
| ACCOUNTS_PAYABLE | 1 | 5.9% |
| BANKER | 1 | 5.9% |
| PROCUREMENT_OFFICER | 1 | 5.9% |
| STORE_INCHARGE | 1 | 5.9% |
| COMPLIANCE | 1 | 5.9% |
| LEGAL | 1 | 5.9% |
| ADMIN | 1 | 5.9% |
| MANAGER | 1 | 5.9% |
| HUB_INCHARGE | 1 | 5.9% |
| **TOTAL END USERS** | **17** | **100%** |

### By Product Type

| Product Type | Super Admins | Clients | Total |
|--------------|-------------|---------|-------|
| Business ERP | 2 | 2 | 4 |
| Pump Management | 1 | 2 | 3 |
| **TOTAL** | **3** | **4** | **7** |

### By Department

| Department | User Count |
|------------|------------|
| Finance | 7 users |
| Operations | 5 users |
| Administration | 3 users |
| Compliance & Legal | 2 users |

---

## 🔑 Test Credentials Summary

### Enterprise Admin Login
```
Email: enterprise@bisman.erp
Role: ENTERPRISE_ADMIN
Access: Full system control
```

### Business ERP Super Admin Login
```
Email: business_superadmin@bisman.demo
Role: SUPER_ADMIN
Product: BUSINESS_ERP
Clients: 2 (ABC Manufacturing, XYZ Industries)
```

### Pump Management Super Admin Login
```
Email: pump_superadmin@bisman.demo
Role: SUPER_ADMIN
Product: PUMP_ERP
Clients: 2 (HP Petrol Pump, Shell Fuel Station)
```

### Sample Role-Based Logins
```
Finance:
- Email: demo_cfo@bisman.demo (CFO)
- Email: demo_finance_controller@bisman.demo (Finance Controller)
- Email: demo_accounts_payable@bisman.demo (Accounts Payable)

Operations:
- Email: demo_operations_manager@bisman.demo (Manager)
- Email: demo_procurement_officer@bisman.demo (Procurement)
- Email: demo_hub_incharge@bisman.demo (Hub Incharge)

Compliance:
- Email: demo_compliance@bisman.demo (Compliance Officer)
- Email: demo_legal@bisman.demo (Legal Team)
```

**Default Password:** (Check your seed script or environment variables)

---

## 🎯 User Access Matrix

### Business ERP Users
- ✅ Finance Module (All finance team)
- ✅ Procurement Module (Procurement officers)
- ✅ Operations Module (Operations team)
- ✅ Compliance & Legal Module (Compliance & legal team)

### Pump Management Users
- ✅ Fuel Management Module
- ✅ Pump Sales Module
- ✅ Pump Inventory Module
- ✅ Pump Reports Module
- ✅ Operations Module

---

## 📝 Notes

### Active Status
- ✅ All super admins are **ACTIVE**
- ✅ All clients are **ACTIVE**
- ✅ All end users created via seed script

### Multi-Tenancy
- Each client is isolated by `tenant_id`
- Super admins can manage multiple clients
- Enterprise admin oversees entire system

### Subscription Plans
- **Premium:** Full feature access (2 clients)
- **Basic:** Standard features (2 clients)

---

## 🚀 Quick Commands

### View All Super Admins
```sql
SELECT id, email, name, "productType", is_active 
FROM super_admins 
ORDER BY id;
```

### View All Clients
```sql
SELECT id, name, "subscriptionPlan", "productType", super_admin_id 
FROM clients 
ORDER BY id;
```

### View All End Users
```sql
SELECT id, username, email, role, tenant_id 
FROM users 
ORDER BY id;
```

### Count Users by Role
```sql
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;
```

---

**Document Generated:** October 26, 2025  
**Total Users:** 21 (1 Enterprise Admin + 3 Super Admins + 17 End Users)  
**Total Clients:** 4 (2 Business ERP + 2 Pump Management)  
**System Status:** ✅ All Active
