# Draft Save Fix - FormData and Null Assignee Handling

## Issue
Draft tasks were failing to save with error "Failed to create task". This was caused by:
1. Frontend API proxy not handling FormData (only handled JSON)
2. Backend duplicate check failing on null assigneeId
3. Backend not properly parsing FormData string values to integers

## Root Causes

### 1. Frontend API Proxy Issue
**File:** `my-frontend/src/app/api/tasks/route.ts`

**Problem:**
```typescript
// Old code - only handled JSON
const body = await request.json();
const response = await fetch(`${BACKEND_URL}/api/tasks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});
```

The proxy was trying to parse FormData as JSON, which failed.

**Solution:**
Detect content type and handle both JSON and FormData:
```typescript
const contentType = request.headers.get('content-type') || '';
let body: any;
let requestHeaders: Record<string, string> = {
  'Authorization': `Bearer ${authToken}`,
};

if (contentType.includes('multipart/form-data')) {
  // Handle FormData (file uploads)
  const formData = await request.formData();
  body = formData;
  // Don't set Content-Type - let fetch set it with boundary
} else {
  // Handle JSON
  body = JSON.stringify(await request.json());
  requestHeaders['Content-Type'] = 'application/json';
}

const response = await fetch(`${BACKEND_URL}/api/tasks`, {
  method: 'POST',
  headers: requestHeaders,
  body: body,
});
```

### 2. Backend Duplicate Check Issue
**File:** `my-backend/controllers/taskController.js`

**Problem:**
```javascript
// Old code - failed on null assigneeId
const checkForDuplicates = async (title, assigneeId, creatorId, excludeTaskId = null) => {
  let query = `
    SELECT id, title, status, created_at
    FROM tasks
    WHERE LOWER(title) = LOWER($1)
      AND assignee_id = $2  // This fails when assigneeId is null
      AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED')
  `;
  const params = [title, assigneeId];
  // ...
};
```

PostgreSQL's `assignee_id = NULL` always returns false, causing the query to fail.

**Solution:**
Skip duplicate check for drafts:
```javascript
const checkForDuplicates = async (title, assigneeId, creatorId, excludeTaskId = null) => {
  // Skip duplicate check for drafts (when assigneeId is null)
  if (!assigneeId) {
    return [];
  }
  
  let query = `
    SELECT id, title, status, created_at
    FROM tasks
    WHERE LOWER(title) = LOWER($1)
      AND assignee_id = $2
      AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED')
  `;
  // ...
};
```

### 3. FormData String Parsing Issue
**File:** `my-backend/controllers/taskController.js`

**Problem:**
```javascript
// Old code - didn't parse FormData strings
const {
  assigneeId,  // This is a string "123" from FormData, not number 123
  approverId,
  // ...
} = req.body;

// Later used in SQL query expecting integer
const taskResult = await client.query(taskQuery, [
  title, description, serialNumber, creatorId, assigneeId, approverId || null,
  // ...
]);
```

FormData values are always strings, but the database expects integers.

**Solution:**
Parse string values to integers:
```javascript
const {
  title,
  description,
  serialNumber,
  assigneeId: rawAssigneeId,
  approverId: rawApproverId,
  priority = 'MEDIUM',
  // ...
} = req.body;

// Parse IDs (handle both JSON numbers and FormData strings)
const assigneeId = rawAssigneeId ? parseInt(rawAssigneeId) : null;
const approverId = rawApproverId ? parseInt(rawApproverId) : null;

const creatorId = req.user.id;
```

## Files Modified

### 1. Frontend API Proxy
**File:** `my-frontend/src/app/api/tasks/route.ts`
- Added content-type detection
- Added FormData handling
- Conditional Content-Type header setting

### 2. Backend Task Controller
**File:** `my-backend/controllers/taskController.js`
- Updated `checkForDuplicates` to skip check for null assigneeId
- Added parsing of assigneeId and approverId from strings to integers
- Ensured description defaults to empty string if not provided

## Testing

### Test Draft Creation
1. **Open task form** (click Create button)
2. **Fill only title** (leave assignee empty)
3. **Click "Save to Draft"**
4. **Expected:** Success message appears
5. **Verify:** Task appears in DRAFT column of dashboard

### Test Draft with Assignee
1. **Open task form**
2. **Fill title and select assignee**
3. **Click "Save to Draft"**
4. **Expected:** Success message with assignee name
5. **Verify:** Task appears in DRAFT with assignee set

### Test Full Task Creation
1. **Open task form**
2. **Fill all required fields** (title, assignee)
3. **Add files** (optional)
4. **Click "Create Task"**
5. **Expected:** Success message with attachment count
6. **Verify:** Task appears in IN PROGRESS column

### Test File Attachments
1. **Open task form**
2. **Drag and drop file**
3. **Click "Save to Draft"**
4. **Expected:** Success with "X file(s) attached" message
5. **Verify:** Task saved with attachments

## Error Handling Flow

### Before Fix
```
Frontend (FormData) → API Proxy (tries JSON parse) → ❌ FAILS
```

### After Fix
```
Frontend (FormData) → API Proxy (detects multipart) → Backend (parses strings) → ✅ SUCCESS
```

## Database Schema Notes

### Tasks Table Structure
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  serial_number VARCHAR(50) UNIQUE,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),  -- Can be NULL for drafts
  approver_id INTEGER REFERENCES users(id),  -- Can be NULL
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  status VARCHAR(50) DEFAULT 'OPEN',
  -- ... other fields
);
```

### Key Points
- `assignee_id` can be NULL (for drafts)
- `approver_id` can be NULL
- `status` can be 'DRAFT', 'OPEN', 'IN_PROGRESS', etc.
- `serial_number` is unique and auto-generated

## API Request Examples

### Draft (No Assignee) - FormData
```
POST /api/tasks
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="serialNumber"

TASK-20251126-143052-A7B
------WebKitFormBoundary...
Content-Disposition: form-data; name="title"

Task Title
------WebKitFormBoundary...
Content-Disposition: form-data; name="description"

Task Description
------WebKitFormBoundary...
Content-Disposition: form-data; name="priority"

MEDIUM
------WebKitFormBoundary...
Content-Disposition: form-data; name="status"

DRAFT
------WebKitFormBoundary...--
```

### Draft (With Assignee) - FormData
```
POST /api/tasks
Content-Type: multipart/form-data

... (same as above) ...
------WebKitFormBoundary...
Content-Disposition: form-data; name="assigneeId"

123
------WebKitFormBoundary...--
```

### Response Format
```json
{
  "success": true,
  "data": {
    "id": 456,
    "serial_number": "TASK-20251126-143052-A7B",
    "title": "Task Title",
    "description": "Task Description",
    "priority": "MEDIUM",
    "status": "DRAFT",
    "creator_id": 1,
    "assignee_id": null,
    "approver_id": null,
    "created_at": "2025-11-26T02:57:00.000Z",
    "updated_at": "2025-11-26T02:57:00.000Z"
  },
  "message": "Task created successfully"
}
```

## Common Issues & Solutions

### Issue: "Title is required"
**Cause:** Title field is empty
**Solution:** Fill in the title before saving

### Issue: "Assignee is required for non-draft tasks"
**Cause:** Creating task with status IN_PROGRESS but no assignee
**Solution:** Either select an assignee or save as draft

### Issue: "Backend error: 500"
**Cause:** Database connection issue or SQL error
**Solution:** Check backend logs and database connection

### Issue: FormData not sending
**Cause:** Frontend not creating FormData properly
**Solution:** Verify FormData.append() calls in frontend

## Dashboard Integration

### Draft Column
Drafts appear in the dashboard with:
- Status: DRAFT
- Serial Number: TASK-YYYYMMDD-HHMMSS-XXX
- Title: User-entered title
- Assignee: Can be null or set
- Actions: Edit, Complete, Delete

### Filtering
Drafts are fetched with:
```sql
SELECT * FROM tasks WHERE status = 'DRAFT' AND creator_id = $1
```

## Related Documentation
- [TASK_FORM_FIXES.md](./TASK_FORM_FIXES.md) - Original form fixes
- [FILE_ATTACHMENT_FEATURE.md](./FILE_ATTACHMENT_FEATURE.md) - File attachment implementation
- [SERIAL_NUMBER_SEARCH_IMPLEMENTATION.md](./SERIAL_NUMBER_SEARCH_IMPLEMENTATION.md) - Serial number feature

---

**Date:** November 26, 2024
**Status:** ✅ Fixed and Ready to Test
**Priority:** HIGH - Critical for draft functionality
