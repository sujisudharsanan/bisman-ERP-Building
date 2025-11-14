# 🚀 Task Workflow System - Quick Start

## ⚡ Installation (2 minutes)

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
./install-task-workflow.sh
```

## 📋 What It Does

```
User creates task → Opens chat drawer → Confirms
  ↓
Operation Manager approves (Level 1)
  ↓
Accounts approves (Level 2)
  ↓
Accounts Payable approves (Level 3)
  ↓
Banker approves (Level 4 - Final)
  ↓
Task Complete ✅

Any approver can REJECT → Task goes to EDITING
Creator fixes and RESUBMITS → Back to same approver
```

## 🔑 Key Files

| File | What It Does |
|------|--------------|
| `my-backend/server.js` | Socket.IO server ✅ |
| `my-backend/routes/taskRoutes.js` | Task API (9 endpoints) ✅ |
| `my-backend/routes/approverRoutes.js` | Approver API (7 endpoints) ✅ |
| `my-backend/services/taskStateMachine.js` | Workflow logic ✅ |
| `my-frontend/src/components/tasks/TaskChatDrawer.tsx` | Chat drawer UI ✅ |

## 🗄️ Database Tables

- `tasks` - Main task storage
- `task_history` - Audit trail (who did what, when)
- `task_approvers` - Approval chain configuration
- `task_comments` - Chat messages
- `task_attachments` - File uploads (ready for use)

## 🎯 API Quick Reference

### Create Task
```bash
POST /api/tasks
{
  "title": "Payment Request",
  "description": "Vendor payment",
  "priority": "high"
}
```

### Confirm Task (Draft → In Progress)
```bash
POST /api/tasks/:id/transition
{ "action": "confirm" }
```

### Approve
```bash
POST /api/tasks/:id/transition
{ "action": "approve", "comment": "Looks good" }
```

### Reject
```bash
POST /api/tasks/:id/transition
{ "action": "reject", "comment": "Missing docs" }
```

### Resubmit
```bash
POST /api/tasks/:id/transition
{ "action": "resubmit", "comment": "Docs added" }
```

## 🎨 Frontend Integration

```typescript
// Add to your Kanban dashboard
import TaskChatDrawer from '@/components/tasks/TaskChatDrawer';

// On task click
<TaskChatDrawer
  taskId={task.id}
  onClose={() => setSelectedTask(null)}
  currentUserId={user.id}
  currentUserType={user.userType}
/>
```

## 🔌 Realtime Updates

Socket.IO automatically broadcasts:
- Task status changes
- New comments
- Approvals/rejections

All connected users see updates instantly!

## ⚙️ Configure Approvers

1. Login as SUPER_ADMIN
2. Go to `/super-admin/approvers`
3. Add approvers:
   - Level 1: Operation Manager
   - Level 2: Accounts
   - Level 3: Accounts Payable
   - Level 4: Banker (Final)

Or use SQL:
```sql
INSERT INTO task_approvers (user_id, user_type, user_name, user_email, approver_role, approval_level)
VALUES 
  ('uuid1', 'USER', 'John Doe', 'john@example.com', 'operation_manager', 1),
  ('uuid2', 'USER', 'Jane Smith', 'jane@example.com', 'accounts', 2),
  ('uuid3', 'USER', 'Bob Wilson', 'bob@example.com', 'account_payable', 3),
  ('uuid4', 'USER', 'Alice Brown', 'alice@example.com', 'banker', 4);
```

## ✅ Testing

```bash
# 1. Create task
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: token=JWT" \
  -d '{"title":"Test Task"}'

# 2. Confirm (DRAFT → IN_PROGRESS)
curl -X POST http://localhost:8080/api/tasks/TASK_ID/transition \
  -H "Content-Type: application/json" \
  -H "Cookie: token=CREATOR_JWT" \
  -d '{"action":"confirm"}'

# 3. Approve Level 1
curl -X POST http://localhost:8080/api/tasks/TASK_ID/transition \
  -H "Content-Type: application/json" \
  -H "Cookie: token=OP_MANAGER_JWT" \
  -d '{"action":"approve"}'

# Repeat for levels 2, 3, 4 → DONE ✅
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Socket not connecting | Check CORS in server.js |
| Can't approve | Check user in task_approvers table |
| No realtime updates | Install socket.io-client in frontend |
| Migration fails | Check DATABASE_URL is set |

## 📚 Full Documentation

- `TASK_WORKFLOW_COMPLETE_GUIDE.md` - Comprehensive guide
- `TASK_WORKFLOW_IMPLEMENTATION_SUMMARY.md` - Detailed summary

## 🎯 Status Badges

| Status | Color | Meaning |
|--------|-------|---------|
| DRAFT | Gray | Just created |
| IN_PROGRESS | Amber | Being reviewed |
| EDITING | Red | Rejected, needs fixes |
| DONE | Green | Fully approved ✅ |

## 🔒 Security

- ✅ JWT authentication on all endpoints
- ✅ RBAC: Only correct approver can approve
- ✅ Audit trail: Every action logged
- ✅ State machine: Can't skip levels
- ✅ Parameterized queries: No SQL injection

## 📊 Approval Levels

```
Level 0 (Draft) → User confirms
  ↓
Level 1 → Operation Manager approves
  ↓
Level 2 → Accounts approves
  ↓
Level 3 → Accounts Payable approves
  ↓
Level 4 → Banker approves (FINAL)
  ↓
Level 5 (Done) ✅
```

## 💡 Pro Tips

1. **Use tags** for categorization (`tags: ['payment', 'vendor']`)
2. **Set priority** (`priority: 'urgent'`)
3. **Add due dates** (`due_date: '2025-12-31'`)
4. **Use comments** for communication
5. **Check history** for audit trail

## 🚀 That's It!

Run the install script and you're ready to go!

```bash
./install-task-workflow.sh
```

**Questions?** Check `TASK_WORKFLOW_COMPLETE_GUIDE.md`

---

*Task Workflow System v1.0 - BISMAN ERP*
