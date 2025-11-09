# 🔧 Fix: "Application failed to respond" Error

## What Happened?

The error **"Application failed to respond"** is a **browser timeout**, not a server error.

Your Mattermost server is **running fine** ✅ (verified via ping)

## Quick Fix (Try This First):

### Option 1: Refresh Browser
1. **Hard refresh**: Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. Wait 5 seconds for full page load
3. Try uploading plugin again

### Option 2: Clear Browser Cache
1. Go to System Console
2. Log out completely
3. Close browser tab
4. Open new tab
5. Log back in
6. Try upload again

### Option 3: Use Different Browser
1. Open **Chrome** (if using Safari) or vice versa
2. Go to: https://mattermost-production-84fd.up.railway.app
3. Login and try upload

## If Still Having Issues:

### Check Server Status:
```bash
curl https://mattermost-production-84fd.up.railway.app/api/v4/system/ping
```
Should return: `{"status":"OK"}`

### Restart Mattermost:
Run this in terminal:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway down
railway up
```

Wait ~30 seconds, then refresh browser.

## Alternative: Upload via CLI

If browser keeps failing, upload the plugin via Railway CLI:

```bash
# 1. Copy plugin to Railway project
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# 2. SSH into Railway container
railway run bash

# 3. Inside container, download plugin
cd /mattermost/plugins
# (You'll need to use wget or copy manually)
```

## Most Likely Solution:

**Just refresh the page!** The "Application failed to respond" is usually a temporary UI glitch.

1. Press `Cmd + R` to refresh
2. Wait for page to load
3. Click "Choose File"
4. Select plugin
5. Click "Upload"

Should work now! ✅

---

## Pro Tip: Use Railway Logs

Check if upload is working in background:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway logs --tail 50 | grep -i "plugin"
```

If you see plugin logs, it's working even if UI shows error!
