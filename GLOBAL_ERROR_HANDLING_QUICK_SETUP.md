# 🚀 Global Error Handling - Quick Setup Guide

## Installation Complete ✅

The global error handling system has been installed across your application. Here's what you need to do to activate it:

---

## Backend Setup (5 minutes)

### Step 1: Restart Server
The error tables will be created automatically on startup.

```bash
cd my-backend
npm run dev
```

Look for these messages in console:
```
✅ Error logs table initialized
✅ Login attempts table initialized
✅ Error handling tables initialized
```

### Step 2: Verify Database Tables
Check that these tables were created:
- `error_logs` - Stores all application errors
- `login_attempts` - Tracks login failures for rate limiting

```sql
-- In your PostgreSQL database
SELECT * FROM error_logs LIMIT 5;
SELECT * FROM login_attempts LIMIT 5;
```

### Step 3: Test Error Logging
Try logging in with wrong credentials and check:

```bash
# Check error log file
cat my-backend/logs/errors.log

# Check database
SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 5;
```

---

## Frontend Setup (2 minutes)

### Step 1: Restart Dev Server
```bash
cd my-frontend
npm run dev
```

### Step 2: Verify Global Toast
1. Open browser to `http://localhost:3000`
2. Open DevTools console
3. Try making an API call that fails
4. You should see a toast notification in the top-right corner

### Step 3: Test Login Error Handling (Optional)
To add the enhanced login error handling to your login page:

```tsx
// In: my-frontend/src/app/auth/login/page.tsx

import { 
  useLoginErrorHandling, 
  RateLimitError, 
  ErrorAlert 
} from '@/components/login/LoginErrorHandling';

export default function LoginPage() {
  // Add this hook
  const { 
    rateLimitError, 
    genericError, 
    loginDisabled, 
    handleLoginError, 
    clearErrors 
  } = useLoginErrorHandling();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors(); // Clear previous errors
    setLoading(true);

    try {
      const user = await login(email, password);
      // ... rest of success logic
    } catch (err) {
      handleLoginError(err); // ✅ Use this instead of setError()
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Add these error displays */}
      {rateLimitError && (
        <RateLimitError 
          error={rateLimitError} 
          retryAfter={rateLimitError.retryAfter || 900} 
        />
      )}
      
      {genericError && (
        <ErrorAlert 
          message={genericError} 
          onDismiss={clearErrors} 
        />
      )}
      
      {/* ... rest of form ... */}
      
      <button 
        type="submit" 
        disabled={loading || loginDisabled} // ✅ Add loginDisabled
      >
        {loginDisabled ? 'Login Disabled' : 'Sign In'}
      </button>
    </form>
  );
}
```

---

## Quick Test (3 minutes)

### Test 1: Rate Limiting ⏱️
1. Go to login page
2. Enter wrong password 5 times
3. ✅ You should see: "Too many failed attempts" with countdown timer
4. ✅ Login button should be disabled
5. Wait for timer to reach 0
6. ✅ Button should re-enable

### Test 2: Invalid Credentials 🔒
1. Enter wrong email/password (< 5 attempts)
2. ✅ You should see: "Incorrect email or password"
3. ✅ Error toast should appear in top-right

### Test 3: Network Error 🌐
1. Stop backend server
2. Try logging in
3. ✅ You should see: "Network connection failed"
4. ✅ Error toast should appear

### Test 4: Error Logging 📝
1. Trigger any error
2. Check backend logs:
   ```bash
   tail -f my-backend/logs/errors.log
   ```
3. ✅ You should see structured JSON error entries

### Test 5: Database Logging 🗄️
1. Trigger multiple errors
2. Query database:
   ```sql
   SELECT 
     error_code, 
     message, 
     http_status, 
     user_email, 
     ip_address, 
     timestamp 
   FROM error_logs 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```
3. ✅ You should see all errors logged with context

---

## Configuration (Optional)

### Adjust Rate Limiting
Edit `my-backend/middleware/loginRateLimiter.js`:

```javascript
const CONFIG = {
  MAX_ATTEMPTS: 5,              // Change max attempts
  WINDOW_MS: 15 * 60 * 1000,    // Change time window
  BLOCK_DURATION_MS: 15 * 60 * 1000, // Change block duration
};
```

### Adjust Toast Display Time
Edit `my-frontend/src/components/GlobalErrorToast.tsx`:

```typescript
const dismissTime = error.errorCode === 'LOGIN_LIMIT_REACHED' 
  ? 15000  // Rate limit toast duration (15s)
  : 8000;  // Other errors duration (8s)
```

### Add Custom Error Messages
Edit `my-frontend/src/lib/errorCodes.ts`:

```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  // Add your custom error codes here
  MY_CUSTOM_ERROR: 'Your custom user-friendly message',
  // ...existing codes
};
```

---

## Troubleshooting

### ❌ Errors not showing in toast
**Solution**: Refresh browser, check console for JavaScript errors

### ❌ Rate limiting not working
**Solution**: Check database connection, verify `login_attempts` table exists

### ❌ Errors not logged to database
**Solution**: Check Prisma connection, verify `error_logs` table exists

### ❌ Login button not re-enabling
**Solution**: Check browser console for errors, verify `useLoginErrorHandling` hook is used

---

## What's Already Working

Without any additional setup, these features are **already active**:

✅ **Global error toasts** - All API errors show automatically  
✅ **Error logging** - All errors logged to console, file, and database  
✅ **Token refresh** - Automatic on 401 errors  
✅ **Network error handling** - Catches connection failures  
✅ **Structured error responses** - Consistent JSON format from backend  

---

## Next Steps

1. ✅ Complete the 5 quick tests above
2. 📖 Read full documentation: `GLOBAL_ERROR_HANDLING_IMPLEMENTATION.md`
3. 🎨 Customize error messages and colors to match your brand
4. 📊 Monitor error logs in production
5. 🔧 Adjust rate limits based on usage patterns

---

## Need Help?

- **Full Documentation**: `GLOBAL_ERROR_HANDLING_IMPLEMENTATION.md`
- **Error Codes Reference**: See documentation for all 32 error codes
- **Testing Checklist**: Complete testing guide in documentation

---

## Summary

🎉 **You're all set!** The error handling system is fully implemented and active. All errors are now:
- Caught and displayed to users
- Logged with full context
- Handled consistently
- User-friendly

Just restart both servers and start testing! 🚀
