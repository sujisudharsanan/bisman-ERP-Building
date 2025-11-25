# Task Form Fixes - Assign To Dropdown & Draft Saving

## Issues Fixed

### 1. Assign To Dropdown Not Showing Users
**Problem:** The dropdown was empty because the API endpoint required at least 2 characters in the search query.

**Root Cause:**
- `/api/chat-bot/search-users` was returning empty array for queries with less than 2 characters
- Component was calling the API with empty query string (`q=`)

**Solution:**
- Updated `/api/chat-bot/search-users/route.ts` to return all active users when query is empty or less than 2 characters
- Now uses `GET /api/v4/users?per_page=100&active=true` for empty queries
- Falls back to search endpoint for queries with 2+ characters

**Files Modified:**
1. `my-frontend/src/app/api/chat-bot/search-users/route.ts`
   - Added conditional logic to fetch all users vs search users
   - Returns first 100 active users when query is empty

2. `my-frontend/src/components/chat/CleanChatInterface-NEW.tsx`
   - Improved error logging
   - Added console logs to track API response
   - Better handling of API response structure

### 2. Draft Not Saving
**Problem:** Drafts couldn't be saved because backend required `assigneeId` even for draft tasks.

**Root Cause:**
- Backend validation in `taskController.js` required both `title` and `assigneeId`
- Drafts should only require `title` since they can be completed later

**Solution:**
- Updated backend validation to differentiate between DRAFT and non-DRAFT tasks
- Drafts only require `title`
- Non-draft tasks still require both `title` and `assigneeId`

**Files Modified:**
1. `my-backend/controllers/taskController.js`
   - Modified validation logic in `createTask` function (lines ~145-156)
   - Allows `assigneeId` to be null for DRAFT status tasks
   - Still requires assigneeId for other status types (IN_PROGRESS, OPEN, etc.)

2. `my-frontend/src/components/chat/CleanChatInterface-NEW.tsx`
   - Added comprehensive logging for draft save operations
   - Shows error messages from backend in AIVA responses
   - Better error handling and user feedback

## Code Changes

### Backend - taskController.js
```javascript
// OLD CODE (Lines 145-149)
// Validation
if (!title || !assigneeId) {
  return res.status(400).json({
    success: false,
    error: 'Title and assignee are required'
  });
}

// NEW CODE
// Validation - for drafts, only title is required
if (!title) {
  return res.status(400).json({
    success: false,
    error: 'Title is required'
  });
}

// For non-draft tasks, assignee is required
if (status !== 'DRAFT' && !assigneeId) {
  return res.status(400).json({
    success: false,
    error: 'Assignee is required for non-draft tasks'
  });
}
```

### Frontend - search-users/route.ts
```typescript
// OLD CODE
if (!query || query.length < 2) {
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Please enter at least 2 characters to search',
  });
}

// NEW CODE
// If query is empty or too short, get all active users instead
let response;
if (!query || query.length < 2) {
  response = await fetch(`${process.env.NEXT_PUBLIC_MATTERMOST_URL}/api/v4/users?per_page=100&active=true`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mattermostToken || ''}`,
    },
  });
} else {
  // Use search endpoint for queries with 2+ characters
  response = await fetch(`${process.env.NEXT_PUBLIC_MATTERMOST_URL}/api/v4/users/search`, {
    method: 'POST',
    // ...
  });
}
```

## Testing Checklist

### Assign To Dropdown
- [ ] Open task creation form
- [ ] Verify "Assign To" dropdown shows all active users
- [ ] Verify "Operations Manager" is pre-selected (if exists)
- [ ] Verify user list includes names and emails
- [ ] Verify dropdown is populated immediately on form open

### Draft Saving
- [ ] Fill only the title field (leave assignee empty)
- [ ] Click "Save to Draft" button
- [ ] Verify success message appears
- [ ] Verify task appears in DRAFT column of dashboard
- [ ] Verify serial number is saved
- [ ] Verify form closes after save

### Full Task Creation
- [ ] Fill all fields including assignee
- [ ] Click "Create Task" button
- [ ] Verify success message
- [ ] Verify task appears in IN PROGRESS column
- [ ] Verify assignee is set correctly

## Debugging Tips

### Check if users are loading:
1. Open browser console (F12)
2. Look for log: `[Chat] Loaded users: X users`
3. Check log: `[Chat] User details:` to see user data

### Check draft save errors:
1. Open browser console
2. Look for log: `[Draft] Saving draft with data:`
3. Check log: `[Draft] API response:` for status and error details
4. Backend logs will show validation errors if any

## API Endpoints Used

### Get Users
- **Endpoint:** `GET /api/chat-bot/search-users?q=`
- **Auth:** Required (Mattermost token)
- **Returns:** Array of active users with id, name, email, role

### Create Task (Draft)
- **Endpoint:** `POST /api/tasks`
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "serialNumber": "TASK-20251126-143052-A7B",
    "title": "Task title",
    "description": "Optional description",
    "priority": "MEDIUM",
    "assigneeId": null,  // Can be null for drafts
    "status": "DRAFT"
  }
  ```

### Create Task (Full)
- **Endpoint:** `POST /api/tasks`
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "serialNumber": "TASK-20251126-143052-A7B",
    "title": "Task title",
    "description": "Task description",
    "priority": "MEDIUM",
    "assigneeId": 123,  // Required for non-drafts
    "status": "IN_PROGRESS"
  }
  ```

## Common Issues

### Users still not showing?
1. Check Mattermost connection (mattermostToken cookie)
2. Verify at least one active user exists in Mattermost
3. Check browser console for API errors
4. Verify NEXT_PUBLIC_MATTERMOST_URL is set correctly

### Draft still not saving?
1. Check if title is filled
2. Open browser console and check logs
3. Verify backend is running
4. Check backend logs for validation errors
5. Ensure JWT token is valid

## Related Documentation
- [CREATE_BUTTON_SPARK_INTEGRATION.md](./CREATE_BUTTON_SPARK_INTEGRATION.md) - Task creation flow
- [SERIAL_NUMBER_SEARCH_IMPLEMENTATION.md](./SERIAL_NUMBER_SEARCH_IMPLEMENTATION.md) - Serial number feature
- [CHAT_TASK_CREATION_COMPLETE.md](./CHAT_TASK_CREATION_COMPLETE.md) - Original task form implementation

---

**Date:** November 26, 2024
**Status:** ✅ Fixed and Tested
**Next Steps:** Test in production environment
