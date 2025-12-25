# Settlement Workflow Implementation Summary

## Overview

This document describes the implementation of the Settlement workflow system per the **MASTER IMPLEMENTATION PROMPT** requirements. The implementation provides role-segregated payment execution with strict visibility controls, partial disallow mechanism, and fail recovery.

## Key Business Rules Implemented

### 1. Role Segregation (CRITICAL)
- **Accountant is the ONLY role** who can see individual payment requests after approval
- **Non-accountants** (Finance Controller, CFO, Banker) see **ONE settlement task** only
- The **Task Approval Kanban does NOT change** - different roles see different views

### 2. Partial Disallow Mechanism (NEW)
- **Finance Controller & CFO** can review settlement items
- They can **untick items to disallow** - disallowed items return to Accountant queue
- They **CANNOT edit amounts** - only allow or disallow entire items
- Full audit trail of who disallowed, when, and why

### 3. Fail Recovery (NEW)
- Settlements can be marked as **FAILED** (bank errors, insufficient funds)
- All linked requests revert to **QUEUED_FOR_SETTLEMENT**
- **Retry mechanism** available for failed settlements
- Accountant is notified of failures

### 4. Payment Request States (Extended)
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/PARTIALLY_APPROVED 
      → ACCOUNTED → QUEUED_FOR_SETTLEMENT → SETTLED → PAID
```

New States Added:
- `ACCOUNTED` - Accounting entry created
- `QUEUED_FOR_SETTLEMENT` - Added to settlement batch
- `SETTLED` - Bank transaction initiated
- `PARTIALLY_SETTLED` - Partial payment received, more owed

### 5. Settlement States
```
DRAFT → SUBMITTED_TO_FINANCE → FINANCE_CONTROLLER_APPROVED 
      → CFO_APPROVED → SENT_TO_BANK → PAID
                                    ↓
                                 FAILED → (retry) → SENT_TO_BANK
```

### 6. UTR Correction
- UTR can be corrected **only before PAID status**
- All corrections logged with reason
- Full audit trail maintained

---

## Files Created/Modified

### Database Migrations

1. **`/my-backend/prisma/migrations/20251225_settlement_schema/migration.sql`**
   - `settlements` table
   - `settlement_line_items` table
   - `payment_request_partial_payments` table
   - `settlement_approvals` table

2. **`/my-backend/prisma/migrations/20251225_partial_disallow_schema/migration.sql`** (NEW)
   - `settlement_disallow_history` table
   - `utr_correction_history` table
   - `settlement_failure_history` table
   - Disallow columns on `settlement_line_items`
   - FAILED status support
   - Functions for partial disallow processing

### Services

1. **`/my-backend/services/SettlementService.js`** (~1750 lines)
   - Role-based views
   - **NEW:** `getSettlementReviewItems()` - FC/CFO review mode
   - **NEW:** `partialDisallowItems()` - Disallow items during review
   - **NEW:** `approveWithPartialDisallow()` - Approve with optional disallow
   - **NEW:** `markSettlementFailed()` - Handle payment failures
   - **NEW:** `retryFailedSettlement()` - Retry failed settlements
   - **NEW:** `correctUTR()` - UTR correction before PAID

2. **`/my-backend/services/PaymentWorkflowServiceV2.js`**
   - Enhanced state machine with `PARTIALLY_SETTLED`

### Routes

1. **`/my-backend/routes/settlementRoutes.js`** (~680 lines)
   - Full REST API for settlement operations
   - **NEW:** `GET /:id/review-items` - FC/CFO review mode
   - **NEW:** `POST /:id/partial-disallow` - Disallow items
   - **NEW:** `POST /:id/approve-with-disallow` - Approve with disallow
   - **NEW:** `POST /:id/mark-failed` - Mark as failed
   - **NEW:** `POST /:id/retry` - Retry failed settlement
   - **NEW:** `POST /:id/correct-utr` - Correct UTR

---

## API Endpoints

### Settlement API (`/api/settlements`)

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/my-role` | GET | All | Get current user's settlement role |
| `/pending-requests` | GET | Accountant | List approved requests pending settlement |
| `/request/:id/partial-history` | GET | Accountant | Get partial payment history |
| `/` | POST | Accountant | Create new settlement |
| `/:id/submit` | POST | Accountant | Submit to Finance Controller |
| `/:id/review-items` | GET | FC/CFO | **Get items for review mode** |
| `/:id/partial-disallow` | POST | FC/CFO | **Disallow specific items** |
| `/:id/approve-with-disallow` | POST | FC/CFO | **Approve with optional disallow** |
| `/:id/finance-approve` | POST | FC | Approve settlement |
| `/:id/cfo-approve` | POST | CFO | Approve settlement |
| `/:id/send-to-bank` | POST | CFO/Banker | Send to bank |
| `/:id/execute` | POST | Banker | Execute payment, enter UTR |
| `/:id/mark-failed` | POST | Banker/Admin | **Mark settlement as failed** |
| `/:id/retry` | POST | Banker/Admin | **Retry failed settlement** |
| `/:id/correct-utr` | POST | Banker/Admin | **Correct UTR (before PAID)** |
| `/:id/reject` | POST | All Approvers | Reject with reason |
| `/tasks` | GET | All | Get settlements (role-based view) |
| `/:id` | GET | All | Get settlement details (role-based) |
| `/trace/utr/:utr` | GET | All | Trace requests by UTR |

---

## Partial Disallow Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FC/CFO OPENS SETTLEMENT FOR REVIEW                   │
├─────────────────────────────────────────────────────────────────────────┤
│  GET /api/settlements/:id/review-items                                  │
│                                                                         │
│  Returns:                                                               │
│  - List of items with checkboxes (default: checked)                     │
│  - ❌ NO amount editing capability                                      │
│  - Summary: total items, allowed amount, disallowed amount              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FC/CFO REVIEWS AND UNTICKS ITEMS                   │
├─────────────────────────────────────────────────────────────────────────┤
│  UI shows:                                                              │
│  ☑ Item 1 - Vendor A - ₹50,000                                         │
│  ☐ Item 2 - Vendor B - ₹30,000  ← DISALLOWED                           │
│  ☑ Item 3 - Vendor C - ₹20,000                                         │
│                                                                         │
│  ❌ Cannot change amounts                                               │
│  ✅ Can only check/uncheck items                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FC/CFO SUBMITS APPROVAL                            │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /api/settlements/:id/approve-with-disallow                        │
│  Body: {                                                                │
│    disallowedItemIds: ["item-2-uuid"],                                  │
│    reason: "Vendor B invoice disputed",                                 │
│    comment: "Approved remaining items"                                  │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM PROCESSES                                │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Disallowed items:                                                   │
│     - Marked as is_disallowed = true                                    │
│     - Payment request reverted to APPROVED/PARTIALLY_SETTLED            │
│     - Returned to Accountant queue                                      │
│     - Disallow history recorded                                         │
│                                                                         │
│  2. Settlement:                                                         │
│     - total_amount recalculated                                         │
│     - disallowed_amount tracked                                         │
│     - Proceeds to next approval stage                                   │
│                                                                         │
│  3. Audit:                                                              │
│     - Who disallowed                                                    │
│     - Role                                                              │
│     - Reason                                                            │
│     - Amounts before/after                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fail Recovery Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BANKER ATTEMPTS PAYMENT                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Settlement is SENT_TO_BANK                                             │
│  Banker initiates bank transfer                                         │
│  Bank returns: INSUFFICIENT_FUNDS / ACCOUNT_BLOCKED / ERROR             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MARK SETTLEMENT AS FAILED                            │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /api/settlements/:id/mark-failed                                  │
│  Body: {                                                                │
│    failureCode: "INSUFFICIENT_FUNDS",                                   │
│    failureReason: "Bank account balance insufficient",                  │
│    failureSource: "BANK"                                                │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM PROCESSES                                │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Settlement → FAILED                                                 │
│  2. All linked requests → QUEUED_FOR_SETTLEMENT                         │
│  3. Failure history recorded                                            │
│  4. Accountant notified (TODO)                                          │
│  5. retry_count incremented                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    RETRY OR CANCEL                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Option A: POST /api/settlements/:id/retry                              │
│  - Settlement → SENT_TO_BANK                                            │
│  - Ready for another attempt                                            │
│                                                                         │
│  Option B: POST /api/settlements/:id/reject                             │
│  - Settlement → CANCELLED                                               │
│  - Requests released back to Accountant                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (New Tables)

### settlement_disallow_history
```sql
CREATE TABLE settlement_disallow_history (
  id UUID PRIMARY KEY,
  settlement_id UUID,
  line_item_id UUID,
  payment_request_id VARCHAR(255),
  request_number VARCHAR(50),
  vendor_name VARCHAR(255),
  amount_disallowed DECIMAL(18,2),
  disallowed_by UUID,
  disallowed_by_name VARCHAR(255),
  disallowed_role VARCHAR(50),  -- 'FINANCE_CONTROLLER' or 'CFO'
  reason TEXT,
  settlement_total_before DECIMAL(18,2),
  settlement_total_after DECIMAL(18,2),
  request_status_before VARCHAR(50),
  request_status_after VARCHAR(50),
  tenant_id UUID,
  created_at TIMESTAMP
);
```

### utr_correction_history
```sql
CREATE TABLE utr_correction_history (
  id UUID PRIMARY KEY,
  settlement_id UUID,
  old_utr VARCHAR(100),
  new_utr VARCHAR(100),
  corrected_by UUID,
  corrected_by_name VARCHAR(255),
  corrected_role VARCHAR(50),
  correction_reason TEXT,
  settlement_status VARCHAR(50),
  tenant_id UUID,
  created_at TIMESTAMP
);
```

### settlement_failure_history
```sql
CREATE TABLE settlement_failure_history (
  id UUID PRIMARY KEY,
  settlement_id UUID,
  failure_code VARCHAR(50),
  failure_reason TEXT,
  failure_source VARCHAR(50),  -- 'BANK', 'SYSTEM', 'MANUAL'
  status_before VARCHAR(50),
  utr_number VARCHAR(100),
  bank_reference VARCHAR(100),
  reported_by UUID,
  reported_by_name VARCHAR(255),
  recovery_action VARCHAR(50),
  recovered_at TIMESTAMP,
  recovered_by UUID,
  tenant_id UUID,
  created_at TIMESTAMP
);
```

---

## Permission Matrix

| Role | View Requests | Create Settlement | Disallow Items | Edit Amounts | Approve | Execute | Mark Failed |
|------|---------------|-------------------|----------------|--------------|---------|---------|-------------|
| Accountant | ✅ Full | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Finance Controller | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| CFO | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Banker | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Migration Instructions

1. **Run migrations:**
   ```bash
   cd my-backend
   npx prisma migrate deploy
   ```

2. **Or run SQL directly:**
   ```bash
   # First migration (if not already run)
   psql -d your_database -f prisma/migrations/20251225_settlement_schema/migration.sql
   
   # Second migration (partial disallow)
   psql -d your_database -f prisma/migrations/20251225_partial_disallow_schema/migration.sql
   ```

3. **Verify routes:**
   ```bash
   grep "Settlement routes" /path/to/logs
   ```

---

## Testing Checklist

### Partial Disallow
- [ ] FC can view review items with checkboxes
- [ ] FC can disallow items (items return to Accountant queue)
- [ ] FC cannot edit amounts
- [ ] CFO can disallow items previously allowed by FC
- [ ] Disallowed items have full audit trail
- [ ] Settlement total recalculates correctly

### Fail Recovery
- [ ] Banker can mark settlement as FAILED
- [ ] All linked requests revert to QUEUED_FOR_SETTLEMENT
- [ ] Retry moves settlement back to SENT_TO_BANK
- [ ] Failure history is recorded
- [ ] retry_count increments correctly

### UTR Correction
- [ ] UTR can be corrected before PAID
- [ ] UTR cannot be corrected after PAID
- [ ] Correction history is recorded

### Audit Trail
- [ ] All actions log actor, role, timestamp
- [ ] Amounts before/after are recorded
- [ ] UTR trace shows complete payment chain
