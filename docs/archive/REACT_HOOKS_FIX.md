# React Hooks Error Fix - "Rendered fewer hooks than expected"

## Problem
User reported error when accessing hub-incharge login: **"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."**

## Root Cause
In `/my-frontend/src/components/ui/LogoutButton.tsx`, the **useState hook was called AFTER a conditional return statement**. This violates React's Rules of Hooks, which require all hooks to be called in the same order on every render.

### Problematic Code (BEFORE):
```typescript
export default function LogoutButton({ ... }) {
  const router = useRouter();
  const pathname = usePathname();
  const logoutStore = useAuthStore(state => state.logout);
  
  // Conditional useAuth hook call (BAD!)
  let logoutCtx: (() => Promise<void>) | null = null;
  try {
    logoutCtx = (useAuth && (useAuth() as any).logout) ? (useAuth() as any).logout : null;
  } catch (e) {
    logoutCtx = null;
  }

  // EARLY RETURN BEFORE ALL HOOKS!
  if (hideOnLogin && pathname) {
    const publicRoutes = ['/login', '/register', '/auth/login', '/auth/register'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/auth/')) {
      return null;  // ← EARLY RETURN HERE
    }
  }

  // useState AFTER the early return (HOOKS VIOLATION!)
  const [mobileOpen, setMobileOpen] = useState(false);
  // ...
}
```

## Solution
**All hooks must be called BEFORE any conditional returns:**

### Fixed Code (AFTER):
```typescript
export default function LogoutButton({ ... }) {
  // ✅ ALL HOOKS CALLED FIRST, IN CONSISTENT ORDER
  const router = useRouter();
  const pathname = usePathname();
  const logoutStore = useAuthStore(state => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);  // ← Moved BEFORE early return
  
  // useAuth called unconditionally
  let authContext = null;
  try {
    authContext = useAuth();
  } catch (e) {
    authContext = null;
  }
  const logoutCtx = authContext?.logout || null;

  // ✅ Conditional returns AFTER all hooks
  if (hideOnLogin && pathname) {
    const publicRoutes = ['/login', '/register', '/auth/login', '/auth/register'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/auth/')) {
      return null;
    }
  }
  // ... rest of component
}
```

## Files Modified
1. `/my-frontend/src/components/ui/LogoutButton.tsx`
   - Moved `useState(false)` call before conditional return
   - Changed `useAuth()` from conditional try-catch call to unconditional call with error handling

2. `/my-frontend/src/components/hub-incharge/HubInchargeApp.tsx`
   - Added clarifying comment about hook ordering (already correct)

## Testing
After the fix, the hub-incharge login should work without the React hooks error.

### Manual Test:
1. Start frontend: `cd my-frontend && npm run dev`
2. Navigate to: `http://localhost:3000/auth/portals`
3. Click "Hub Incharge Portal"
4. Login with hub-incharge credentials
5. Should see dashboard without React error

### With Playwright (if needed):
```bash
cd my-frontend
npx playwright test --headed --project=chromium
```

## React Rules of Hooks Reminder
✅ **DO:**
- Call hooks at the top level of component
- Call hooks in the same order every render
- Call hooks before any conditional returns

❌ **DON'T:**
- Call hooks inside loops, conditions, or nested functions
- Call hooks after early returns
- Call hooks conditionally

## Related Issues
- Backend logout fixes: See `LOGOUT_FIX_FINAL_STATUS.md`
- Redis fallback: See `my-backend/lib/redisClient.js`

## Status
✅ **FIXED** - Hub incharge login should now work correctly.
