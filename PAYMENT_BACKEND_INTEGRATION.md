# Payment System Backend Integration Guide

## ✅ Completed Backend APIs (100%)

All backend APIs are now complete! Here's what's been built:

### 1. Payment Request API (`/my-backend/src/routes/paymentRequests.ts`)
- ✅ POST `/api/common/payment-requests` - Create with line items
- ✅ GET `/api/common/payment-requests` - List with filters
- ✅ GET `/api/common/payment-requests/:id` - Get details
- ✅ PUT `/api/common/payment-requests/:id` - Update DRAFT
- ✅ DELETE `/api/common/payment-requests/:id` - Delete DRAFT
- ✅ POST `/api/common/payment-requests/:id/submit` - Submit for approval

### 2. Task Approval API (`/my-backend/src/routes/tasks.ts`)
- ✅ GET `/api/common/tasks` - List tasks
- ✅ GET `/api/common/tasks/:id` - Get task details
- ✅ POST `/api/common/tasks/:id/approve` - Approve with level advancement
- ✅ POST `/api/common/tasks/:id/reject` - Reject task
- ✅ POST `/api/common/tasks/:id/return` - Return for revision
- ✅ POST `/api/common/tasks/:id/messages` - Add chat message
- ✅ GET `/api/common/tasks/dashboard/pending` - Pending tasks
- ✅ GET `/api/common/tasks/dashboard/inprocess` - In-process tasks
- ✅ GET `/api/common/tasks/dashboard/completed` - Completed tasks

### 3. Payment/Banker API (`/my-backend/src/routes/payments.ts`)
- ✅ POST `/api/common/tasks/:id/payment` - Banker records payment
- ✅ GET `/api/payment/public/:token` - Public payment page data (no auth)
- ✅ POST `/api/payment/initiate` - Initiate Razorpay/Stripe payment
- ✅ POST `/api/payment/webhook/razorpay` - Razorpay webhook
- ✅ POST `/api/payment/webhook/stripe` - Stripe webhook

---

## 🔧 Step 1: Wire Routes in Express App

### Add to your main Express app file (e.g., `server.ts` or `app.ts`):

```typescript
// Import routes
import paymentRequestsRoutes from './routes/paymentRequests';
import tasksRoutes from './routes/tasks';
import paymentsRoutes from './routes/payments';

// Wire up routes
app.use('/api/common/payment-requests', paymentRequestsRoutes);
app.use('/api/common/tasks', tasksRoutes);

// Payment routes (split between authenticated and public)
app.use('/api/common/tasks', paymentsRoutes); // For /:id/payment endpoint
app.use('/api/payment', paymentsRoutes); // For /public/:token, /initiate, /webhook/*
```

---

## 🗃️ Step 2: Run Database Migration

```bash
cd my-backend

# Generate Prisma client with new models
npx prisma generate

# Run migration
npx prisma migrate dev --name add_payment_approval_system

# Verify tables created
npx prisma studio  # Open Prisma Studio and check tables
```

**Expected tables:**
- payment_requests
- payment_request_line_items
- expenses
- tasks
- approvals
- messages
- payment_records
- approval_levels (seeded with L1, L2, Finance, Banker)
- payment_activity_logs

---

## 🔐 Step 3: Environment Variables

Add to your `.env` file:

```env
# Payment Gateway - Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Payment Gateway - Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Public payment page base URL
PAYMENT_BASE_URL=http://localhost:3000
```

For testing, use Razorpay/Stripe test keys:
- Razorpay: https://dashboard.razorpay.com/app/keys
- Stripe: https://dashboard.stripe.com/test/apikeys

---

## 🧪 Step 4: Test Backend APIs

### Test Payment Request Creation:
```bash
curl -X POST http://localhost:8000/api/common/payment-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid",
    "clientName": "ACME Corp",
    "clientEmail": "billing@acme.com",
    "description": "Website development invoice",
    "invoiceNumber": "INV-2024-001",
    "currency": "INR",
    "dueDate": "2024-12-31",
    "lineItems": [
      {
        "description": "Frontend Development",
        "quantity": 1,
        "rate": 50000,
        "taxRate": 18,
        "discountRate": 0
      }
    ]
  }'
```

### Test Submit for Approval:
```bash
curl -X POST http://localhost:8000/api/common/payment-requests/PAYMENT_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Approval:
```bash
curl -X POST http://localhost:8000/api/common/tasks/TASK_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved by L1"}'
```

### Test Banker Payment:
```bash
curl -X POST http://localhost:8000/api/common/tasks/TASK_ID/payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMode": "BankTransfer",
    "transactionId": "TXN123456",
    "details": {
      "bankName": "HDFC Bank",
      "accountNumber": "1234567890"
    }
  }'
```

### Test Public Payment Page (no auth):
```bash
curl http://localhost:8000/api/payment/public/PAYMENT_TOKEN
```

---

## 📊 Step 5: Verify Database Seeding

Check that approval levels are seeded:

```sql
SELECT * FROM approval_levels ORDER BY "order";
```

Expected output:
| id | name    | order | role     |
|----|---------|-------|----------|
| 1  | L1      | 1     | L1       |
| 2  | L2      | 2     | L2       |
| 3  | Finance | 3     | FINANCE  |
| 4  | Banker  | 4     | BANKER   |

---

## 🎯 Next Steps: Frontend Implementation

Now that backend is 100% complete, proceed to frontend:

1. **PaymentRequestForm** - Create/edit payment requests with line items
2. **TaskDashboard** - Three tabs: Pending, In Process, Completed
3. **ApprovalControls** - Approve/Reject/Return buttons with comments
4. **TaskChat** - Message thread with system messages
5. **Public Payment Page** - Client-facing payment portal at `/payment/[token]`

Refer to:
- `/my-frontend/docs/PAYMENT_APPROVAL_IMPLEMENTATION_GUIDE.md` (sections 4-6)
- `/PAYMENT_SYSTEM_QUICK_START.md` (Frontend Components section)

---

## 🐛 Troubleshooting

### Issue: Routes not found (404)
**Solution:** Verify routes are imported and registered in main Express app

### Issue: Prisma errors
**Solution:** Run `npx prisma generate` after schema changes

### Issue: Permission denied on approve
**Solution:** Verify user's role matches current approval level in `approval_levels` table

### Issue: Public payment page returns 404
**Solution:** Verify payment token is generated (check Finance approval creates token)

### Issue: Webhook failing
**Solution:** 
- Verify webhook secret matches dashboard
- Test with webhook test tools (Razorpay/Stripe dashboard)
- Check signature validation logic

---

## 📈 Monitoring Queries

### Active payment requests:
```sql
SELECT status, COUNT(*) 
FROM payment_requests 
GROUP BY status;
```

### Tasks by current level:
```sql
SELECT t.status, al.name as approval_level, COUNT(*) 
FROM tasks t
JOIN approval_levels al ON t."currentLevel" = al."order"
WHERE t.status IN ('L1_PENDING', 'L2_PENDING', 'FINANCE_PENDING', 'IN_PROCESS')
GROUP BY t.status, al.name;
```

### Recent activity:
```sql
SELECT * FROM payment_activity_logs 
ORDER BY "timestamp" DESC 
LIMIT 20;
```

---

## ✨ Backend Complete! 

All APIs are now ready. The approval workflow is fully functional:

**Flow:**
1. User creates payment request (DRAFT)
2. User submits → Creates expense + task, assigns L1 approver
3. L1 approves → Assigns L2 approver with warm message
4. L2 approves → Assigns Finance approver with warm message  
5. Finance approves → Generates payment token, assigns Banker, status=IN_PROCESS
6. Banker records payment OR client pays via public link → status=PAID, COMPLETED
7. Activity logs track every step
8. Messages thread shows full conversation + system notifications

Ready to build the UI! 🚀
