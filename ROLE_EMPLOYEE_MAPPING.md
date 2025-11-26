# 🎯 ROLE & EMPLOYEE MAPPING - BISMAN ERP

## 📊 System Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  ENTERPRISE_ADMIN (Bisman Platform Owner)          │
│  - Assigns modules to Super Admins                 │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  SUPER_ADMIN (Multi-Tenant Manager)                │
│  - Manages multiple clients                        │
│  - Assigns modules/pages to Clients                │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  CLIENT (Company/Admin User - e.g., Eazymiles)     │
│  - Assigns modules/pages to Roles                  │
│  - Multiple clients per Super Admin                │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  ROLES (Job Positions)                             │
│  - Defined by Client                               │
│  - Permissions assigned by Client Admin            │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  EMPLOYEES (Users assigned to Roles)               │
│  - Multiple employees can have same role           │
│  - Added by Client Admin as needed                 │
└─────────────────────────────────────────────────────┘
```

---

## 📋 CURRENT ROLES DEFINED IN SYSTEM

### System-Level Roles (Not for regular employees)
1. **ENTERPRISE_ADMIN** - Platform Owner
2. **SUPER_ADMIN** - Multi-Client Manager

### Client-Level Employee Roles

#### 💼 Finance & Accounting Roles
| Role | Role Code | Description | Department |
|------|-----------|-------------|------------|
| **CFO** | `CFO` | Chief Financial Officer | Finance |
| **FINANCE_CONTROLLER** | `FINANCE_CONTROLLER` | Financial Operations Manager | Finance |
| **ACCOUNTS_PAYABLE** | `ACCOUNTS_PAYABLE` | Invoice & Payment Processing | Finance |

#### 🏭 Operations & Management Roles
| Role | Role Code | Description | Department |
|------|-----------|-------------|------------|
| **OPERATIONS_MANAGER** | `OPERATIONS_MANAGER` | Multi-Site Operations Lead | Operations |
| **HUB_INCHARGE** | `HUB_INCHARGE` | Site/Location Manager | Operations |
| **STORE_INCHARGE** | `STORE_INCHARGE` | Warehouse & Inventory Manager | Operations |

#### 👥 HR & Administration Roles
| Role | Role Code | Description | Department |
|------|-----------|-------------|------------|
| **HR_MANAGER** | `HR_MANAGER` | Human Resources Manager | HR |

#### 🛒 Supply Chain & Procurement Roles
| Role | Role Code | Description | Department |
|------|-----------|-------------|------------|
| **PROCUREMENT_OFFICER** | `PROCUREMENT_OFFICER` | Vendor & Purchasing Manager | Procurement |

#### ⚖️ Legal & Compliance Roles
| Role | Role Code | Description | Department |
|------|-----------|-------------|------------|
| **COMPLIANCE_OFFICER** | `COMPLIANCE_OFFICER` | Regulatory Compliance Manager | Compliance |
| **LEGAL_HEAD** | `LEGAL_HEAD` | Legal & Contracts Manager | Legal |

---

## 👥 CURRENT EMPLOYEE → ROLE MAPPING

### Currently in Database (Demo Company Client)

| Employee Name | Email | Role | Employee Code | Status |
|--------------|-------|------|---------------|--------|
| **Arun Kumar** | arun.kumar@bisman.demo | HUB_INCHARGE | BIS-HUB-001 | ✅ Active |
| **Rajesh Verma** | rajesh.verma@bisman.demo | CFO | BIS-CFO-001 | ✅ Active |
| **Meera Singh** | meera.singh@bisman.demo | FINANCE_CONTROLLER | BIS-FC-001 | ✅ Active |
| **Vikram Reddy** | vikram.reddy@bisman.demo | OPERATIONS_MANAGER | BIS-OPS-001 | ✅ Active |
| **Priya Sharma** | priya.sharma@bisman.demo | HR_MANAGER | BIS-HR-001 | ✅ Active |
| **Amit Patel** | amit.patel@bisman.demo | PROCUREMENT_OFFICER | BIS-PRO-001 | ✅ Active |
| **Suresh Yadav** | suresh.yadav@bisman.demo | STORE_INCHARGE | BIS-ST-001 | ✅ Active |
| **Kavita Iyer** | kavita.iyer@bisman.demo | COMPLIANCE_OFFICER | BIS-CO-001 | ✅ Active |
| **Deepak Mishra** | deepak.mishra@bisman.demo | LEGAL_HEAD | BIS-LEG-001 | ✅ Active |
| **Rohit Desai** | rohit.desai@bisman.demo | ACCOUNTS_PAYABLE | BIS-AP-001 | ✅ Active |

---

## 🎯 ROLE DEFINITIONS BY DEPARTMENT

### 💰 Finance Department (3 roles)

#### 1. CFO (Chief Financial Officer)
- **Count**: 1 employee (Rajesh Verma)
- **Responsibilities**:
  - Financial Planning & Analysis
  - Risk Management
  - Corporate Finance
  - Strategic Financial Decision Making
- **Skills Required**: CA, MBA Finance, Financial Planning, Risk Management
- **Reporting**: Reports to Enterprise/Super Admin
- **Product Type**: BUSINESS_ERP

#### 2. FINANCE_CONTROLLER
- **Count**: 1 employee (Meera Singh)
- **Responsibilities**:
  - Financial Accounting
  - Budgeting & Forecasting
  - GST Compliance
  - Financial Reporting
- **Skills Required**: CA, Financial Accounting, Tally ERP
- **Reporting**: Reports to CFO
- **Product Type**: BUSINESS_ERP

#### 3. ACCOUNTS_PAYABLE
- **Count**: 1 employee (Rohit Desai)
- **Responsibilities**:
  - Invoice Processing
  - Vendor Reconciliation
  - Payment Processing
  - Accounts Payable Management
- **Skills Required**: B.Com, Tally, QuickBooks
- **Reporting**: Reports to Finance Controller
- **Product Type**: BUSINESS_ERP

---

### 🏭 Operations Department (3 roles)

#### 4. OPERATIONS_MANAGER
- **Count**: 1 employee (Vikram Reddy)
- **Responsibilities**:
  - Supply Chain Management
  - Process Optimization
  - Multi-Site Operations
  - Project Management
- **Skills Required**: B.Tech, MBA Operations, Lean Six Sigma
- **Reporting**: Reports to CFO/Enterprise Admin
- **Product Type**: PUMP_ERP

#### 5. HUB_INCHARGE
- **Count**: 1 employee (Arun Kumar)
- **Responsibilities**:
  - Site Operations Management
  - Inventory Management
  - Fuel Quality Testing
  - Team Leadership
- **Skills Required**: B.Com, Inventory Management, Team Leadership
- **Reporting**: Reports to Operations Manager
- **Product Type**: PUMP_ERP

#### 6. STORE_INCHARGE
- **Count**: 1 employee (Suresh Yadav)
- **Responsibilities**:
  - Warehouse Management
  - Inventory Control
  - Stock Auditing
  - Inventory Accuracy
- **Skills Required**: B.Sc, Inventory Control, Warehouse Management
- **Reporting**: Reports to Operations Manager/Hub Incharge
- **Product Type**: PUMP_ERP

---

### 👥 HR Department (1 role)

#### 7. HR_MANAGER
- **Count**: 1 employee (Priya Sharma)
- **Responsibilities**:
  - Talent Acquisition
  - Employee Relations
  - Performance Management
  - HR Analytics
- **Skills Required**: MBA HR, Talent Acquisition, Performance Management
- **Reporting**: Reports to CFO/Enterprise Admin
- **Product Type**: BUSINESS_ERP

---

### 🛒 Procurement Department (1 role)

#### 8. PROCUREMENT_OFFICER
- **Count**: 1 employee (Amit Patel)
- **Responsibilities**:
  - Vendor Management
  - Contract Negotiation
  - Procurement Analytics
  - Cost Savings
- **Skills Required**: B.E. Industrial, Supply Chain Diploma
- **Reporting**: Reports to Operations Manager
- **Product Type**: PUMP_ERP

---

### ⚖️ Legal & Compliance Department (2 roles)

#### 9. COMPLIANCE_OFFICER
- **Count**: 1 employee (Kavita Iyer)
- **Responsibilities**:
  - Regulatory Compliance
  - Risk Assessment
  - Legal Documentation
  - Audit Management
- **Skills Required**: LLB, Corporate Law Diploma
- **Reporting**: Reports to Legal Head/CFO
- **Product Type**: BUSINESS_ERP

#### 10. LEGAL_HEAD
- **Count**: 1 employee (Deepak Mishra)
- **Responsibilities**:
  - Corporate Litigation
  - Contract Drafting
  - Mergers & Acquisitions
  - Intellectual Property
- **Skills Required**: LLB, LLM Corporate Law
- **Reporting**: Reports to CFO/Enterprise Admin
- **Product Type**: BUSINESS_ERP

---

## 🔄 How It Works

### Permission Flow:
```
ENTERPRISE_ADMIN
  ↓ assigns modules
SUPER_ADMIN
  ↓ assigns modules/pages
CLIENT (Admin User)
  ↓ assigns modules/pages
ROLE (e.g., CFO, HR_MANAGER)
  ↓ permissions inherited by
EMPLOYEES (multiple users can have same role)
```

### Example: Eazymiles Client Structure

```
Eazymiles (CLIENT)
  └── CFO Role
      ├── Employee 1: Rajesh Verma
      ├── Employee 2: Amit Shah (can add later)
      └── Employee 3: Priya Gupta (can add later)
  
  └── HR_MANAGER Role
      ├── Employee 1: Priya Sharma
      └── Employee 2: Rohit Kumar (can add later)
  
  └── OPERATIONS_MANAGER Role
      └── Employee 1: Vikram Reddy
```

---

## 📝 Key Concepts

1. **ROLES are Templates**: Define permissions once, apply to many employees
2. **EMPLOYEES fill ROLES**: Multiple employees can have the same role
3. **CLIENT assigns to ROLES**: Not individual employees
4. **Scalable**: Add as many employees as needed under each role

---

## ✅ Next Steps

1. ✅ **Keep these 10 role definitions** (already defined in system)
2. ✅ **Create Eazymiles CLIENT** (admin user/company)
3. ✅ **Current employees stay as examples** (these 10 employees under Demo Company)
4. ⚠️ **You manually add employees later** through admin interface to any role you need

---

## 🎯 Summary

- **10 Roles Defined**: CFO, FINANCE_CONTROLLER, OPERATIONS_MANAGER, HUB_INCHARGE, HR_MANAGER, PROCUREMENT_OFFICER, STORE_INCHARGE, COMPLIANCE_OFFICER, LEGAL_HEAD, ACCOUNTS_PAYABLE
- **10 Demo Employees**: One per role for reference
- **Client Admin**: Can add unlimited employees to any role
- **Role-Based Permissions**: Assign permissions to roles, not individual users
