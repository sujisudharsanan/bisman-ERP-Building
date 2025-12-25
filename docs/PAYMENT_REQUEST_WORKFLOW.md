# Payment Request Workflow System

## Overview

The Payment Request Workflow implements a **task-style approval engine** for payment processing with:
- Amount-based routing logic
- Manager hierarchy chain resolution
- Role-based stage assignments
- Strict send-back rules (only to immediate previous level)
- Finance-origin rejection restrictions
- SLA-based escalation

## Business Rules

### 1. Amount-Based Routing

| Amount | Approval Flow |
|--------|---------------|
| ≤ ₹5,000 | Creator's Manager → Accounts Verification → Accounting Entry → Finance → CFO → Banker |
| > ₹5,000 | Creator's Manager → Manager's Manager → Accounts Verification → Accounting Entry → Finance → CFO → Banker |

### 2. Manager Resolution

```javascript
// For any payment request:
manager_1 = getReportingManager(creator_id)

// For amounts > ₹5,000:
manager_2 = getReportingManager(manager_1)
```

- Manager is resolved from `users.manager_id` or `users.reports_to`
- If no manager found, request goes directly to Accounts

### 3. Origin-Based Routing

| Origin Type | First Stage | Can Reject |
|-------------|-------------|------------|
| STAFF | Manager Approval | Current approver |
| MANAGER | Manager Approval | Current approver |
| FINANCE | Accounts Verification (skip managers) | Only Finance Controller/CFO |
| ACCOUNTS | Accounts Verification | Current approver |
| ADMIN | Manager Approval | Admin |

## Workflow Stages

### Stage Progression

```
DRAFT
  ↓ [Submit]
PAYMENT_REQUESTED
  ↓ [Auto-route based on amount]
MANAGER_APPROVAL (A1)
  ↓ [Approve] → If >₹5000 & manager_2 exists
MANAGER_2_APPROVAL (A2)
  ↓ [Approve]
ACCOUNTS_VERIFICATION (A3)
  ↓ [Verify]
ACCOUNTS_VERIFIED
  ↓ [Auto-advance]
ACCOUNTING_ENTRY_PENDING
  ↓ [Record Entry]
ACCOUNTING_ENTRY_COMPLETED
  ↓ [Auto-advance]
FINANCE_PENDING (A4)
  ↓ [Confirm]
FINANCE_CONFIRMED
  ↓ [Auto-advance]
CFO_PENDING (A5)
  ↓ [Approve]
CFO_APPROVED
  ↓ [Auto-advance]
BANKER_PENDING (A6)
  ↓ [Execute Payment]
PAYMENT_COMPLETED
```

### Stage Details

| Stage | Approval Level | Assigned To | SLA | Actions |
|-------|---------------|-------------|-----|---------|
| MANAGER_APPROVAL | A1 | Creator's Manager | 24h | Approve, Reject, Send Back |
| MANAGER_2_APPROVAL | A2 | Manager's Manager | 24h | Approve, Reject, Send Back |
| ACCOUNTS_VERIFICATION | A3 | Accountant | 8h | Verify, Reject, Send Back |
| ACCOUNTING_ENTRY_PENDING | - | Accountant | 4h | Record Entry, Send Back |
| FINANCE_PENDING | A4 | Finance Controller | 24h | Confirm, Reject, Send Back |
| CFO_PENDING | A5 | CFO | 48h | Approve, Reject, Send Back |
| BANKER_PENDING | A6 | Banker/Treasury | 24h | Execute Payment, Send Back |

## Send-Back Rules

### CRITICAL: Only Immediate Previous Level

```
BANKER_PENDING → CFO_PENDING (only)
CFO_PENDING → FINANCE_PENDING (only)
FINANCE_PENDING → ACCOUNTING_ENTRY (only)
ACCOUNTS_VERIFICATION → MANAGER_2_APPROVAL or MANAGER_APPROVAL (based on amount)
MANAGER_2_APPROVAL → MANAGER_APPROVAL (only)
```

**Example:** If CFO (L5) approves and Banker (L6) sends back, the request goes to CFO (L5) only. Banker cannot send back to Finance (L4) or below.

### Send-Back Implementation

```javascript
function getPreviousStage(currentStage, amount, requiresSecondManager) {
  switch (currentStage) {
    case 'BANKER_PENDING': return 'CFO_PENDING';
    case 'CFO_PENDING': return 'FINANCE_PENDING';
    case 'FINANCE_PENDING': return 'ACCOUNTING_ENTRY_PENDING';
    case 'ACCOUNTS_VERIFICATION':
      return requiresSecondManager && amount > 5000 
        ? 'MANAGER_2_APPROVAL' 
        : 'MANAGER_APPROVAL';
    case 'MANAGER_2_APPROVAL': return 'MANAGER_APPROVAL';
    default: return null; // Cannot send back
  }
}
```

## Rejection Rules

### Finance-Originated Requests

For requests created by Finance team members:
- **Only Finance Controller or CFO can reject**
- Other users (Managers, Accounts, Banker) can only send back

```javascript
if (originType === 'FINANCE') {
  if (!['Finance Controller', 'CFO'].includes(userRole)) {
    throw new Error('Only Finance Controller or CFO can reject finance-originated requests');
  }
}
```

## Visibility Rules

| Authority Level | Visibility |
|-----------------|------------|
| 10-50 (Staff/Officers) | Own requests + Requests awaiting their approval |
| 60-85 (Managers) | Own approvals + Subordinate requests |
| 90-100 (Admin) | All requests in tenant |

## SLA & Escalation

### SLA Configuration

| Stage | SLA Hours | Escalation Target |
|-------|-----------|-------------------|
| MANAGER_APPROVAL | 24 | Operations Manager |
| MANAGER_2_APPROVAL | 24 | CFO |
| ACCOUNTS_VERIFICATION | 8 | Finance Controller |
| ACCOUNTING_ENTRY | 4 | Accounts Manager |
| FINANCE_PENDING | 24 | CFO |
| CFO_PENDING | 48 | Admin |
| BANKER_PENDING | 24 | CFO |

### Escalation Process

1. **First Escalation**: On SLA breach, reassign to escalation target
2. **Secondary Escalation**: If still stuck after 24 hours, escalate to Admin
3. **Escalation does NOT bypass steps** - only reassigns approver

## API Endpoints

### List Endpoints

```
GET /api/payment-workflow              # List payment requests
GET /api/payment-workflow/pending      # Pending user's action
GET /api/payment-workflow/stats        # Dashboard statistics
GET /api/payment-workflow/:id          # Single request with permissions
GET /api/payment-workflow/:id/history  # Approval history
GET /api/payment-workflow/:id/stages   # All stages status
```

### Action Endpoints

```
POST /api/payment-workflow/:id/submit           # Submit for approval
POST /api/payment-workflow/:id/approve          # Approve current stage
POST /api/payment-workflow/:id/reject           # Reject request
POST /api/payment-workflow/:id/send-back        # Send to previous stage
POST /api/payment-workflow/:id/verify           # Accounts verification
POST /api/payment-workflow/:id/accounting-entry # Record accounting entry
POST /api/payment-workflow/:id/execute-payment  # Banker executes payment
```

## Database Schema

### Key Tables

1. **payment_requests** - Enhanced with workflow columns
2. **payment_request_approvals** - Audit trail
3. **payment_request_stages** - Stage assignments
4. **payment_workflow_sla_config** - SLA settings per tenant

### Key Columns Added to payment_requests

```sql
workflow_status       VARCHAR(50)   -- Current status
current_stage         VARCHAR(50)   -- Current stage
origin_type           VARCHAR(20)   -- STAFF/MANAGER/FINANCE/ACCOUNTS/ADMIN
creator_manager_id    UUID          -- Resolved first manager
creator_manager_2_id  UUID          -- Resolved second manager
requires_second_manager BOOLEAN     -- For amounts > 5000
current_approver_id   UUID          -- Current assigned approver
sla_deadline          TIMESTAMPTZ   -- SLA deadline
accounts_verified_by  UUID          -- Accounts verifier
finance_confirmed_by  UUID          -- Finance controller
cfo_approved_by       UUID          -- CFO
banker_executed_by    UUID          -- Banker
bank_transaction_id   VARCHAR(100)  -- Payment reference
```

## Usage Examples

### 1. Create and Submit Payment Request

```javascript
// Step 1: Create payment request (existing flow)
const pr = await createPaymentRequest({
  clientName: 'Vendor ABC',
  totalAmount: 10000,
  purpose: 'Office supplies',
  beneficiary_name: 'ABC Enterprises',
  // ... other fields
});

// Step 2: Submit for approval (triggers workflow)
const result = await fetch(`/api/payment-workflow/${pr.id}/submit`, {
  method: 'POST'
});
// Automatically routes to Manager → Manager's Manager based on amount
```

### 2. Manager Approves

```javascript
await fetch(`/api/payment-workflow/${id}/approve`, {
  method: 'POST',
  body: JSON.stringify({
    comment: 'Approved. Proceed with verification.'
  })
});
```

### 3. Accounts Verifies

```javascript
await fetch(`/api/payment-workflow/${id}/verify`, {
  method: 'POST',
  body: JSON.stringify({
    verified: true,
    note: 'Invoice verified. GST matches.'
  })
});
```

### 4. Banker Executes Payment

```javascript
await fetch(`/api/payment-workflow/${id}/execute-payment`, {
  method: 'POST',
  body: JSON.stringify({
    bankTransactionId: 'UTR1234567890',
    bankName: 'HDFC Bank',
    paymentMode: 'NEFT',
    note: 'Payment successful'
  })
});
```

## File Structure

```
my-backend/
├── services/
│   └── PaymentWorkflowService.js    # Core workflow logic
├── routes/
│   └── paymentWorkflowRoutes.js     # API endpoints
├── migrations/
│   └── 20251224_payment_request_workflow.sql  # Database schema
├── jobs/
│   └── paymentEscalationJob.js      # SLA escalation cron job
```

## Integration with Existing UI

**No UI changes required.** The workflow is enforced at the backend level:

1. Payment request list uses existing task approval UI patterns
2. Stage indicators follow A1-A6 convention
3. Timeline shows same format as task approvals
4. Actions (Approve/Reject/Send Back) work like task actions

## Cron Job Setup

Add to PM2 ecosystem or cron:

```javascript
// Every 15 minutes
const { runPaymentEscalation } = require('./jobs/paymentEscalationJob');
setInterval(runPaymentEscalation, 15 * 60 * 1000);

// Every hour (secondary escalation)
const { runSecondaryEscalation } = require('./jobs/paymentEscalationJob');
setInterval(runSecondaryEscalation, 60 * 60 * 1000);
```

## Success Criteria Checklist

- [x] Payment request behaves like a task
- [x] Small payments (≤₹5000) move fast (1 manager)
- [x] Large payments (>₹5000) are manager-controlled (2 managers)
- [x] Accounts acts as verifier, not approver
- [x] Finance → CFO → Banker flow is enforced
- [x] No UI refactor required
- [x] Auditable end-to-end trail
- [x] Send-back only to immediate previous level
- [x] Finance-origin rejection restrictions
- [x] SLA-based escalation
