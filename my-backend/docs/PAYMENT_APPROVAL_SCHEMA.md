# Payment Approval System - Database Schema

## Overview
Multi-level approval payment request system with task management, chat integration, and banker payment processing.

## Entity Relationship

```
PaymentRequest (1) ─── (N) PaymentRequestLineItem
     │
     ├─── (1) Expense
     │         └─── (1) Task
     │                  ├─── (N) Approval
     │                  ├─── (N) Message
     │                  └─── (N) PaymentRecord
     │
     └─── (N) PaymentActivityLog
```

## Tables

### payment_requests
Main payment request entity with client details, amounts, status workflow, and public payment link.

**Status Flow:**
- DRAFT → SUBMITTED → L1_PENDING → L2_PENDING → FINANCE_PENDING → SENT_TO_CLIENT → PAID → CLOSED

**Fields:**
- `requestId`: Auto-generated unique ID (e.g., PR-2025-11-01-0001)
- `clientName`, `clientEmail`, `clientPhone`: Client details
- `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`: Calculated amounts
- `paymentToken`: Secure token for public payment page
- `status`: Current workflow status
- `attachments`: JSON array of uploaded documents

### payment_request_line_items
Individual service/item lines within a payment request.

**Fields:**
- `description`: Service description
- `quantity`, `unit`, `rate`: Quantity and pricing
- `taxRate`, `discountRate`: Percentage rates
- `lineTotal`: Calculated line total
- `sortOrder`: Display order

### expenses
Created automatically from payment request for internal expense tracking.

### tasks
Approval workflow task with current level and assignee.

**Levels:**
- 0: L1 Manager (HUB_INCHARGE)
- 1: L2 Senior Manager (REGIONAL_MANAGER)
- 2: Finance Department (FINANCE_CONTROLLER)
- 3: Banker (BANKER)

**Status:**
- PENDING: Awaiting current level approval
- IN_PROCESS: Finance approved, banker processing
- COMPLETED: Payment recorded
- REJECTED: Rejected at any level
- RETURNED: Returned for revision

### approvals
Records each approval/rejection action with comment and attachments.

### messages
Chat messages associated with tasks. Types:
- TEXT: Regular message
- APPROVAL: Approval action message
- SYSTEM: Auto-generated system message
- PAYMENT: Payment confirmation message

### payment_records
Final payment details recorded by banker, including:
- Payment mode (BankTransfer, Cheque, Online, Razorpay, Stripe, Cash)
- Transaction ID
- Bank details
- Receipt URL
- Payment gateway info

### approval_levels
Configuration for approval hierarchy with role mapping.

### payment_activity_logs
Audit trail of all actions on payment request.

## Migration

Run migration:
```bash
cd my-backend
npx prisma migrate dev --name add_payment_approval_system
```

Or apply SQL directly:
```bash
psql $DATABASE_URL < prisma/migrations/add_payment_approval_system/migration.sql
```

## Seed Data

Approval levels are seeded automatically:
- Level 0: L1 Manager (HUB_INCHARGE)
- Level 1: L2 Senior Manager (REGIONAL_MANAGER)
- Level 2: Finance Department (FINANCE_CONTROLLER)
- Level 3: Banker (BANKER)

## Indexes

All foreign keys and frequently queried fields are indexed for performance:
- Payment request status, client, creator
- Task assignee, status, level
- Messages by task and type
- Payment records by transaction ID
- Activity logs by action and user

## JSON Fields

### attachments
```json
[
  {
    "name": "invoice.pdf",
    "url": "/uploads/...",
    "type": "application/pdf",
    "size": 102400
  }
]
```

### payment_records.details
```json
{
  "bankName": "HDFC Bank",
  "accountNumber": "xxxx1234",
  "ifscCode": "HDFC0001234",
  "reference": "TXN123456",
  "chequeNumber": "CH001234",
  "branch": "Mumbai Main"
}
```

### message.meta
```json
{
  "approveAction": "APPROVED",
  "level": 1,
  "amount": 50000,
  "nextApproverName": "John Doe",
  "nextApproverId": 5
}
```

## Security

- Public payment pages use secure random tokens (paymentToken)
- All file uploads should use signed URLs
- RBAC enforced at API level for approvals
- Activity logs track all changes
- Soft delete not implemented - use status changes instead

## Performance Considerations

- Indexes on all foreign keys and status fields
- JSON fields for flexible metadata (use sparingly in queries)
- Cascade deletes configured for cleanup
- Consider archiving old completed records after 1 year
