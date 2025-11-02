# 🚀 Approval Flow - Quick Reference Guide

## 📋 Current Implementation Status

### ✅ What's Working (85% Complete)

| Feature | Status | Quality |
|---------|--------|---------|
| Approval level logic | ✅ Working | 🟢 Excellent |
| Warm approval messages | ✅ Working | 🟢 Excellent |
| Chat thread system | ✅ Working | 🟢 Excellent |
| File attachment handling | ✅ Working | 🟢 Good |
| Approver selection | 🟡 Partial | 🟡 Needs work |

---

## 🔄 Approval Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER: Creates Payment Request                              │
│  Status: DRAFT                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  USER: Submits for Approval                                 │
│  Status: DRAFT → SUBMITTED                                  │
│  • Creates Expense record                                   │
│  • Creates Task (currentLevel=0)                            │
│  • Assigns to MANAGER (L1)                                  │
│  • Sends warm message                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  MANAGER (L1): Reviews Request                              │
│  • Can approve or reject                                    │
│  • Can ask questions in chat                                │
│  • Can view attachments                                     │
└──────────┬──────────────────────┬─────────────────────────┘
           │                      │
      APPROVE                  REJECT
           │                      │
           ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Move to L2          │   │  Return to Creator   │
│  currentLevel++      │   │  Status: REJECTED    │
│  Assign to ADMIN     │   │  Creator can edit    │
│  Warm message sent   │   │  and resubmit        │
└──────┬───────────────┘   └──────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (L2): Reviews Request                                │
│  • Second level approval                                    │
│  • Same review capabilities                                 │
└──────────┬──────────────────────┬─────────────────────────┘
           │                      │
      APPROVE                  REJECT
           │                      │
           ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Move to L3          │   │  Return to Creator   │
│  currentLevel++      │   │  Status: REJECTED    │
│  Assign to           │   │                      │
│  SUPER_ADMIN         │   │                      │
└──────┬───────────────┘   └──────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPER_ADMIN (L3): Final Approval                           │
│  • Third level approval                                     │
│  • Highest authority                                        │
└──────────┬──────────────────────┬─────────────────────────┘
           │                      │
      APPROVE                  REJECT
           │                      │
           ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Process Payment     │   │  Return to Creator   │
│  Status: APPROVED    │   │  Status: REJECTED    │
│  → PAID              │   │                      │
│  TXN ID generated    │   │                      │
└──────────────────────┘   └──────────────────────┘
```

---

## 📊 Approval Hierarchy

```
Role Hierarchy (User → Client Admin → Super Admin → Enterprise Admin)
═══════════════════════════════════════════════════════════════════

Level -1: USER                    (Submitter - No approval power)
          ↓
Level 0:  MANAGER/STAFF          (L1 Approval - Up to ₹10,000)
          ↓
Level 1:  ADMIN                  (L2 Approval - Up to ₹50,000)
          ↓
Level 2:  SUPER_ADMIN            (L3 Approval - Up to ₹500,000)
          ↓
Level 3:  ENTERPRISE_ADMIN       (L4 Approval - Unlimited) ⚠️ TODO
```

---

## 💬 Warm Message Examples

### 1. Creation Message
```
Payment request created for Acme Corporation. 
Amount: ₹50,000.00. 
Assigned to @john.doe for L1 approval.

📎 Attachments: invoice.pdf, purchase_order.xlsx
📅 Due Date: 2025-11-10
```

### 2. Approval Message (L1 → L2)
```
✅ Approved by @john.doe (Manager)

Moving to L2 approval.
Assigned to @jane.smith (Admin)

Manager's Note: "Verified invoice and PO. Approved."
```

### 3. Rejection Message
```
❌ Rejected by @jane.smith (Admin)

Reason: Insufficient documentation provided

Required:
- Original invoice from vendor
- Purchase order approval
- Budget allocation proof

Please update and resubmit.
```

### 4. Question in Chat
```
👤 @john.doe (Manager): 
Can you confirm the vendor GST number matches our records?

📋 Reference GST: 27AABCU9603R1ZX
```

### 5. Final Approval & Payment
```
✅ Approved by @robert.brown (Super Admin)

Payment authorized and processed.

💳 Transaction Details:
   - TXN ID: TXN789456123
   - Amount: ₹50,000.00
   - Paid to: Acme Corporation
   - Account: XXXX-1234
   - Date: 2025-11-02 14:30:45 IST

Status: PAID ✓
```

---

## 📎 File Attachment Handling

### Supported File Types

```javascript
const ALLOWED_MIME_TYPES = [
    'application/pdf',                    // PDF documents
    'image/jpeg',                         // JPEG images
    'image/png',                          // PNG images
    'application/vnd.ms-excel',          // Excel (old)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (new)
    'application/msword',                // Word (old)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word (new)
];
```

### File Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **attachments** | Payment request files | Invoices, POs, receipts |
| **documents** | Supporting docs | Contracts, agreements |
| **profile_pics** | User avatars | Profile images |

### File Security

```javascript
✅ Authentication required
✅ Path traversal protection
✅ MIME type validation
✅ File size limits (configured)
⚠️ Tenant isolation (TODO - needs enhancement)
```

---

## 🔧 API Endpoints

### Payment Requests

```javascript
// Create payment request
POST /api/common/payment-requests
{
    "clientName": "Acme Corp",
    "clientEmail": "finance@acme.com",
    "clientPhone": "+91-9876543210",
    "description": "Monthly consulting services",
    "dueDate": "2025-11-10",
    "lineItems": [
        {
            "description": "Consulting - 10 hours",
            "quantity": 10,
            "unit": "hours",
            "rate": 5000,
            "taxRate": 18,
            "discountRate": 0
        }
    ],
    "attachments": [
        {
            "fileName": "invoice.pdf",
            "fileUrl": "/uploads/attachments/abc123.pdf",
            "fileSize": 245670,
            "mimeType": "application/pdf"
        }
    ]
}

// Submit for approval
POST /api/common/payment-requests/:id/submit
{
    "requestedApprovers": ["user-id-1", "user-id-2"]  // ⚠️ Currently ignored
}

// Get payment request details (includes task, messages, approvals)
GET /api/common/payment-requests/:id

// Update payment request (only in DRAFT status)
PUT /api/common/payment-requests/:id

// Delete payment request (only in DRAFT status)
DELETE /api/common/payment-requests/:id
```

### Tasks & Approvals

```javascript
// Get tasks assigned to me
GET /api/common/tasks?assigneeId=my-user-id

// Approve task
POST /api/common/tasks/:taskId/approve
{
    "remarks": "Approved after verification",
    "reassignToNextLevel": true
}

// Reject task
POST /api/common/tasks/:taskId/reject
{
    "remarks": "Missing invoice attachment",
    "returnToCreator": true
}

// Get task details (includes messages)
GET /api/common/tasks/:taskId
```

### Messages

```javascript
// Get messages for a task
GET /api/common/tasks/:taskId/messages

// Send a message
POST /api/common/tasks/:taskId/messages
{
    "body": "Can you provide the purchase order number?",
    "type": "USER"
}

// Message types: USER, SYSTEM, APPROVAL, REJECTION
```

### Files

```javascript
// Upload file
POST /api/upload
{
    "file": <binary>,
    "category": "attachments"
}

// Download file (authenticated)
GET /api/secure-files/:category/:filename
```

---

## 🐛 Known Issues & Limitations

### 🟡 Medium Priority

1. **Approver Selection Always Uses First User**
   ```javascript
   // Current code:
   const firstApprover = approvers[0]; // ❌ No selection logic
   
   // Needed:
   const selectedApprover = selectBestApprover(approvers, paymentAmount, requestedApprovers);
   ```

2. **requestedApprovers Parameter Ignored**
   ```javascript
   // API accepts this but doesn't use it:
   POST /api/common/payment-requests/:id/submit
   { "requestedApprovers": ["user-1", "user-2"] } // ⚠️ Ignored!
   ```

3. **No Enterprise Admin Escalation**
   ```javascript
   // Missing L4 (Enterprise Admin) approval level
   // High-value payments should escalate to enterprise admins
   ```

4. **No Workload Balancing**
   ```javascript
   // Doesn't distribute tasks evenly
   // No check for approver availability
   // No SLA tracking
   ```

### 🟢 Low Priority

5. **No Approval Amount Limits**
   ```javascript
   // Should route based on amount:
   // <₹10K  → Manager
   // ₹10K-₹50K → Admin
   // ₹50K-₹500K → Super Admin
   // >₹500K → Enterprise Admin
   ```

6. **No Approver Notifications**
   ```javascript
   // No email/SMS when task assigned
   // No reminders for pending approvals
   ```

---

## ✅ Best Practices

### For Developers

```javascript
// ✅ DO: Always include warm messages when changing status
await createMessage({
    taskId,
    senderId: userId,
    body: `Status changed to ${newStatus} by @${username}`,
    type: 'SYSTEM',
    meta: JSON.stringify({ action, oldStatus, newStatus })
});

// ✅ DO: Log all approval actions
await createActivityLog({
    paymentRequestId,
    userId,
    action: 'APPROVED',
    oldStatus,
    newStatus,
    comment: remarks
});

// ✅ DO: Validate approver has permission
const canApprove = await checkApprovalPermission(userId, taskLevel);
if (!canApprove) {
    throw new Error('Insufficient approval authority');
}

// ❌ DON'T: Skip approval levels
// Always follow the hierarchy: L1 → L2 → L3

// ❌ DON'T: Allow editing after submission
if (paymentRequest.status !== 'DRAFT') {
    throw new Error('Cannot edit submitted requests');
}
```

### For API Users

```javascript
// ✅ DO: Check task status before approving
const task = await getTask(taskId);
if (task.status !== 'PENDING') {
    console.error('Task is not pending approval');
    return;
}

// ✅ DO: Provide meaningful remarks
await approveTask(taskId, {
    remarks: "Verified invoice #INV-2024-1234 against PO #PO-2024-5678. Approved."
});

// ✅ DO: Attach all required documents before submitting
const requiredDocs = ['invoice', 'purchase_order', 'vendor_gst'];
if (attachments.length < requiredDocs.length) {
    console.warn('Missing required attachments');
}

// ❌ DON'T: Submit without validation
// Always validate line items, amounts, and attachments first
```

---

## 📚 Related Documentation

- **Full Audit Report**: `APPROVAL_FLOW_AUDIT_REPORT.md`
- **Database Schema**: `server/prisma/schema.prisma`
- **API Routes**: `my-backend/dist/routes/paymentRequests.js`
- **Frontend Components**: `modules/payment/`
- **Type Definitions**: `modules/payment/payment-types.ts`

---

## 🆘 Support

### Common Questions

**Q: How do I add a new approval level?**
```sql
INSERT INTO "ApprovalLevel" (level, "roleName", "approvalLimit", "isActive")
VALUES (3, 'ENTERPRISE_ADMIN', 1000000, true);
```

**Q: How do I change who gets assigned as L1 approver?**
```javascript
// Current: First user with MANAGER role
// To change: Modify approver selection logic in paymentRequests.js:425-442
```

**Q: Can I skip an approval level?**
```
No. The system enforces sequential approval: L1 → L2 → L3
This is a security feature to ensure proper oversight.
```

**Q: What happens if I reject at L2?**
```
Request returns to creator with REJECTED status.
Creator can edit and resubmit, starting the flow again from L1.
```

---

**Last Updated**: November 2, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready (with caveats)
