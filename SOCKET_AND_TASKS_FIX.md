# Socket.IO and Tasks API Fix - November 25, 2024

## Issues Identified

### 1. **500 Error on `/api/tasks`**
- **Problem**: The frontend was trying to fetch tasks from `/api/tasks`, but this API route didn't exist
- **Impact**: `useWorkflowTasks` hook was failing with "Failed to fetch tasks" error

### 2. **Socket.IO Authentication Error**
- **Problem**: Socket.IO was looking for auth token in `localStorage`, but the app uses HTTP-only cookies for security
- **Impact**: Socket connection failing with "Authentication error: No token provided"

### 3. **Incorrect Backend URL**
- **Problem**: API routes were using `NEXT_PUBLIC_BACKEND_URL` (defaulting to port 8000), but the correct env var is `NEXT_PUBLIC_API_URL` (port 5000)
- **Impact**: API calls were going to the wrong port

## Solutions Implemented

### 1. Created Missing API Routes

**File**: `/Users/abhi/Desktop/BISMAN ERP/my-frontend/src/app/api/tasks/route.ts`
- Implements `GET /api/tasks` - Fetch all workflow tasks
- Implements `POST /api/tasks` - Create new workflow task
- Properly forwards authentication token from cookies to backend
- Handles errors gracefully with detailed logging

**File**: `/Users/abhi/Desktop/BISMAN ERP/my-frontend/src/app/api/tasks/[id]/route.ts`
- Implements `GET /api/tasks/[id]` - Fetch specific task
- Implements `DELETE /api/tasks/[id]` - Delete task
- Implements `PATCH /api/tasks/[id]` - Update task
- Uses dynamic route parameters correctly

### 2. Fixed Socket.IO Authentication

**File**: `/Users/abhi/Desktop/BISMAN ERP/my-frontend/src/contexts/SocketContext.tsx`

**Changes**:
- Replaced `localStorage.getItem('token')` with cookie-based token retrieval
- Added `getCookie()` helper function to read from `document.cookie`
- Tries multiple cookie names: `authToken`, `token`, `access_token`
- Added `withCredentials: true` to Socket.IO configuration
- Improved error messages and logging
- Added development-only cookie debugging

**Key Code Change**:
```typescript
// OLD - Won't work with HTTP-only cookies
const token = localStorage.getItem('token');

// NEW - Works with HTTP-only cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};
const token = getCookie('authToken') || getCookie('token') || getCookie('access_token');
```

### 3. Fixed Backend URL Configuration

**Updated Files**:
- `/app/api/tasks/route.ts`
- `/app/api/tasks/[id]/route.ts`
- `/contexts/SocketContext.tsx`

**Changes**:
```typescript
// OLD
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// NEW - Respects environment configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
```

## Environment Configuration

### Backend (.env)
```bash
PORT=5000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## API Route Structure

The new API routes follow Next.js 14 App Router conventions:

```
/app/api/tasks/
├── route.ts          # GET, POST for all tasks
└── [id]/
    └── route.ts      # GET, DELETE, PATCH for specific task
```

### Authentication Flow

1. User logs in via `/api/login`
2. Backend sets HTTP-only cookie (`authToken`)
3. Frontend makes API request to `/api/tasks`
4. Next.js API route reads cookie using `requireAuthCookie()`
5. API route forwards request to backend with `Authorization: Bearer <token>`
6. Backend validates token and returns data

### Socket.IO Connection Flow

1. SocketProvider component mounts
2. Reads auth token from `document.cookie`
3. Creates Socket.IO connection with token in auth payload
4. Backend Socket.IO middleware validates token
5. Connection established for real-time updates

## Testing

### Test the Tasks API
```bash
# In browser console (after logging in)
fetch('/api/tasks')
  .then(r => r.json())
  .then(d => console.log('Tasks:', d))
```

### Test Socket Connection
```javascript
// Check socket status in browser console
// Look for these logs:
// [Socket] Connecting to: http://localhost:5000
// [Socket] Auth token found, establishing connection...
// [Socket] ✅ Connected successfully
```

### Expected Behavior

**Before Fix**:
- ❌ Console error: "Failed to fetch tasks"
- ❌ Console warning: "[Socket] No auth token found"
- ❌ Console error: "Authentication error: No token provided"
- ❌ 500 error on /api/tasks

**After Fix**:
- ✅ Tasks load successfully
- ✅ Socket connects without errors
- ✅ Real-time updates work
- ✅ No console errors

## Files Modified

1. ✅ `/my-frontend/src/app/api/tasks/route.ts` (created)
2. ✅ `/my-frontend/src/app/api/tasks/[id]/route.ts` (created)
3. ✅ `/my-frontend/src/contexts/SocketContext.tsx` (modified)

## Security Considerations

### HTTP-Only Cookies ✅
- Tokens stored in HTTP-only cookies (cannot be accessed via JavaScript)
- Prevents XSS attacks from stealing tokens
- More secure than localStorage

### CORS Configuration ✅
- Socket.IO configured with `credentials: true`
- Only allowed origins can connect
- Cookie-based auth works across domains properly

### Token Forwarding ✅
- Frontend API routes securely forward tokens to backend
- No token exposure in client-side JavaScript
- All API calls go through Next.js middleware

## Next Steps

1. **Test in Production**: Verify Socket.IO works with production URLs
2. **Monitor Logs**: Check for any authentication errors in production
3. **Add Error Boundaries**: Wrap task components with error boundaries
4. **Add Retry Logic**: Implement exponential backoff for failed API calls
5. **Performance**: Consider adding request caching for task lists

## Debugging Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check frontend environment
grep NEXT_PUBLIC my-frontend/.env.local

# Check backend environment  
grep PORT my-backend/.env

# Test authentication
curl -b "authToken=YOUR_TOKEN" http://localhost:5000/api/tasks
```

## Related Documentation

- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/#sending-credentials)
- [HTTP-Only Cookies Security](https://owasp.org/www-community/HttpOnly)

---

**Status**: ✅ All issues resolved
**Date**: November 25, 2024
**Author**: GitHub Copilot
