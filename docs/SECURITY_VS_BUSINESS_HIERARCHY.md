# Security vs Business Hierarchy - BISMAN ERP

## 🎯 One-Line Summary

> **Security decides what you can SEE. Business Level decides what you can APPROVE.**

---

## 📊 Two Separate Concepts

### 1️⃣ Security Access (UNCHANGED)

Security controls **what pages, modules, and data** a user can access.

| Security Level | Access Scope |
|----------------|--------------|
| `SUPER_ADMIN` | Full platform access |
| `ADMIN` | Single client/organization |
| `USER` | Single client/organization |

**Security is enforced by:**
- RBAC middleware
- Page permissions
- Module access control
- Tenant isolation

---

### 2️⃣ Business Hierarchy (NEW)

Business Level controls **workflow actions** like approvals, reviews, assignments, and escalations.

| Level | Roles | Description |
|-------|-------|-------------|
| **L10** | Super Admin | Platform-wide oversight |
| **L9** | Admin, CFO, System Administrator | Executive level |
| **L8** | Finance Controller, IT Admin | Senior controllers |
| **L7** | Operations Manager, Treasury | Operations leadership |
| **L6** | Compliance, Legal, Manager | Department heads |
| **L5** | Accounts, Banker | Senior staff |
| **L4** | Accounts Payable, Procurement Officer | Officers |
| **L3** | Branch Incharge, Store Incharge | Location heads |
| **L2** | Supervisor | Team leads |
| **L1** | Staff | Entry level |

---

## 🔐 Business Rules

### Who Can Review
```
Reviewer.business_level = Creator.business_level + 1
```
Only the **immediate superior** (one level above) can review.

### Who Can Approve
```
Approver.business_level >= Required_Approval_Level
```
Anyone at or above the required level can approve.

### Who Can Assign Tasks
```
Assigner.business_level >= Target.business_level
```
Can only assign to users at same or lower level.

### Who Can Escalate
```
Target.business_level > Escalator.business_level
```
Can only escalate to someone at a **higher** level.

---

## 📝 Example Workflow

```
Staff (L1) creates expense request
        ↓
Supervisor (L2) reviews (L1 + 1 = L2 ✓)
        ↓
Manager (L6) approves (required level met ✓)
        ↓
CFO (L9) gives final approval (for high amounts)
```

**Rules Enforced:**
- ✅ No lower level can approve higher-level actions
- ✅ No skipping review levels (unless configured)
- ✅ All users remain within same client scope (security)

---

## 💾 Database Schema

```sql
-- Column added to users_enhanced table
ALTER TABLE users_enhanced 
ADD COLUMN business_level INT NOT NULL DEFAULT 1;

-- Index for performance
CREATE INDEX idx_users_enhanced_business_level 
ON users_enhanced(business_level);
```

---

## 🛠️ Backend API

### Utility Functions

```javascript
const { 
  canReview,
  canApprove,
  canAssignTask,
  canEscalate,
  getBusinessLevelFromRole,
  requireApprovalLevel
} = require('../lib/businessHierarchy');

// Check if user can approve
if (canApprove(user.business_level, 6)) {
  // User can approve Manager-level requests
}

// Middleware for approval endpoints
router.post('/approve', 
  requireApprovalLevel(6), // Requires L6 or higher
  approveHandler
);
```

### User API Response

```json
{
  "id": 123,
  "name": "John Smith",
  "email": "john@example.com",
  "role": "Manager",
  "business_level": 6,
  "business_level_label": "L6"
}
```

---

## 🖥️ UI Requirements

### User Profile
- Show `Business Level (L1-L10)` badge
- Tooltip: "Business Level controls approvals and escalation only."

### Approval Screens
- Show approver's business level
- Show required level for approval
- Indicate if user has sufficient level

### User Management
- Business Level dropdown (L1-L10)
- Auto-suggest based on role

---

## ⚠️ Important Notes

1. **Security ≠ Business Level**
   - A USER with L9 business level can approve high-value requests
   - But they still can't access ADMIN-only pages

2. **Role Suggests Level**
   - Role name suggests default business level
   - But admin can override for individual users

3. **No Permission Escalation**
   - Business level NEVER grants page/module access
   - Only affects workflow actions

4. **Audit Trail**
   - All approvals log the approver's business level
   - Easy to audit approval chains

---

## 🧪 Testing Checklist

- [ ] Staff (L1) cannot approve anything
- [ ] Supervisor (L2) can only review L1 work
- [ ] Manager (L6) can approve up to L6 requests
- [ ] CFO (L9) can approve any request
- [ ] Lower level cannot approve higher-level action
- [ ] Escalation only goes upward
- [ ] Business level doesn't affect page access
- [ ] Security access unaffected by business level

---

## 📞 Support FAQ

**Q: Can a USER with high business level access admin pages?**
A: No. Security access is separate. Business level only affects approvals.

**Q: Who can change business levels?**
A: Only ENTERPRISE_ADMIN and SUPER_ADMIN.

**Q: What happens if business level is not set?**
A: Defaults to L1 (Staff level).

**Q: Can someone at L5 approve an L6 request?**
A: No. Must be at or above the required level.
