# Global UX Rule: Entity Display Standards

## Overview

**Non-Negotiable Rule**: Every identifiable entity must display:
- **Human-readable Name** + **System-generated ID**

This applies across:
- UI (tables, cards, modals, dropdowns, tooltips)
- Notifications
- Audit logs
- APIs (response payloads)
- Exports (CSV, PDF)
- Search results

## Display Formats

### Primary Format (Recommended)
```
<Name>  •  <ID>
```
Examples:
- `Ravi Kumar • U-10234`
- `Vendor Payment Approval • TSK-78421`
- `Acme Logistics Pvt Ltd • CL-00987`

### Compact Format (Dense Views)
```
<Name> (ID)
```
Example: `Ravi Kumar (U-10234)`

### Badge Variant (Cards / Kanban)
```
Name
[ID]
```

## Entity Prefixes

| Entity | Prefix | Example |
|--------|--------|---------|
| User | U- | U-10234 |
| Task | TSK- | TSK-78421 |
| Client / Tenant | CL- | CL-00987 |
| Role | R- | R-ADMIN-03 |
| Department | DPT- | DPT-OPS-01 |
| Approval Instance | APR- | APR-55678 |
| Ticket / Query | Q- | Q-33211 |
| Organization | ORG- | ORG-00001 |
| Vendor | VND- | VND-00123 |
| Invoice | INV- | INV-00456 |
| Payment | PAY- | PAY-00789 |
| Order | ORD- | ORD-01234 |
| Product | PRD- | PRD-00567 |
| Notification | NTF- | NTF-00890 |
| Audit | AUD- | AUD-01234 |
| Session | SES- | SES-56789 |
| Report | RPT- | RPT-00234 |
| Workflow | WF- | WF-00345 |
| Clarification | CLR- | CLR-00456 |

**Rule**: IDs are immutable, never reused, and never hidden.

## Implementation Guide

### Frontend Usage

#### Import Utilities
```typescript
import { 
  formatDisplayLabel, 
  formatEntityId, 
  formatUserLabel,
  formatTaskLabel 
} from '@/lib/utils/entityDisplay';
```

#### Import Components
```typescript
import { 
  DisplayLabel, 
  UserLabel, 
  TaskLabel, 
  TaskIdBadge,
  ClientLabel 
} from '@/components/common/EntityDisplay';
```

#### Examples

**Display Label Component**
```tsx
<DisplayLabel 
  name="Ravi Kumar" 
  id={10234} 
  entityType="USER" 
/>
// Renders: Ravi Kumar • U-10234
```

**User Label Component**
```tsx
<UserLabel 
  user={{ id: 10234, firstName: 'Ravi', lastName: 'Kumar' }}
  showAvatar
  showRole
/>
// Renders: [Avatar] Ravi Kumar • U-10234 [Role Badge]
```

**Task Label Component**
```tsx
<TaskLabel 
  task={{ id: 78421, title: 'Vendor Payment Approval' }}
  showStatus
/>
// Renders: Vendor Payment Approval • TSK-78421 [Status]
```

**Task ID Badge**
```tsx
<TaskIdBadge id={78421} copyable />
// Renders: [TSK-78421] (clickable to copy)
```

### Backend Usage

#### Import Utilities
```javascript
const { 
  formatEntityId,
  formatDisplayLabel,
  addUserDisplayLabel,
  addTaskDisplayLabel,
  addDisplayLabelsToArray 
} = require('./utils/entityDisplay');
```

#### Add displayLabel to API Responses
```javascript
// Single user
router.get('/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json({
    ok: true,
    user: addUserDisplayLabel(user)
  });
});

// Array of users
router.get('/users', async (req, res) => {
  const users = await getUsers();
  res.json({
    ok: true,
    users: users.map(addUserDisplayLabel)
  });
});

// Task with nested user labels
router.get('/tasks/:id', async (req, res) => {
  const task = await getTaskById(req.params.id);
  res.json({
    ok: true,
    task: addTaskDisplayLabel(task)
  });
});
```

### API Response Contract

Every entity response **MUST** include:
```json
{
  "id": "TSK-78421",
  "name": "Vendor Payment Approval",
  "displayLabel": "Vendor Payment Approval • TSK-78421"
}
```

**Frontend must never compose IDs manually. Use `displayLabel` everywhere.**

## Search & Filtering

Search input must match:
- Name
- ID
- Partial ID

Examples:
- Searching `784` → returns `TSK-78421`
- Searching `Ravi` → `Ravi Kumar • U-10234`
- Searching `U-102` → same result

### Implementation
```typescript
import { matchesSearch } from '@/lib/utils/entityDisplay';

const filteredUsers = users.filter(user => 
  matchesSearch(user, searchQuery, 'USER')
);
```

## Files Modified/Created

### Frontend

| File | Purpose |
|------|---------|
| `src/lib/utils/entityDisplay.ts` | Core utility functions |
| `src/components/common/EntityDisplay.tsx` | Reusable display components |
| `src/types/task.ts` | Updated Task/TaskUser interfaces |
| `src/components/tasks/UserPicker.tsx` | Updated user selection dropdown |
| `src/components/tasks/TaskCard.tsx` | Updated task card with user IDs |
| `src/components/dashboard/TaskCard.tsx` | Updated dashboard task card |
| `src/app/tasks/clarifications/page.tsx` | Updated clarifications page |

### Backend

| File | Purpose |
|------|---------|
| `utils/entityDisplay.js` | Backend utility functions |

## Enforcement Checklist

Use this checklist for all new features:

- [ ] No name displayed without ID
- [ ] No dropdown without ID
- [ ] No notification without ID
- [ ] No audit log without ID
- [ ] API exposes displayLabel
- [ ] IDs immutable & indexed
- [ ] Search matches by ID and name

## Benefits

This rule provides:
- **Zero ambiguity** in approvals
- **Court-safe** audit logs
- **Faster support** debugging
- **Cleaner escalation** trails
- **Enterprise-grade traceability**

> **This is not a UI preference — it is a governance requirement.**

## Final Note

Treat ID visibility the same way banks treat account numbers:
- **Names help humans.**
- **IDs protect systems.**
