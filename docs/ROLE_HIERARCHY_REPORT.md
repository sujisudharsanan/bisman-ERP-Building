# 📊 BISMAN ERP - Role Hierarchy & Reporting Structure Report

**Generated:** December 21, 2025  
**Purpose:** Complete documentation of who reports to whom in the organization

---

## 🎯 Executive Summary

BISMAN ERP uses a **dual hierarchy system**:

1. **Security Access** - Controls what users can SEE (pages, modules, data)
2. **Business Level** - Controls what users can APPROVE (workflow actions)

> **Key Principle:** "Security decides what you can SEE. Business Level decides what you can APPROVE."

---

## 📈 Business Hierarchy (L1-L10)

The business hierarchy controls approvals, reviews, task assignments, and escalations.

```
                    ┌─────────────────────┐
                    │    L10: SUPER ADMIN  │ ← Platform-wide oversight
                    │   (Platform Owner)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    L9: EXECUTIVE     │ ← Executive level
                    │  Admin, CFO, CTO,    │
                    │  System Administrator│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    L8: CONTROLLER    │ ← Senior controllers
                    │  Finance Controller, │
                    │      IT Admin        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  L7: SENIOR MANAGER  │ ← Operations leadership
                    │  Operations Manager, │
                    │      Treasury        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    L6: MANAGER       │ ← Department heads
                    │  HR Manager, Legal,  │
                    │ Compliance, Manager  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ L5: SENIOR OFFICER   │ ← Senior staff
                    │  Accounts, Banker    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    L4: OFFICER       │ ← Officers
                    │ Accounts Payable,    │
                    │ Procurement Officer  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    L3: INCHARGE      │ ← Location heads
                    │ Hub Incharge, Branch │
                    │ Incharge, Store      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   L2: SUPERVISOR     │ ← Team leads
                    │     Supervisor       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     L1: STAFF        │ ← Entry level
                    │  Staff, User, Data   │
                    │    Entry Operator    │
                    └─────────────────────┘
```

---

## 👥 Complete Role Mapping

| Level | Business Level | Roles | Reports To | Can Approve Up To |
|-------|----------------|-------|------------|-------------------|
| **L10** | 100 | Super Admin | - | Any level |
| **L9** | 90 | Admin, CFO, CTO, System Administrator, Director | Super Admin (L10) | L9 requests |
| **L8** | 80 | Finance Controller, IT Admin | Executive (L9) | L8 requests |
| **L7** | 70 | Operations Manager, Treasury | Controller (L8) | L7 requests |
| **L6** | 60 | HR Manager, Compliance Officer, Legal Head, Manager | Senior Manager (L7) | L6 requests |
| **L5** | 50 | Accounts, Banker, Senior Officer | Manager (L6) | L5 requests |
| **L4** | 40 | Accounts Payable, Procurement Officer | Senior Officer (L5) | L4 requests |
| **L3** | 30 | Hub Incharge, Branch Incharge, Store Incharge | Officer (L4) | L3 requests |
| **L2** | 20 | Supervisor, Team Lead | Incharge (L3) | L2 requests |
| **L1** | 10 | Staff, User, Data Entry Operator | Supervisor (L2) | Cannot approve |

---

## 🔄 Workflow Rules

### Who Can Review

```
Reviewer.business_level = Creator.business_level + 1
```

Only the **immediate superior** (one level above) can review.

| Creator Level | Can Be Reviewed By |
|---------------|-------------------|
| L1 (Staff) | L2 (Supervisor) |
| L2 (Supervisor) | L3 (Incharge) |
| L3 (Incharge) | L4 (Officer) |
| L4 (Officer) | L5 (Senior Officer) |
| L5 (Senior Officer) | L6 (Manager) |
| L6 (Manager) | L7 (Senior Manager) |
| L7 (Senior Manager) | L8 (Controller) |
| L8 (Controller) | L9 (Executive) |
| L9 (Executive) | L10 (Super Admin) |

---

### Who Can Approve

```
Approver.business_level >= Required_Approval_Level
```

Anyone at or above the required level can approve.

| Request Type | Required Level | Who Can Approve |
|--------------|----------------|-----------------|
| Minor request | L2 | L2+ (Supervisor and above) |
| Standard request | L4 | L4+ (Officer and above) |
| Department request | L6 | L6+ (Manager and above) |
| High-value request | L8 | L8+ (Controller and above) |
| Critical request | L9 | L9+ (Executive and above) |

---

### Who Can Assign Tasks

```
Assigner.business_level >= Target.business_level
```

Can only assign to users at same or lower level.

| Assigner Level | Can Assign To |
|----------------|---------------|
| L9 (Executive) | L1-L9 |
| L6 (Manager) | L1-L6 |
| L3 (Incharge) | L1-L3 |
| L2 (Supervisor) | L1-L2 |
| L1 (Staff) | L1 only (self) |

---

### Who Can Escalate

```
Target.business_level > Escalator.business_level
```

Can only escalate to someone at a **higher** level.

| Escalator Level | Can Escalate To |
|-----------------|-----------------|
| L1 (Staff) | L2-L10 |
| L4 (Officer) | L5-L10 |
| L6 (Manager) | L7-L10 |
| L9 (Executive) | L10 only |

---

## 📋 Module-Specific Approval Flows

### Finance Module

```
Staff (L1) creates expense request
        ↓
Supervisor (L2) reviews ─────────── A1: Review
        ↓
Manager (L6) approves ────────────── A2: Department Approval
        ↓
CFO (L9) gives final approval ───── A3: Final Approval (high amounts)
        ↓
    ✅ Completed
```

| Step | Approval Level | Min Business Level | Typical Role |
|------|----------------|-------------------|--------------|
| A1 | Review | L2 | Supervisor |
| A2 | Department Approval | L6 | Manager |
| A3 | Final Approval | L9 | CFO / Admin |

---

### Operations Module

```
Staff (L1) creates request
        ↓
Supervisor (L2) reviews ────────── A1: Review
        ↓
Ops Manager (L7) approves ─────── A2: Operations Approval
        ↓
    ✅ Completed
```

| Step | Approval Level | Min Business Level | Typical Role |
|------|----------------|-------------------|--------------|
| A1 | Review | L2 | Supervisor |
| A2 | Operations Approval | L7 | Operations Manager |

---

### Procurement Module

```
Staff (L1) creates PO request
        ↓
Supervisor (L2) reviews ────────────── A1: Review
        ↓
Procurement Officer (L4) approves ──── A2: Procurement Approval
        ↓
Finance Controller (L8) approves ───── A3: Finance Approval
        ↓
    ✅ Completed
```

| Step | Approval Level | Min Business Level | Typical Role |
|------|----------------|-------------------|--------------|
| A1 | Review | L2 | Supervisor |
| A2 | Procurement Approval | L4 | Procurement Officer |
| A3 | Finance Approval | L8 | Finance Controller |

---

## 🛡️ Security Access (Separate from Business Level)

Security controls **page and module access**, NOT approvals.

| Security Level | Access Scope | Description |
|----------------|--------------|-------------|
| `SUPER_ADMIN` | Full platform | Can access any tenant, any module |
| `ENTERPRISE_ADMIN` | Enterprise-wide | Manages multiple clients under enterprise |
| `ADMIN` | Single client | Full access within one organization |
| `USER` | Single client | Limited access based on RBAC permissions |

⚠️ **Important:** A USER with high business level (L9) can approve high-value requests but still cannot access ADMIN-only pages. Security and Business Level are independent.

---

## 🔄 Fallback Chain (No Task Ever Gets Stuck)

When the required approver is not available:

```
1. Try to find user with required business_level
        ↓ (not found)
2. Apply secondary fallback strategy
        ↓ (not found)
3. Auto-assign to CLIENT ADMIN
        ↓ (not found)
4. Escalate to SUPER ADMIN
        ↓ (not found)
5. AUTO-APPROVE (ultimate safety net)
```

### Fallback Strategies

| Strategy | Behavior |
|----------|----------|
| `auto_assign_admin` | Assign to tenant admin |
| `escalate_to_owner` | Escalate to business owner |
| `escalate_to_super_admin` | Escalate to platform super admin |
| `skip_stage` | Skip this approval stage |
| `auto_approve` | Auto-approve the request |
| `block_and_notify` | Block and notify admins |
| `assign_to_initiator` | Assign back to creator (self-service) |

---

## 📊 Reporting Authority Selection

When creating a new user, the system enforces:

```javascript
// Filter to only show users with higher roles
eligibleReportingAuthorities = users.filter(u => 
  u.business_level > newUser.business_level
);
```

### Example

Creating a **Manager (L6)**:

| Available Users | Business Level | Eligible as Report-To? |
|-----------------|----------------|------------------------|
| CFO | L9 | ✅ Yes (9 > 6) |
| Ops Manager | L7 | ✅ Yes (7 > 6) |
| Another Manager | L6 | ❌ No (6 = 6) |
| Officer | L4 | ❌ No (4 < 6) |
| Staff | L1 | ❌ No (1 < 6) |

---

## 🎯 Quick Reference Card

| Action | Rule |
|--------|------|
| **Review** | Immediate superior (level + 1) |
| **Approve** | Same level or higher |
| **Assign Task** | Same level or lower |
| **Escalate** | Higher level only |
| **Report To** | Must be higher level |
| **Override** | Admin/Super Admin only |

---

## 📁 Related Documentation

- `/docs/SECURITY_VS_BUSINESS_HIERARCHY.md` - Detailed separation of concerns
- `/docs/MODULE_APPROVAL_HIERARCHY.md` - Module-specific approval flows
- `/my-backend/lib/businessHierarchy.js` - Backend implementation
- `/my-frontend/src/app/hr/user-creation/page.tsx` - UI for role hierarchy

