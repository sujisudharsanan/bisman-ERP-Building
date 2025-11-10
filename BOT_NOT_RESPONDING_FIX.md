# 🚨 Mattermost Bot Not Responding - Troubleshooting Guide

## Current Status ✅
- ✅ Backend is running
- ✅ Bot endpoint responding: `http://localhost:3000/api/mattermost/health`
- ✅ Plugin package ready (24MB)
- ⚠️ Mattermost server status unknown

---

## 🔍 Why the Bot Isn't Responding

There are 5 main reasons:

### 1. **Plugin Not Enabled** (Most Common)
The plugin is uploaded but the Enable toggle is OFF.

### 2. **Wrong Plugin Uploaded**
You uploaded an old version that doesn't work.

### 3. **Bot Not Mentioned Correctly**
You typed "erpbot hello" instead of "@erpbot hello"

### 4. **Plugin Failed to Start**
There's an error in Mattermost logs.

### 5. **Mattermost Server Not Running**
The Mattermost server itself is down.

---

## ✅ Step-by-Step Fix Guide

### Step 1: Check Mattermost is Running

**What to check:**
- Can you access Mattermost in your browser?
- What's the URL? (Usually `http://localhost:8065` or on Railway)

**If Mattermost is NOT running:**
```bash
# Check if it's a Docker container
docker ps | grep mattermost

# Or if it's on Railway
# Check your Railway dashboard
```

**Action:** Start Mattermost if it's not running.

---

### Step 2: Verify Plugin Upload

**Go to Mattermost:**
1. Click your profile picture (top right)
2. Click **"System Console"**
3. Navigate to **Plugins → Plugin Management**

**What you should see:**
```
✅ ERP Assistant (com.bisman.erp.assistant)
   Status: Running ✓
   Version: 1.0.0
   [Enable] toggle is ON (blue/green)
```

**If plugin is NOT there:**
- Click **"Choose File"**
- Select: `/Users/abhi/Desktop/BISMAN EP/erp-assistant/erp-assistant-complete.tar.gz`
- Click **"Upload"**
- Wait for upload to complete
- Toggle **"Enable"** to ON

**If you see an error:**
- Take a screenshot of the error
- It will tell us what's wrong

---

### Step 3: Check Plugin Status

**In System Console → Plugins:**

**Good Status (✅):**
```
ERP Assistant
├─ Status: Running ✓
├─ Version: 1.0.0  
└─ No error messages
```

**Bad Status (❌):**
```
ERP Assistant
├─ Status: Failed to start ✗
└─ Error: [error message here]
```

**If status is "Failed":**
1. Click on the plugin name
2. Read the error message
3. It usually says one of these:
   - "Unrecognized remote plugin message" → Wrong plugin uploaded
   - "File not found: plugin-linux-amd64" → Corrupt upload
   - "Unable to start plugin" → Plugin binary issue

**Solution for Failed Status:**
1. Remove the plugin (click "Remove")
2. Re-upload `erp-assistant-complete.tar.gz`
3. Enable it again

---

### Step 4: Verify Bot User Exists

**In Mattermost:**
1. Click the search bar (top)
2. Type: `@erpbot`
3. You should see a user with a **BOT** badge

**If bot user doesn't exist:**
The plugin didn't activate properly. Check System Console → Server Logs for errors.

**If bot user exists but greyed out:**
The bot is disabled. Go to System Console → User Management → Bot Accounts → Enable @erpbot

---

### Step 5: Test Bot in Channel

**IMPORTANT:** You must use the @ symbol!

**✅ Correct way:**
```
@erpbot hello
```

**❌ Wrong way:**
```
erpbot hello
hey erpbot
erpbot can you help
```

**Where to test:**
- ✅ Public channel (like "Town Square" or "Off-Topic")
- ✅ Private channel (if bot is added to channel)
- ❌ Direct Messages (bot might not work in DMs)

**Test commands:**
1. `@erpbot hello`
2. `@erpbot help`
3. `@erpbot show my invoices`

**Expected response time:** 1-3 seconds

**If no response after 5 seconds:**
- Plugin is not running
- Bot is not enabled
- You're not mentioning it correctly

---

### Step 6: Check Server Logs

**In System Console:**
1. Go to **Reporting → Server Logs**
2. Look for recent logs
3. Search for: "erpbot" or "ERP Assistant"

**What to look for:**

**✅ Good logs:**
```
[INFO] ERP Assistant Plugin activated successfully!
[INFO] Bot user @erpbot created
[INFO] MessageHasBeenPosted: Processing message from user123
```

**❌ Bad logs:**
```
[ERROR] Failed to start plugin: com.bisman.erp.assistant
[ERROR] Unrecognized remote plugin message
[ERROR] Plugin binary not executable
```

**If you see errors:**
- Copy the error message
- Remove and re-upload the plugin
- Make sure you're uploading the NEW plugin (24MB, not old versions)

---

## 🎯 Quick Diagnostic Checklist

Run through this checklist in order:

### Backend Check
- [ ] Backend is running: `curl http://localhost:3000/api/health`
- [ ] Bot endpoint works: `curl http://localhost:3000/api/mattermost/health`

### Mattermost Check
- [ ] Can access Mattermost in browser
- [ ] Can login to Mattermost
- [ ] Have System Console access (admin account)

### Plugin Check
- [ ] Plugin shows in Plugin Management
- [ ] Plugin status is "Running" (not "Failed")
- [ ] Enable toggle is ON (blue/green)
- [ ] No error messages displayed

### Bot Check
- [ ] @erpbot user exists (search for it)
- [ ] Bot has BOT badge
- [ ] Bot is enabled (not greyed out)

### Channel Test
- [ ] In a public channel
- [ ] Type: `@erpbot hello`
- [ ] Wait 3 seconds
- [ ] Bot should respond

**If all checks pass but bot doesn't respond:**
- Restart the plugin (toggle OFF → ON)
- Check server logs for errors
- Try in a different channel

---

## 🔧 Advanced Troubleshooting

### Issue: Plugin keeps failing

**Solution 1: Check plugin package**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
tar -tzf erp-assistant/erp-assistant-complete.tar.gz
```

Should show:
```
server/dist/plugin-linux-amd64
server/dist/plugin-darwin-amd64
webapp/dist/main.js
plugin.json
README.md
```

**Solution 2: Rebuild plugin**
```bash
cd erp-assistant/server
GOOS=linux GOARCH=amd64 go build -o dist/plugin-linux-amd64 plugin_simple.go
cd ..
tar -czf erp-assistant-fresh.tar.gz server/dist/ webapp/dist/ plugin.json README.md
```

Upload the fresh package.

### Issue: Bot responds but says "backend not running"

**Check backend connection:**
```bash
curl http://localhost:3000/api/mattermost/health
```

Should return:
```json
{"status":"ok","team_slug":"erp","ping":"ok"}
```

**If backend not accessible from Mattermost:**
- Mattermost might be in Docker (can't reach localhost)
- Update plugin code with correct backend URL
- Use Railway URL instead of localhost

### Issue: Bot responds in some channels but not others

**Possible causes:**
1. Bot not added to private channel
2. Bot permissions restricted
3. Channel-specific settings

**Solution:**
- Add bot to channel: `/invite @erpbot`
- Check channel permissions
- Try in Town Square (always works)

---

## 📋 What to Share if Still Not Working

If bot still doesn't work, share:

1. **Plugin Status Screenshot**
   - System Console → Plugins → Plugin Management
   - Show the ERP Assistant plugin status

2. **Server Logs**
   - System Console → Server Logs
   - Last 20 lines mentioning "erpbot" or "plugin"

3. **Bot User Screenshot**
   - Search for @erpbot
   - Show if it exists and status

4. **Test Screenshot**
   - Show you typing: `@erpbot hello`
   - Show what happens (no response, error, etc.)

5. **Error Message**
   - Any error shown when uploading plugin
   - Any error shown when enabling plugin

---

## ✅ Expected Working Behavior

When everything works correctly:

**1. Upload Plugin**
```
✓ File uploaded successfully
✓ Plugin extracted and validated
✓ Plugin added to list
```

**2. Enable Plugin**
```
✓ Plugin enabled
✓ Status: Running
✓ Bot user @erpbot created
```

**3. Server Logs**
```
[INFO] ERP Assistant Plugin activated successfully!
```

**4. In Channel**
```
You: @erpbot hello

@erpbot: Hello! 👋 I'm your ERP Assistant. I can help you with:
• Invoice queries (pending, paid, status)
• Leave information (balance, requests)  
• Approval workflows
• Profile information

Try asking: show my pending invoices or check my leave balance
```

---

## 🚀 Quick Start Commands

Once bot is working, try these:

```
@erpbot hello
@erpbot help
@erpbot show my invoices
@erpbot check my leave balance
@erpbot show pending approvals
@erpbot my profile
@erpbot dashboard
```

---

## 📞 Still Need Help?

**Provide this information:**

1. Mattermost URL: ___________________
2. Plugin status: Running / Failed / Not uploaded
3. Bot user @erpbot: Exists / Doesn't exist
4. Test result when typing `@erpbot hello`: ___________________
5. Error message (if any): ___________________

**Most common fix:** Remove plugin → Re-upload → Enable → Test

---

## ✨ Success Checklist

You know it's working when:

- ✅ Plugin shows "Running" status
- ✅ @erpbot user exists with BOT badge
- ✅ Bot responds within 2 seconds to `@erpbot hello`
- ✅ No errors in server logs
- ✅ Bot gives helpful responses

**That's it! Your ERP Assistant should be chatting with you now! 🎉**
