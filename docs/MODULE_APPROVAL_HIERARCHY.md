# Module-Aware Approval Hierarchy System

## Overview

BISMAN ERP uses a **Module-Aware Approval Hierarchy** that ensures:
- ✅ Approvals depend on **APPROVAL LEVELS**, not role names
- ✅ **No task ever gets stuck** (Admin fallback guarantee)
- ✅ **Module subscription** determines which approvals apply
- ✅ **Super Admin configurable** per module
- ✅ Works even if specific roles are missing

---

## One-Line Rule

> **"Modules decide which approvals apply. Business level decides who can approve. Admin is the final fallback."**

---

## Architecture

### 1. Security Levels (DO NOT CHANGE)
Security controls **where** users can go, not approvals.

| Security Level | Access |
|---------------|--------|
| `SUPER_ADMIN` | Full platform |
| `ADMIN` | Single client |
| `USER` | Single client |

⚠️ **Security levels must NOT be used in approval logic.**

### 2. Business Levels (Used for Approvals)
Each user has a `business_level` (L1–L10) that determines approval authority.

| Level | Name | Example Roles |
|-------|------|---------------|
| L10 | Super Admin | Platform Super Admin |
| L9 | Executive | Admin, CFO, Director |
| L8 | Controller | Finance Controller |
| L7 | Senior Manager | Operations Manager |
| L6 | Manager | HR Manager, Compliance Officer, Legal Head |
| L5 | Senior Officer | Senior officers |
| L4 | Officer | Procurement Officer, Accounts Payable |
| L3 | Incharge | Branch/Store/Hub Incharge |
| L2 | Supervisor | Team Supervisor |
| L1 | Staff | Entry-level staff |

### 3. Approval Levels (Abstract, Role-Independent)

| Level | Name | Description |
|-------|------|-------------|
| A1 | Review | Initial review by supervisor |
| A2 | Department Approval | Department/Manager approval |
| A3 | Final Approval | Executive/Admin final approval |
| A4 | Board Approval | Board-level approval (if needed) |

---

## Module-Based Configuration

### Default Approval Flows

#### Finance Module
```json
{
  "module": "Finance",
  "approval_flow": [
    { "approval_level": "A1", "min_business_level": 2, "name": "Review" },
    { "approval_level": "A2", "min_business_level": 6, "name": "Department Approval" },
    { "approval_level": "A3", "min_business_level": 9, "name": "Final Approval" }
  ]
}
```

#### Operations Module
```json
{
  "module": "Operations",
  "approval_flow": [
    { "approval_level": "A1", "min_business_level": 2, "name": "Review" },
    { "approval_level": "A2", "min_business_level": 7, "name": "Operations Approval" }
  ]
}
```

#### Procurement Module
```json
{
  "module": "Procurement",
  "approval_flow": [
    { "approval_level": "A1", "min_business_level": 2, "name": "Review" },
    { "approval_level": "A2", "min_business_level": 4, "name": "Procurement Approval" },
    { "approval_level": "A3", "min_business_level": 8, "name": "Finance Approval" }
  ]
}
```

---

## Approval Assignment Logic

### Core Engine Rules

1. **Find users** in the same client
2. **Filter users** where `user.business_level >= min_business_level`
3. If multiple users exist: **Pick the lowest eligible** (closest senior)
4. Assign approval task

### Missing Role Handling (NO DEADLOCK RULE)

If **no user matches** the approval criteria:
- **AUTO-FALLBACK → CLIENT ADMIN**
- Admin can approve any level
- This guarantees no task ever gets stuck

---

## Example Scenario

### Client Setup
- Staff (L1) ✓
- Supervisor (L2) ✓
- Manager (L6) ✗ **Missing**
- CFO (L9) ✗ **Missing**
- Admin (L9) ✓

### Finance Task Flow
```
Staff (L1) creates request
        ↓
Supervisor (L2) reviews (A1)
        ↓
Admin (L9) approves (A2)  ← Admin used because no L6 Manager
        ↓
Admin (L9) final approval (A3)
        ↓
    ✅ Completed
```

**Result:**
- ✔ No Manager needed
- ✔ No CFO needed
- ✔ Finance module respected
- ✔ Task completed successfully

---

## API Reference

### Get All Approval Flows
```http
GET /api/approval-flows
Authorization: Bearer <token>
```

### Get Approval Flow for Module
```http
GET /api/approval-flows/:moduleId
Authorization: Bearer <token>
```

### Update Approval Flow (Super Admin)
```http
PUT /api/approval-flows/:moduleId
Authorization: Bearer <token>
Content-Type: application/json

{
  "steps": [
    { "approval_level": "A1", "level_name": "Review", "min_business_level": 2, "step_order": 1 },
    { "approval_level": "A2", "level_name": "Manager Approval", "min_business_level": 6, "step_order": 2 }
  ]
}
```

### Preview Approval Chain
```http
POST /api/approval-flows/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "client-uuid",
  "moduleId": 2,
  "requesterId": 5
}
```

### Find Approver for Step
```http
POST /api/approval-flows/find-approver
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "client-uuid",
  "moduleId": 2,
  "approvalLevel": "A2",
  "excludeUserId": 5
}
```

### Get Eligible Approvers for Client
```http
GET /api/approval-flows/client/:clientId/eligible
Authorization: Bearer <token>
```

### Get Business Level Definitions
```http
GET /api/approval-flows/levels
Authorization: Bearer <token>
```

---

## Database Schema

### module_approval_flows
```sql
CREATE TABLE module_approval_flows (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    approval_level VARCHAR(10) NOT NULL,  -- A1, A2, A3, etc.
    level_name VARCHAR(100) NOT NULL,     -- "Review", "Department Approval"
    min_business_level INTEGER NOT NULL CHECK (min_business_level >= 1 AND min_business_level <= 10),
    step_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, approval_level)
);
```

### users_enhanced.business_level
```sql
ALTER TABLE users_enhanced ADD COLUMN business_level INTEGER NOT NULL DEFAULT 1;
CREATE INDEX idx_users_enhanced_business_level ON users_enhanced(business_level);
```

---

## Code Usage

### Using the Approval Engine

```javascript
const approvalEngine = require('./lib/approvalEngine');

// Build complete approval chain for a request
const chain = await approvalEngine.buildApprovalChain(
  clientId,    // Client UUID
  moduleId,    // Module ID (e.g., 2 for Finance)
  requesterId  // User making the request
);

// Find best approver for a specific step
const result = await approvalEngine.getApproverForStep(
  clientId,
  moduleId,
  'A2',  // Approval level
  { excludeUserId: requesterId }
);

if (result.isFallback) {
  console.log('Admin assigned as fallback');
}
```

### Using Middleware

```javascript
const { requireApprovalLevel } = require('./lib/approvalEngine');

// Protect route with approval level requirement
router.post('/approve', 
  authenticate,
  requireApprovalLevel('A2', (req) => req.body.moduleId),
  async (req, res) => {
    // User has required business level to approve at A2
    console.log('Approval context:', req.approvalContext);
  }
);
```

---

## UI Requirements

### Super Admin View
- Configure approval flow per module
- Set approval levels (A1, A2, A3...)
- Set minimum business level for each step
- View all modules with their configurations

### Client Admin View
- View approval flow (read-only)
- See fallback rule explanation
- Preview approval chain for requests

### Tooltip (Must Show)
> "Approvals are assigned based on business level and module subscription, not role names."

---

## Success Criteria

- ✅ No approval deadlocks
- ✅ No forced roles
- ✅ Module subscription respected
- ✅ Easy for non-technical users
- ✅ Secure and scalable
- ✅ Super Admin configurable

---

## Files

| File | Purpose |
|------|---------|
| `/lib/approvalEngine.js` | Core approval engine logic |
| `/routes/approvalFlowRoutes.js` | API routes for configuration |
| `/middleware/businessLevelProtection.js` | Security middleware for business_level |
| `/prisma/schema.prisma` | ModuleApprovalFlow model |
| `/docs/MODULE_APPROVAL_HIERARCHY.md` | This documentation |

---

## 🔒 Security: Business Level Protection

### Rules Enforced

1. **Only Admin/Super Admin/Enterprise Admin can change `business_level`**
2. **Users cannot change their own business_level**
3. **Users cannot set a level higher than their own** (except Enterprise Admin)
4. **All business_level changes are audit logged** (application + database trigger)

### Protected Routes

| Route | Protection |
|-------|------------|
| `PUT /api/enterprise-admin/users/:userId` | `protectBusinessLevel` middleware |
| `PUT /api/super-admin/users/:userId` | `business_level` stripped in service |
| `PATCH /api/internal/team/:userId` | `stripBusinessLevel` middleware |

### Database Trigger

A PostgreSQL trigger automatically logs all `business_level` changes:

```sql
CREATE TRIGGER trigger_log_business_level_change
  AFTER UPDATE ON users_enhanced
  FOR EACH ROW
  WHEN (OLD.business_level IS DISTINCT FROM NEW.business_level)
  EXECUTE FUNCTION log_business_level_change();
```

### Middleware Usage

```javascript
const { protectBusinessLevel, stripBusinessLevel } = require('../middleware/businessLevelProtection');

// Full protection with hierarchy enforcement
router.put('/users/:userId', protectBusinessLevel(), handler);

// Quick strip for routes that shouldn't allow business_level
router.patch('/profile', stripBusinessLevel, handler);
```
