# Mattermost Chat Embed Fix - Complete Guide

## Problem Summary
Your chat iframe was showing the ERP dashboard instead of Mattermost chat because:

1. **Initial Issue**: The code was pre-fetching URLs which loaded dashboard HTML
2. **Current Issue**: Railway Mattermost login page appears instead of auto-login working
3. **Root Cause**: Cookie handling between localhost HTTP and Railway HTTPS Mattermost

## What I've Fixed

### 1. Removed HTML Pre-fetching (✅ DONE)
- **File**: `my-frontend/src/components/chat/MattermostEmbed.tsx`
- **Change**: Removed the `fetch(initial)` call that was loading dashboard HTML
- **Result**: Iframe now loads actual Mattermost, not ERP dashboard

### 2. Simplified Cookie Handling (✅ DONE)
- **File**: `my-frontend/src/app/api/mattermost/login/route.ts`
- **Change**: Stripped `SameSite`, `Secure`, and `Domain` restrictions for local development
- **Why**: Browsers reject `SameSite=None; Secure` on HTTP localhost
- **Result**: Cookies should now flow through the proxy properly

### 3. Added Better Error Messages (✅ DONE)
- **File**: `my-frontend/src/components/chat/MattermostEmbed.tsx`
- **Change**: Enhanced error messages with health check info
- **Result**: You'll see clear messages about Docker/Mattermost status

### 4. Added White-Label Branding (✅ DONE)
- **Files**: Both chat components
- **Change**: CSS injection to hide "Mattermost" branding
- **Result**: Shows "Spark" instead of "Mattermost"

## Current Architecture

```
Browser (localhost:3000)
  │
  ├─ ERP Dashboard (React/Next.js)
  │    │
  │    └─ Chat Widget (ERPChatWidget)
  │         │
  │         └─ Mattermost Iframe (MattermostEmbed)
  │              │
  │              └─ src="/chat/erp/channels/town-square"
  │
  └─ Next.js Server
       │
       ├─ /api/mattermost/login → Proxies to Railway, rewrites cookies
       ├─ /api/mattermost/provision → Creates users/channels on Railway
       │
       └─ Rewrites:
            /chat/* → https://mattermost-production-84fd.up.railway.app/*
            /api/v4/* → https://mattermost-production-84fd.up.railway.app/api/v4/*
```

## Why You're Seeing the Login Page

The login page appears because:

1. **Cookie Isolation**: Even though we proxy through `/chat`, the cookies aren't persisting in the iframe
2. **Possible Railway Timeout**: Railway free tier may put Mattermost to sleep
3. **Cookie SameSite Issues**: Browsers are very strict about third-party cookies

## Solutions (Choose One)

### Solution A: Run Mattermost Locally (✅ RECOMMENDED for Development)

This is the **cleanest solution** because everything runs on localhost with same-origin cookies.

#### Steps:
```bash
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
# Install and start Docker Desktop app

# 2. Verify Docker is running
docker --version
# Should show: Docker version 24.x.x or similar

# 3. Start Mattermost (from project root)
cd "/Users/abhi/Desktop/BISMAN ERP"
npm run dev:mm

# 4. Wait for Mattermost to start (takes 30-60 seconds)
# You'll see: "Mattermost is running on http://localhost:8065"

# 5. Update .env.local to use local Mattermost
# Change:  MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
# To:      MM_BASE_URL=http://localhost:8065
```

#### Then restart your dev server:
```bash
npm run dev:both
```

**Benefits**:
- ✅ Same-origin cookies work perfectly
- ✅ No network latency
- ✅ Full control and debugging
- ✅ Works offline

---

### Solution B: Fix Railway Cookie Issues (Complex, for Production)

If you must use Railway Mattermost for local development:

#### 1. Enable HTTPS for localhost
Use a tool like `mkcert` to run localhost with HTTPS:

```bash
# Install mkcert
brew install mkcert
mkcert -install

# Generate certificate for localhost
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
mkcert localhost

# Update package.json dev script to use HTTPS
# Change: "dev": "next dev"
# To:     "dev": "NODE_OPTIONS='--use-openssl-ca' next dev --experimental-https"
```

#### 2. Configure Mattermost CORS

You need to configure Railway Mattermost to allow your localhost origin.

**If you have access to Railway Mattermost admin**:
1. Go to System Console → Web Server → CORS
2. Add `http://localhost:3000` and `https://localhost:3000`
3. Set `AllowCorsFrom` to include your origins

**If using config.json** (requires Railway deployment):
```json
{
  "ServiceSettings": {
    "AllowCorsFrom": "http://localhost:3000 https://localhost:3000",
    "CorsAllowCredentials": true
  }
}
```

#### 3. Session Token in URL (Alternative Workaround)

Modify the iframe approach to use personal access tokens:

```typescript
// In MattermostEmbed.tsx
const tokenResp = await fetch('/api/mattermost/get-token');
const { token } = await tokenResp.json();
setSrc(`/chat/erp/channels/town-square?access_token=${token}`);
```

Then create `/api/mattermost/get-token` endpoint that returns a personal access token.

---

### Solution C: Use Mattermost Personal Access Tokens

This bypasses cookie issues entirely:

1. Create a PAT in Mattermost admin
2. Store it securely
3. Pass it via Authorization header or URL parameter

---

## Recommended Next Steps

### Option 1: Local Development (Fastest)
1. ✅ Install Docker Desktop
2. ✅ Run `npm run dev:mm`
3. ✅ Update `.env.local`: `MM_BASE_URL=http://localhost:8065`
4. ✅ Restart dev server
5. ✅ Test chat widget

### Option 2: Railway Only (For Testing Production Setup)
1. Keep Railway Mattermost as-is
2. Deploy your ERP to Railway/Vercel (same HTTPS)
3. Configure CORS in Mattermost
4. Test in deployed environment

---

## Testing Steps (After Applying Fix)

1. **Restart your dev server**:
   ```bash
   # Stop current server (Ctrl+C if running)
   npm run dev:both
   ```

2. **Open browser and clear cache**:
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"

3. **Open chat widget**:
   - Click the chat icon
   - Check browser console for logs: `[MattermostEmbed] Login OK, loading iframe:`

4. **Verify cookies**:
   - DevTools → Application → Cookies → `localhost:3000`
   - Look for `MMAUTHTOKEN` and `MMCSRF`

5. **If still showing login page**:
   - Check console for errors
   - Verify `/api/mattermost/health` returns `{"status":"ok"}`
   - Test login manually: `curl -X POST http://localhost:3000/api/mattermost/login ...`

---

## Files Changed

1. ✅ `my-frontend/src/components/chat/MattermostEmbed.tsx`
   - Removed HTML pre-fetching
   - Added health check before iframe load
   - Added branding injection
   - Added detailed logging

2. ✅ `my-frontend/src/app/api/mattermost/login/route.ts`
   - Simplified cookie handling for local dev
   - Removed SameSite/Secure restrictions on HTTP localhost

3. ✅ `my-frontend/src/components/ERPChatWidget.tsx`
   - Changed "Mattermost Bot" → "Spark Assistant"
   - White-label branding

4. ✅ `my-frontend/src/app/api/mattermost/test-cookies/route.ts` (NEW)
   - Diagnostic endpoint to test cookie flow

---

## Debugging Commands

```bash
# Test health
curl http://localhost:3000/api/mattermost/health

# Test login
curl -i -X POST http://localhost:3000/api/mattermost/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Welcome@2025"}'

# Test cookie flow
curl -i -X POST http://localhost:3000/api/mattermost/test-cookies

# Check if Mattermost is running (local)
curl http://localhost:8065/api/v4/system/ping

# Check if Railway Mattermost is up
curl https://mattermost-production-84fd.up.railway.app/api/v4/system/ping
```

---

## Expected Behavior After Fix

### ✅ Success Indicators:
1. Chat widget opens showing Mattermost channels (not login page)
2. Browser console shows: `[MattermostEmbed] Login OK, loading iframe: /chat/erp/channels/town-square`
3. DevTools → Cookies shows `MMAUTHTOKEN`
4. Can send/receive messages
5. "Mattermost" branding is hidden, shows "Spark" instead

### ❌ Still Need Help If:
1. Login page persists after restart
2. Console shows `mm_login_401` errors
3. Health check fails
4. Cookies aren't being set

---

## Production Deployment Notes

When deploying to production (Railway/Vercel):

1. **Use HTTPS for both ERP and Mattermost**
2. **Update cookie settings**:
   ```typescript
   // In login/route.ts
   SameSite=None; Secure  // For HTTPS cross-domain
   ```
3. **Configure CORS in Mattermost**
4. **Use environment-specific MM_BASE_URL**
5. **Consider OAuth/SSO for enterprise security**

---

## Quick Checklist

- [ ] Docker Desktop installed and running (for local Mattermost)
- [ ] `.env.local` has `MM_BASE_URL=http://localhost:8065` (for local)
- [ ] Dev server restarted (`npm run dev:both`)
- [ ] Browser cache cleared
- [ ] Chat widget tested
- [ ] Cookies verified in DevTools
- [ ] Can send messages successfully

---

## Need More Help?

If the issue persists, share:
1. Browser console output (when opening chat)
2. Network tab showing `/api/mattermost/login` response headers
3. Cookies tab showing what's set on `localhost:3000`
4. Whether you're using local Docker Mattermost or Railway

I'll help debug further!
