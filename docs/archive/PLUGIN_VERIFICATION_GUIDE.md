# ✅ Mattermost ERP Assistant Plugin - Verification Guide

**Date:** November 10, 2025  
**Status:** Plugin Uploaded - Ready for Testing

---

## 🎯 Plugin Upload Checklist

### ✅ Pre-Upload Verification
- [x] **Plugin Package:** `erp-assistant-complete.tar.gz` (24MB)
- [x] **Linux Binary:** `plugin-linux-amd64` (24MB) - Uses RPC protocol
- [x] **macOS Binary:** `plugin-darwin-amd64` (18MB) - For testing
- [x] **Webapp Bundle:** `webapp/dist/main.js` (1.35KB)
- [x] **Manifest:** `plugin.json` configured correctly
- [x] **Backend Ready:** `/api/mattermost/health` responding ✅

### 📋 Upload Steps Completed
1. ✅ Removed old failed plugin from Mattermost
2. ✅ Uploaded `erp-assistant-complete.tar.gz`
3. ⏳ **NOW:** Enable and test the plugin

---

## 🧪 Testing Instructions

### Step 1: Enable the Plugin

**In Mattermost System Console:**
1. Go to **Plugins → Plugin Management**
2. Find **"ERP Assistant (com.bisman.erp.assistant)"**
3. Toggle **"Enable"** switch to ON
4. Check for any error messages

**Expected Result:**
```
✅ Plugin Status: Running
✅ No errors in plugin logs
```

### Step 2: Verify Plugin Started

**Check Mattermost Server Logs:**
```bash
# Look for this message:
✅ ERP Assistant Plugin activated successfully!
```

**In System Console → Logs:**
- Should see: "ERP Assistant Plugin activated successfully!"
- Should NOT see: "Unrecognized remote plugin message"
- Should NOT see: "unable to start plugin"

### Step 3: Test Bot in Channel

**Go to any Mattermost channel and type:**

#### Test 1: Basic Hello
```
@erpbot hello
```

**Expected Response:**
```
Hello! 👋 I'm your ERP Assistant. I can help you with:
• Invoice queries (pending, paid, status)
• Leave information (balance, requests)
• Approval workflows
• Profile information

Try asking: show my pending invoices or check my leave balance
```

#### Test 2: Invoice Query
```
@erpbot show my pending invoices
```

**Expected Response:**
```
📄 Pending Invoices:
To show your pending invoices, I need to connect to the backend at http://localhost:3000. 
Please ensure the ERP backend is running.
```

#### Test 3: Leave Balance
```
@erpbot check my leave balance
```

**Expected Response:**
```
🏖️ Leave Balance:
To check your leave balance, I need to connect to the backend. 
Please ensure the ERP backend is running at http://localhost:3000.
```

#### Test 4: Approval Query
```
@erpbot show pending approvals
```

**Expected Response:**
```
✅ Approvals:
To show pending approvals, I need to connect to the backend. 
Please ensure the ERP backend is running at http://localhost:3000.
```

---

## 🔍 Troubleshooting

### Issue 1: Plugin Won't Start

**Error:** "unable to start plugin: Unrecognized remote plugin message"

**Cause:** Old plugin binary trying to run HTTP server instead of RPC

**Solution:**
1. Remove the plugin completely
2. Re-upload `erp-assistant-complete.tar.gz` (new version with RPC)
3. Enable plugin

### Issue 2: Bot Not Responding

**Symptoms:** @erpbot doesn't respond in channels

**Checks:**
1. **Plugin Enabled?** System Console → Plugins → Check "Enable" toggle
2. **Bot User Created?** Should auto-create @erpbot user
3. **Permissions?** Bot needs permission to post in channels

**Fix:**
```bash
# In Mattermost server logs, look for:
"ERP Assistant Plugin activated successfully!"

# If missing, restart the plugin:
System Console → Plugins → Disable → Enable
```

### Issue 3: Backend Connection Fails

**Error in response:** "I need to connect to the backend"

**Checks:**
1. **Backend Running?**
   ```bash
   curl http://localhost:3000/api/mattermost/health
   # Should return: {"status":"ok","team_slug":"erp","ping":"ok"}
   ```

2. **Backend URL Correct?** Check `plugin_simple.go`:
   ```go
   p.backendURL = "http://localhost:3000"
   ```

3. **Network Access?** Mattermost server can reach backend

**Fix:**
- Ensure backend is running: `npm run dev` in my-backend/
- Update backend URL in plugin if needed
- Rebuild plugin with correct URL

---

## 📊 Backend Integration Status

### ✅ Backend Endpoints Ready

#### 1. Health Check
```bash
curl http://localhost:3000/api/mattermost/health
```
**Status:** ✅ Working
```json
{
  "status": "ok",
  "team_slug": "erp",
  "ping": "ok"
}
```

#### 2. Query Endpoint
```bash
curl -X POST http://localhost:3000/api/mattermost/query \
  -H "Content-Type: application/json" \
  -d '{"intent":"invoice_pending","user_id":"123"}'
```
**Status:** ✅ Configured (auth required)

#### 3. Webhook Endpoint
```bash
curl -X POST http://localhost:3000/api/mattermost/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"approval_updated","data":{}}'
```
**Status:** ✅ Configured (auth required)

### Backend Features Available

**✅ Real-time Data Queries:**
- Invoice status (pending, paid, overdue)
- Leave balance and requests
- Pending approvals
- User profile information
- Dashboard statistics

**✅ Query Handlers:**
- `handleInvoiceQuery()` - Real invoice data from DB
- `handleLeaveQuery()` - Leave balance and requests
- `handleApprovalQuery()` - Pending approvals
- `handleUserInfo()` - Profile information
- `handleDashboardStats()` - Overview statistics

---

## 🎯 Expected Plugin Behavior

### Current Phase: Basic Responses (Offline Mode)

**What Works Now:**
- ✅ Bot responds to @mentions
- ✅ Intent detection (invoice, leave, approval)
- ✅ Friendly error messages
- ✅ Help commands
- ✅ Conversation tracking (100 messages per user)

**Next Phase: Backend Integration (When Backend is Connected)**

The plugin will automatically query the backend API when:
1. Backend is running and accessible
2. User asks specific queries (invoices, leave, approvals)
3. Authentication is configured

**Backend will provide:**
- Real invoice data from PostgreSQL
- Actual leave balances
- Live approval workflows
- User profile information

---

## 📈 Plugin Architecture

### How It Works

```
User Message (@erpbot hello)
    ↓
Mattermost Server
    ↓
Plugin RPC Interface (MessageHasBeenPosted)
    ↓
Intent Detection (detectIntent)
    ↓
    ├─→ General Query → Local Response
    └─→ Specific Query → Backend API Call
                            ↓
                    http://localhost:3000/api/mattermost/query
                            ↓
                    Real ERP Data (Invoices, Leave, etc.)
                            ↓
                    Format Response
                            ↓
                    Return to Channel
```

### Plugin Components

**1. Server Binary (`plugin-linux-amd64`):**
- Implements Mattermost Plugin RPC protocol
- Message handler (`MessageHasBeenPosted`)
- Intent detection system
- Backend API client
- Conversation history (100 messages/user)
- Spell correction (200+ ERP terms)

**2. Webapp Bundle (`main.js`):**
- Minimal stub for Mattermost validation
- No client-side functionality needed

**3. Backend Integration (`mattermostBot.js`):**
- Query endpoint: `/api/mattermost/query`
- Webhook endpoint: `/api/mattermost/webhook`
- Health check: `/api/mattermost/health`

---

## 🔐 Security Features

**✅ Authentication:**
- Backend endpoints require JWT tokens
- User context passed to all queries
- Tenant isolation (multi-tenant support)

**✅ Data Security:**
- Real-time database queries (no caching sensitive data)
- User permissions respected
- Audit logging for all queries

---

## 📝 Quick Test Commands

### In Mattermost Channel:

```
# Basic
@erpbot hello
@erpbot help

# Invoices
@erpbot show my invoices
@erpbot pending invoices
@erpbot invoice status

# Leave
@erpbot check my leave balance
@erpbot show leave requests
@erpbot leave status

# Approvals
@erpbot show pending approvals
@erpbot approval status
@erpbot my approvals

# Profile
@erpbot my profile
@erpbot my info

# Dashboard
@erpbot dashboard
@erpbot overview
```

---

## ✅ Success Criteria

### Plugin Upload Success
- [x] Plugin uploaded without errors
- [ ] Plugin status shows "Running"
- [ ] No error messages in logs
- [ ] Bot user @erpbot created automatically

### Basic Functionality
- [ ] Bot responds to @erpbot mentions
- [ ] Help command shows available features
- [ ] Intent detection works (invoices, leave, approvals)
- [ ] Error messages are user-friendly

### Backend Integration (Next Step)
- [ ] Backend connection successful
- [ ] Real invoice data displayed
- [ ] Leave balance queries work
- [ ] Approval workflows accessible

---

## 🚀 Next Steps After Upload

1. **Enable the Plugin** in System Console
2. **Test Basic Commands** (@erpbot hello)
3. **Verify Bot Responses** in channel
4. **Check Server Logs** for any errors
5. **Test Backend Integration** (if backend running)

---

## 📞 Support Information

**Plugin ID:** com.bisman.erp.assistant  
**Version:** 1.0.0  
**Repository:** github.com/sujisudharsanan/bisman-ERP-Building  
**Backend:** Express.js + PostgreSQL  
**Mattermost Version Required:** 6.2.1+

---

## 🎉 Congratulations!

Your Mattermost ERP Assistant Plugin is uploaded and ready to use!

**What makes this plugin special:**
- ✅ Proper Mattermost RPC protocol (not HTTP server)
- ✅ 100-message conversation memory
- ✅ Spell correction with 200+ ERP terms
- ✅ Intent detection system
- ✅ Backend integration ready
- ✅ Cross-platform support (Linux, macOS)
- ✅ 24MB optimized package

**Start testing now:**
```
@erpbot hello
```

Happy chatting! 🤖
