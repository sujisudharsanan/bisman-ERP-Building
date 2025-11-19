# Multi-Level Approval Payment System - Implementation Guide

## ✅ Phase 1: Database Schema (COMPLETED)

### What's Built:
- ✅ 9 Prisma models added to schema.prisma
- ✅ Migration SQL file created
- ✅ All relations and indexes configured
- ✅ Approval levels seed data included
- ✅ Schema documentation created

### Files Created:
- `/my-backend/prisma/schema.prisma` - Updated with payment models
- `/my-backend/prisma/migrations/add_payment_approval_system/migration.sql` - Migration SQL
- `/my-backend/docs/PAYMENT_APPROVAL_SCHEMA.md` - Schema documentation
- `/my-backend/src/utils/paymentRequestUtils.ts` - Helper functions
- `/my-backend/src/routes/paymentRequests.ts` - Payment request CRUD API

### Next Steps:
1. Run migration:
```bash
cd my-backend
npx prisma generate
npx prisma migrate dev --name add_payment_approval_system
```

2. Verify tables created:
```bash
psql $DATABASE_URL -c "\dt payment*"
psql $DATABASE_URL -c "SELECT * FROM approval_levels;"
```

---

## 🔄 Phase 2: Backend APIs (IN PROGRESS)

### Payment Request API (COMPLETED)
**File:** `/my-backend/src/routes/paymentRequests.ts`

Endpoints:
- ✅ POST `/api/common/payment-requests` - Create request
- ✅ GET `/api/common/payment-requests` - List with filters
- ✅ GET `/api/common/payment-requests/:id` - Get details
- ✅ PUT `/api/common/payment-requests/:id` - Update (DRAFT only)
- ✅ DELETE `/api/common/payment-requests/:id` - Delete (DRAFT only)
- ✅ POST `/api/common/payment-requests/:id/submit` - Submit for approval

Features:
- Auto-generates request ID (PR-YYYY-MM-DD-XXXX)
- Calculates line item totals
- Creates expense + task on submit
- Assigns to L1 approver
- Activity logging

### Task & Approval API (TO BUILD)
**File:** `/my-backend/src/routes/tasks.ts`

Create these endpoints:
```typescript
// Task management
GET /api/common/tasks?status=pending&assigneeId=:userId
GET /api/common/tasks/:id
POST /api/common/tasks/:id/messages
POST /api/common/tasks/:id/approve
POST /api/common/tasks/:id/reject
POST /api/common/tasks/:id/return

// Dashboard
GET /api/common/dashboard/pending
GET /api/common/dashboard/inprocess
GET /api/common/dashboard/completed
```

Key logic for approval:
```typescript
// When L1/L2 approves:
1. Create Approval record
2. Find next approver
3. Update task: assigneeId = next, currentLevel++
4. Create system message with warm template
5. Notify next approver

// When Finance approves:
1. Create Approval record
2. Find banker user
3. Update task: assigneeId = banker, status = IN_PROCESS
4. Generate payment token
5. Update payment request status = SENT_TO_CLIENT
6. Send payment link to client

// When rejected/returned:
1. Create Approval record
2. Update task status = REJECTED/RETURNED
3. Update expense status = CANCELLED/DRAFT
4. Notify creator
```

### Payment API (TO BUILD)
**File:** `/my-backend/src/routes/payments.ts`

```typescript
// Banker records payment
POST /api/common/tasks/:id/payment
Body: {
  paidById, paymentMode, transactionId,
  details, paidAt, receiptUrl, notes
}
Actions:
- Create PaymentRecord
- Update task status = COMPLETED
- Update expense status = COMPLETED
- Update payment request status = PAID
- Create payment message
- Notify all stakeholders

// Public payment page
GET /api/payment/public/:token
Returns payment request details for client payment page

// Webhook handlers
POST /api/payment/webhook/razorpay
POST /api/payment/webhook/stripe
Actions:
- Verify signature
- Find payment by orderId/token
- Create PaymentRecord
- Update statuses
- Send confirmation
```

---

## 📱 Phase 3: Frontend Components (TO BUILD)

### Directory Structure:
```
my-frontend/
├── src/
│   ├── app/
│   │   ├── common/
│   │   │   ├── payment-requests/
│   │   │   │   ├── page.tsx              # List page
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx          # Create form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Detail/edit page
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx              # Task dashboard (Pending/InProcess/Completed)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Task chat page
│   │   ├── payment/
│   │   │   └── [token]/
│   │   │       └── page.tsx              # Public payment page
│   ├── components/
│   │   ├── common/
│   │   │   ├── PaymentRequestForm.tsx    # Create/edit form
│   │   │   ├── LineItemTable.tsx         # Editable line items
│   │   │   ├── TaskList.tsx              # Task cards with tabs
│   │   │   ├── TaskItem.tsx              # Single task card
│   │   │   ├── TaskChatWrapper.tsx       # Chat integration
│   │   │   ├── ApprovalControls.tsx      # Approve/Reject/Return UI
│   │   │   ├── PaymentModal.tsx          # Banker payment form
│   │   │   └── ActivityTimeline.tsx      # Activity log display
```

### Priority Components:

#### 1. PaymentRequestForm.tsx
```typescript
// Key features:
- Client autocomplete
- Editable line items table (add/remove rows)
- Real-time total calculation
- File upload for attachments
- Draft save + Submit button
- Validation
```

#### 2. TaskList.tsx
```typescript
// Three tabs:
- Pending (assigned to current user)
- In Process (finance approved, banker working)
- Completed (paid)

// Features:
- Real-time polling/websocket updates
- Status badges (color-coded)
- Quick filters
- Click to open chat
```

#### 3. TaskChatWrapper.tsx
```typescript
// Integrates with existing chat component
- Maps Message → ChatMessage
- Approval messages styled differently
- System messages in gray
- Attachments downloadable
- Send message + attachments
- Approval controls at bottom (if assigned to user)
```

#### 4. ApprovalControls.tsx
```typescript
// Shows when task assigned to current user
- Approve button (green)
- Reject button (red)
- Return button (yellow)
- Comment text area
- Attach files
- Preview next approver name
- Warm message template preview
```

#### 5. PublicPaymentPage.tsx
```typescript
// Client-facing page (/payment/:token)
- Company logo + branding
- Payment request summary
- Line items table
- Total (large, bold)
- Payment methods:
  - Razorpay/Stripe button
  - Bank transfer details
  - Copy buttons
- Download invoice PDF
- SSL badge
- Help/contact section
- Terms + privacy footer
```

---

## 🎨 UI/UX Guidelines

### Design System:
- **Colors:**
  - Draft: Gray-200
  - Pending: Yellow-400
  - In Process: Blue-500
  - Approved: Green-500
  - Rejected: Red-500
  - Completed: Green-600

- **Typography:**
  - Headings: Inter/System font, bold
  - Body: 14-16px, line-height 1.5
  - Amounts: Bold, 1.5x larger
  - Request IDs: Monospace

- **Spacing:**
  - Cards: p-6, rounded-lg, shadow-sm
  - Lists: gap-4
  - Forms: gap-6
  - Buttons: px-6 py-3

### Responsive Breakpoints:
- Mobile: < 768px (single column, stacked buttons)
- Tablet: 768-1024px (2 columns)
- Desktop: > 1024px (3 columns, sidebar)

### Dark Mode:
- All components use Tailwind dark: classes
- Chat messages alternate bg-gray-100/dark:bg-gray-800
- Status badges adjust opacity

---

## 🔐 Security & RBAC

### Permission Checks:
```typescript
// Create request: any authenticated user
canCreate: authenticated

// View request: creator OR approver OR finance OR banker
canView: req.userId === request.createdById
      || req.userId === task.assigneeId
      || hasRole(['FINANCE_CONTROLLER', 'BANKER'])

// Approve: current assignee only (unless admin override)
canApprove: req.userId === task.assigneeId
         && req.role === approvalLevel.roleName

// Edit: creator + DRAFT status only
canEdit: req.userId === request.createdById
      && request.status === 'DRAFT'

// Record payment: banker role + task assigned to them
canPay: req.role === 'BANKER'
     && task.assigneeId === req.userId
     && task.status === 'IN_PROCESS'
```

### File Upload Security:
- Signed URLs for all attachments
- 10MB file size limit
- Allowed types: PDF, PNG, JPG, XLSX, DOC
- Store in `/uploads/payment-requests/:id/`
- S3/cloud storage recommended for production

---

## 📬 Notifications

### Trigger Points:
1. **Request Submitted** → L1 Approver
2. **L1 Approved** → L2 Approver
3. **L2 Approved** → Finance
4. **Finance Approved** → Banker + Client (payment link)
5. **Rejected/Returned** → Creator
6. **Payment Completed** → Creator + All approvers

### Notification Channels:
- In-app: Bell icon + badge count
- Email: Transaction emails
- SMS: For high-value requests (> ₹100,000)
- WhatsApp: Optional, for urgent approvals

### Template Example:
```typescript
// Email template for L1 approval:
Subject: [Action Required] Payment Request ${requestId} - ₹${amount}

Hi ${approverName},

A new payment request requires your approval:

Request ID: ${requestId}
Client: ${clientName}
Amount: ₹${amount}
Due Date: ${dueDate}
Created by: ${creatorName}

[View & Approve] [View Details]

---
```

---

## 🧪 Testing Checklist

### Unit Tests:
- [ ] calculateLineTotal() with various tax/discount combinations
- [ ] generatePaymentRequestId() uniqueness
- [ ] isValidStatusTransition() for all states
- [ ] warmApproveMessage() template formatting

### Integration Tests:
- [ ] Create payment request → verify DB records
- [ ] Submit request → task created + assignee set
- [ ] L1 approve → L2 assigned + message created
- [ ] Finance approve → banker assigned + token generated
- [ ] Banker payment → all statuses updated
- [ ] Reject flow → creator notified
- [ ] Return flow → status reverted to DRAFT

### E2E Tests (Playwright/Cypress):
```typescript
test('Full approval flow', async () => {
  // Login as creator
  await createPaymentRequest({
    client: 'Test Corp',
    amount: 50000,
    lineItems: [...]
  });
  
  // Login as L1
  await approvePendingTask();
  
  // Login as L2
  await approvePendingTask();
  
  // Login as Finance
  await approvePendingTask();
  
  // Login as Banker
  await recordPayment({
    mode: 'BankTransfer',
    txnId: 'TXN123'
  });
  
  // Verify completed
  expect(await getTaskStatus()).toBe('COMPLETED');
});
```

---

## 🚀 Deployment Steps

### 1. Database Migration:
```bash
cd my-backend
npx prisma generate
npx prisma migrate deploy
```

### 2. Environment Variables:
```bash
# Add to .env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_BASE_URL=https://yourdomain.com
FILE_UPLOAD_PATH=/uploads/payment-requests
FILE_UPLOAD_MAX_SIZE=10485760  # 10MB
NOTIFICATION_EMAIL_FROM=noreply@yourdomain.com
NOTIFICATION_SMS_ENABLED=false
```

### 3. Backend Routes:
```typescript
// In my-backend/src/index.ts or app.ts
import paymentRequestsRouter from './routes/paymentRequests';
import tasksRouter from './routes/tasks';
import paymentsRouter from './routes/payments';

app.use('/api/common/payment-requests', paymentRequestsRouter);
app.use('/api/common/tasks', tasksRouter);
app.use('/api/payment', paymentsRouter);
```

### 4. Frontend Page Registry:
```typescript
// Add to src/common/config/page-registry.ts
{
  id: 'payment-requests',
  name: 'Payment Requests',
  path: '/common/payment-requests',
  icon: Receipt,
  module: 'common',
  permissions: ['common:payment-requests'],
  roles: ['SUPER_ADMIN', 'HUB_INCHARGE', 'REGIONAL_MANAGER', 'FINANCE_CONTROLLER'],
  status: 'active',
  description: 'Create and manage payment requests',
  order: 10,
},
{
  id: 'task-approvals',
  name: 'My Approvals',
  path: '/common/tasks',
  icon: CheckCircle,
  module: 'common',
  permissions: ['common:approvals'],
  roles: ['SUPER_ADMIN', 'HUB_INCHARGE', 'REGIONAL_MANAGER', 'FINANCE_CONTROLLER', 'BANKER'],
  status: 'active',
  description: 'Pending approval tasks',
  order: 11,
  badge: 'dynamic', // Show count of pending tasks
},
```

### 5. Run export script:
```bash
cd my-backend
node scripts/export-page-registry.js
```

---

## 📊 Monitoring & Analytics

### Metrics to Track:
- Average approval time per level
- Rejection rate by level
- Payment completion rate
- Time from request to payment
- Value of requests by status
- Top clients by request count

### Dashboard Queries:
```sql
-- Approval bottlenecks
SELECT currentLevel, AVG(EXTRACT(EPOCH FROM (updatedAt - createdAt))/3600) as avg_hours
FROM tasks
WHERE status = 'COMPLETED'
GROUP BY currentLevel;

-- Rejection analysis
SELECT levelName, COUNT(*) as rejections
FROM approvals
WHERE action = 'REJECTED'
GROUP BY levelName;

-- Payment mode distribution
SELECT paymentMode, COUNT(*), SUM(amount)
FROM payment_records
GROUP BY paymentMode;
```

---

## 🐛 Common Issues & Fixes

### Issue: Task not appearing in Pending
**Cause:** assigneeId not set or user role mismatch
**Fix:** Verify approvalLevel.roleName matches user.role exactly

### Issue: Cannot approve task
**Cause:** User not the current assignee
**Fix:** Check task.assigneeId === req.user.id

### Issue: Payment link not working
**Cause:** Token not generated or expired
**Fix:** Regenerate token on finance approval

### Issue: Notifications not sending
**Cause:** Email/SMS service not configured
**Fix:** Check environment variables and service credentials

---

## 📚 Next Implementation Steps

### Immediate (This Session):
1. ✅ Database schema
2. ✅ Payment request CRUD API
3. ⏳ Task approval API (next)
4. ⏳ Payment API (next)

### Short Term (Next Session):
5. Frontend components
6. Public payment page
7. Notification system
8. Testing

### Future Enhancements:
- Multi-currency support
- Payment installments
- Recurring payments
- Auto-reminders for overdue
- Approval delegation
- Bulk approvals
- Mobile app
- Analytics dashboard

---

## 🆘 Support Resources

- **Schema Docs:** `/my-backend/docs/PAYMENT_APPROVAL_SCHEMA.md`
- **API Docs:** Auto-generated from routes (add Swagger)
- **Component Library:** Storybook for all payment components
- **Testing:** Run `npm test` in backend and frontend

For questions or issues, refer to the inline code comments or create a ticket in your project management system.

---

**Status:** Phase 1 Complete | Phase 2 In Progress (60%) | Phase 3 Pending
**Last Updated:** 2025-11-01
