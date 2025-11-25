# 🧪 Task System API Testing Guide

**Backend Ready:** ✅ All endpoints implemented  
**Test With:** Postman, Thunder Client, or curl  
**Base URL:** `http://localhost:5000/api/tasks`

---

## 🔐 Authentication Required

All endpoints require authentication. Include this header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get token by logging in first:
```bash
POST http://localhost:5000/api/auth/login
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

---

## 📋 QUICK TEST SEQUENCE

### 1. Create a Task
```bash
POST http://localhost:5000/api/tasks
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "title": "Test Task - Q4 Financial Report",
  "description": "Complete the quarterly financial analysis and prepare presentation",
  "assigneeId": 2,
  "approverId": 3,
  "priority": "HIGH",
  "dueDate": "2025-12-31",
  "estimatedHours": 8,
  "requiresApproval": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Test Task - Q4 Financial Report",
    "status": "OPEN",
    "priority": "HIGH",
    "creator_name": "Your Name",
    "assignee_name": "Assignee Name",
    "message_count": 1,
    "...": "..."
  },
  "message": "Task created successfully"
}
```

---

### 2. Get Dashboard Tasks
```bash
GET http://localhost:5000/api/tasks/dashboard
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "DRAFT": [],
    "IN_PROGRESS": [],
    "EDITING": [],
    "DONE": []
  }
}
```

---

### 3. Get Task Statistics
```bash
GET http://localhost:5000/api/tasks/stats
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "draft_count": "0",
    "open_count": "1",
    "in_progress_count": "0",
    "review_count": "0",
    "blocked_count": "0",
    "completed_count": "0",
    "overdue_count": "0",
    "total_tasks": "1",
    "completionRate": 0
  }
}
```

---

### 4. Get Single Task
```bash
GET http://localhost:5000/api/tasks/1
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Test Task - Q4 Financial Report",
    "description": "...",
    "status": "OPEN",
    "messages": [
      {
        "id": 1,
        "message_text": "Task created by Your Name",
        "is_system_message": true,
        "...": "..."
      }
    ],
    "attachments": []
  }
}
```

---

### 5. Add a Message
```bash
POST http://localhost:5000/api/tasks/1/messages
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "messageText": "Started working on the financial data analysis",
  "messageType": "TEXT"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "task_id": 1,
    "message_text": "Started working on the financial data analysis",
    "sender_name": "Your Name",
    "created_at": "2025-11-25T..."
  },
  "message": "Message added successfully"
}
```

---

### 6. Start the Task
```bash
POST http://localhost:5000/api/tasks/1/start
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "IN_PROGRESS",
    "started_at": "2025-11-25T...",
    "...": "..."
  },
  "message": "Task started successfully"
}
```

---

### 7. Update Task Progress
```bash
PATCH http://localhost:5000/api/tasks/1
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "progress": 50,
  "description": "Updated: Completed data collection phase"
}
```

---

### 8. Upload Attachments
```bash
POST http://localhost:5000/api/tasks/1/attachments
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN

files: [Select files from your computer]
```

---

### 9. Complete the Task
```bash
POST http://localhost:5000/api/tasks/1/complete
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "notes": "All analysis completed, report is ready for review"
}
```

---

### 10. Approve the Task (as approver)
```bash
POST http://localhost:5000/api/tasks/1/approve
Content-Type: application/json
Authorization: Bearer APPROVER_TOKEN

{
  "comments": "Excellent work! Report looks comprehensive."
}
```

---

## 🔍 TESTING ALL ENDPOINTS

### Task CRUD
- ✅ `POST /api/tasks` - Create task
- ✅ `GET /api/tasks` - List all (with filters)
- ✅ `GET /api/tasks/dashboard` - Dashboard view
- ✅ `GET /api/tasks/stats` - Statistics
- ✅ `GET /api/tasks/my-tasks` - My assigned tasks
- ✅ `GET /api/tasks/created-by-me` - Tasks I created
- ✅ `GET /api/tasks/pending-approval` - Awaiting my approval
- ✅ `GET /api/tasks/:id` - Get single task
- ✅ `PATCH /api/tasks/:id` - Update task
- ✅ `DELETE /api/tasks/:id` - Archive task

### Messages
- ✅ `GET /api/tasks/:id/messages` - Get messages
- ✅ `POST /api/tasks/:id/messages` - Add message
- ✅ `PATCH /api/tasks/:id/messages/:messageId` - Edit message
- ✅ `DELETE /api/tasks/:id/messages/:messageId` - Delete message
- ✅ `POST /api/tasks/:id/messages/:messageId/read` - Mark as read

### Attachments
- ✅ `GET /api/tasks/:id/attachments` - Get attachments
- ✅ `POST /api/tasks/:id/attachments` - Upload files
- ✅ `DELETE /api/tasks/:id/attachments/:attachmentId` - Delete file

### Status Workflow
- ✅ `POST /api/tasks/:id/start` - Start task
- ✅ `POST /api/tasks/:id/complete` - Complete task
- ✅ `POST /api/tasks/:id/reopen` - Reopen task
- ✅ `POST /api/tasks/:id/submit-for-review` - Submit for review
- ✅ `POST /api/tasks/:id/approve` - Approve
- ✅ `POST /api/tasks/:id/reject` - Reject
- ✅ `POST /api/tasks/:id/block` - Block
- ✅ `POST /api/tasks/:id/unblock` - Unblock

### Participants
- ✅ `GET /api/tasks/:id/participants` - Get participants
- ✅ `POST /api/tasks/:id/participants` - Add participant
- ✅ `DELETE /api/tasks/:id/participants/:userId` - Remove participant

### History
- ✅ `GET /api/tasks/:id/history` - Get audit trail

### Dependencies
- ✅ `GET /api/tasks/:id/dependencies` - Get dependencies
- ✅ `POST /api/tasks/:id/dependencies` - Add dependency
- ✅ `DELETE /api/tasks/:id/dependencies/:dependencyId` - Remove

### Templates
- ✅ `GET /api/tasks/templates/list` - Get templates
- ✅ `POST /api/tasks/templates` - Create template
- ✅ `POST /api/tasks/templates/:templateId/use` - Use template

### Assignment
- ✅ `POST /api/tasks/:id/reassign` - Reassign task
- ✅ `GET /api/tasks/assignable-users` - Get assignable users

### Search & Bulk
- ✅ `GET /api/tasks/search` - Search tasks
- ✅ `POST /api/tasks/bulk-update` - Update multiple
- ✅ `POST /api/tasks/bulk-delete` - Delete multiple

### Duplicate Check
- ✅ `GET /api/tasks/check-duplicates` - Check duplicates
- ✅ `POST /api/tasks/check-duplicate-before-create` - Pre-validation

---

## 🧪 TEST SCENARIOS

### Scenario 1: Complete Task Lifecycle
1. Create task → Status: OPEN
2. Assignee starts task → Status: IN_PROGRESS
3. Add messages and attachments
4. Assignee completes task → Status: COMPLETED
5. View task history

### Scenario 2: Approval Workflow
1. Create task with approval required
2. Assignee starts and completes
3. Submit for review → Status: IN_REVIEW
4. Approver approves → Approval: APPROVED
5. Or: Approver rejects → Status: IN_PROGRESS

### Scenario 3: Collaboration
1. Create task
2. Add participants with different permissions
3. Participants add comments
4. View all participants

### Scenario 4: Dependencies
1. Create Task A
2. Create Task B
3. Add dependency: B depends on A
4. Try to create circular dependency (should fail)

### Scenario 5: Templates
1. Create a task template
2. Use template to create new task
3. Customize task details

### Scenario 6: Bulk Operations
1. Create multiple tasks
2. Bulk update status
3. Bulk archive tasks

---

## ⚠️ ERROR TESTING

Test these error cases:

1. **Permission Denied**
   - Try to edit someone else's task
   - Try to approve as non-approver
   - Try to delete non-created task

2. **Validation Errors**
   - Create task without title
   - Create task without assignee
   - Add empty message

3. **Not Found**
   - Get non-existent task
   - Update non-existent message

4. **Duplicate Detection**
   - Create task with same title and assignee twice
   - Should return 409 Conflict

5. **Status Transition Rules**
   - Try to complete a DRAFT task
   - Try to approve without PENDING status

---

## 📊 EXPECTED BEHAVIOR

### Success Responses
- Status 200: Successful GET/PATCH/DELETE
- Status 201: Successful POST (create)
- Body: `{ "success": true, "data": {...}, "message": "..." }`

### Error Responses
- Status 400: Bad Request (validation)
- Status 403: Forbidden (permission denied)
- Status 404: Not Found
- Status 409: Conflict (duplicate)
- Status 500: Server Error
- Body: `{ "success": false, "error": "Error message" }`

---

## 🚀 START TESTING

1. **Start Backend:**
   ```bash
   cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
   npm run dev
   ```

2. **Get Auth Token:**
   - Login via `/api/auth/login`
   - Copy the JWT token

3. **Import to Postman:**
   - Create new collection "Task System"
   - Add environment variable: `{{baseUrl}}` = `http://localhost:5000`
   - Add environment variable: `{{token}}` = `your_jwt_token`
   - Use `{{token}}` in Authorization header

4. **Run Test Sequence:**
   - Follow the 10-step quick test above
   - Verify each response
   - Check database for changes

5. **Test Edge Cases:**
   - Permission errors
   - Validation errors
   - Circular dependencies
   - Duplicate tasks

---

## 📝 DEBUGGING TIPS

**If API returns 500 error:**
- Check backend console for error logs
- Verify database connection
- Check if users table has data

**If 403 Forbidden:**
- Verify JWT token is valid
- Check if user has correct permissions
- Verify task ownership/assignment

**If 404 Not Found:**
- Check task ID exists
- Verify user has access to task

**Database Issues:**
- Verify migration ran successfully
- Check all 7 tables exist
- Verify users table has test users

---

## ✅ VALIDATION CHECKLIST

After testing, verify:

- [ ] Can create tasks with all fields
- [ ] Duplicate detection works
- [ ] Dashboard groups tasks correctly
- [ ] Messages can be added/edited/deleted
- [ ] Attachments can be uploaded/deleted
- [ ] Status transitions follow rules
- [ ] Only assignee can start task
- [ ] Only approver can approve
- [ ] Permissions are enforced
- [ ] System messages are created
- [ ] Error messages are clear
- [ ] All 50+ endpoints work

---

**Status:** Ready for comprehensive API testing! 🧪  
**Backend:** 100% Complete ✅  
**Next:** Frontend development after API validation
