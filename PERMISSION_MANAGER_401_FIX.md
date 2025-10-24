# Permission Manager 401 Unauthorized Error - Fix

## Problem
When selecting roles in the Permission Manager (e.g., Hub Incharge), users are not showing and a "401 Unauthorized" error appears.

## Root Cause
The **authentication cookie is not being sent** with the API request to `/api/privileges/users`. This is indicated by the backend log: `[authenticate] Cookie token found: NO`

Possible reasons:
1. **Session expired** - The JWT token has expired
2. **Cookie not set** - After navigation or page refresh, cookies aren't available
3. **Cross-origin cookie issue** - Cookies aren't being sent from localhost:3000 to localhost:3001 (if using separate ports)
4. **Cookie name mismatch** - Frontend and backend using different cookie names

## Immediate Solution

### 1. **Log Out and Log Back In**
The simplest fix is to refresh your session:
1. Click the "Logout" button in the top right
2. Log in again with your credentials
3. Navigate back to Permission Manager
4. Try selecting a role again

### 2. **Use the Re-login Button**
When you see the 401 error, there should now be a "Re-login" button that appears. Click it to go back to the login page.

## Code Changes Made

### 1. Better Error Display (`page.tsx`)
Added a more prominent error message with a "Re-login" button for 401 errors:

```tsx
{perms.usersError && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-2">
    <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Error Loading Users</div>
    <div className="text-xs text-red-500 dark:text-red-300">{perms.usersError}</div>
    {perms.usersError.includes('401') && (
      <button
        onClick={() => window.location.href = '/auth/login'}
        className="mt-2 text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
      >
        Re-login
      </button>
    )}
  </div>
)}
```

### 2. Better Error Messages (`usepermissions.ts`)
Added user-friendly error messages for common HTTP errors:

```typescript
let displayError = errorMsg;
if (errorMsg.includes('401')) {
  displayError = '401 Unauthorized - Please refresh the page or log in again';
} else if (errorMsg.includes('403')) {
  displayError = '403 Forbidden - You do not have permission to view users';
} else if (errorMsg.includes('500')) {
  displayError = '500 Server Error - Backend service issue';
}
```

### 3. Enhanced API Logging (`api.ts`)
Added detailed logging to track API calls and responses:

```typescript
const fetchJson = async <T>(url: string): Promise<T> => {
  console.log('[API] Fetching:', url);
  const res = await fetch(url, { credentials: 'include' });
  console.log('[API] Response status:', res.status, res.statusText);
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    console.error('[API] Error response:', errorText);
    throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
  }
  const data = await res.json();
  console.log('[API] Response data:', data);
  return data;
};
```

## Testing Steps

1. **Check Browser Console**:
   - Open DevTools (F12 or Cmd+Option+I)
   - Look for `[API]` log messages
   - Check if cookies are being sent in the Network tab

2. **Verify Authentication**:
   ```bash
   # Check if you're logged in
   # In browser console:
   document.cookie
   
   # Should see 'access_token' or 'token' cookie
   ```

3. **Test the Fix**:
   - Log out and log back in
   - Go to Permission Manager
   - Select "Hub Incharge" role
   - Should see 1 user (demo_hub_incharge)

## Database Verification
Hub Incharge data is correct in the database:
- Role ID: 18, Name: 'Hub Incharge'
- User: demo_hub_incharge (ID: 29)

## Long-term Solutions

### Option 1: Increase JWT Expiration
Edit backend JWT settings to have longer session times:
```javascript
// In backend auth service
const token = jwt.sign(payload, secret, { expiresIn: '24h' }); // Instead of '1h'
```

### Option 2: Auto-refresh Tokens
Implement token refresh logic in the frontend to automatically renew expired tokens.

### Option 3: Better Cookie Configuration
Ensure cookies are set with correct domain and path:
```javascript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

## Files Modified
1. `/my-frontend/src/app/system/permission-manager/page.tsx` - Better error display
2. `/my-frontend/src/app/system/permission-manager/hooks/usepermissions.ts` - User-friendly error messages  
3. `/my-frontend/src/app/system/permission-manager/utils/api.ts` - Enhanced logging

## Status
✅ **Enhanced error handling** - Users now see clear messages and can re-login easily
⚠️ **Authentication issue** - Requires logging in again to refresh the session token
