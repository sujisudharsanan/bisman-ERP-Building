# 🧪 Spark Bot ERP Integration - Quick Test Guide

**Test these commands in order!**

---

## ⚡ Quick Test (2 minutes)

Open the chat and type these **one at a time**:

```
1. hi
   → Should mention pending task count

2. show dashboard
   → Should show summary with 4 counts

3. show pending tasks
   → Should list actual pending approvals

4. show payment requests
   → Should list recent payment requests

5. show notifications
   → Should display recent alerts

6. find user suji
   → Should search and show results

7. help
   → Should show updated command list

8. thanks
   → Bot says you're welcome
```

---

## 📊 Expected Results

### 1. Greeting (hi)
✅ Bot mentions pending task count  
Example: "You have 3 pending tasks"

### 2. Dashboard (show dashboard)
✅ Shows 4 metrics:
- Pending Approvals
- In-Process Tasks
- Completed Recently  
- Payment Requests

### 3. Pending Tasks (show pending tasks)
✅ Lists up to 3 tasks with:
- Client name
- Amount & currency
- Current level
- Status

### 4. Payment Requests (show payment requests)
✅ Lists up to 3 payments with:
- Request ID (PR-YYYY-MM-DD-XXXX)
- Client name
- Amount & currency
- Status

### 5. Notifications (show notifications)
✅ Shows recent alerts with:
- Priority indicator (🔴🟡🟢)
- Message text

### 6. User Search (find user [name])
✅ Confirmation message
✅ User list updates with results

### 7. Help (help)
✅ Shows ERP commands:
- Show pending tasks
- Show payment requests
- Show notifications
- Show dashboard
- Find users

---

## ✅ Success Criteria

**PASS if**:
- ✅ All 8 commands respond correctly
- ✅ Dashboard shows real numbers
- ✅ Pending tasks match backend
- ✅ Payment requests are accurate
- ✅ User search finds people
- ✅ No errors in console

**FAIL if**:
- ❌ Bot says "Loading your data..."
- ❌ Dashboard shows all zeros
- ❌ Commands don't respond
- ❌ Console shows errors

---

## 🔍 Verification Steps

After testing, verify:

1. **Open DevTools** (F12 or Cmd+Option+I)
2. **Check Console** - No red errors
3. **Check Network** - API calls successful:
   - `/api/chat-bot/user-data` → 200 OK
   - `/api/chat-bot/search-users` → 200 OK
4. **Check Data** - Numbers match your actual tasks/payments

---

## 🎯 Test Scenarios

### Scenario 1: New User (No Data)
```
Command: show pending tasks
Expected: "✅ Great news! You have no pending approvals!"
```

### Scenario 2: User with Tasks
```
Command: show pending tasks
Expected: List of 1-3 tasks with details
```

### Scenario 3: Search Non-Existent User
```
Command: find user xyz123abc
Expected: Search confirmation, empty results
```

---

## 🐛 Troubleshooting

### Problem: Bot says "Loading your data..."
**Fix**: 
1. Wait 5 seconds
2. Type command again
3. Check if backend is running

### Problem: Dashboard shows all zeros
**Fix**:
1. Check backend at `http://localhost:8000`
2. Verify you're logged in
3. Check auth token in cookies

### Problem: User search doesn't work
**Fix**:
1. Check Mattermost connection
2. Verify mattermostToken cookie exists
3. Try searching for your own username

---

## 📝 Test Log Template

```
Test Date: ___________
Tester: ___________

[ ] 1. Greeting - Shows pending count
[ ] 2. Dashboard - Shows 4 metrics
[ ] 3. Pending Tasks - Lists tasks
[ ] 4. Payment Requests - Lists payments
[ ] 5. Notifications - Shows alerts
[ ] 6. User Search - Finds users
[ ] 7. Help - Shows ERP commands
[ ] 8. No console errors

Overall: PASS / FAIL

Notes:
_______________________________
_______________________________
_______________________________
```

---

**Test Duration**: 2 minutes  
**Commands**: 8  
**Expected Success Rate**: 100% ✅
