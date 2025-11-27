# 🔍 Railway Logs - Frontend vs Backend Guide

**Date**: November 27, 2025  
**Current Task**: Identify which service logs you're viewing

---

## 🎯 HOW TO CHECK WHICH SERVICE YOU'RE VIEWING

### Method 1: Check Railway Status
```bash
railway status
```

This will show:
- Project name
- **Service name** ← This tells you which service
- Environment
- Current deployment

---

### Method 2: List All Services
```bash
railway service
```

This shows all services in your project and highlights which one is currently selected.

---

## 🔄 HOW TO SWITCH BETWEEN SERVICES

### View Backend Logs
```bash
# Method 1: Specify service explicitly
railway logs --service backend

# Method 2: Switch to backend, then view logs
railway service
# Select: backend from the list
railway logs
```

---

### View Frontend Logs
```bash
# Method 1: Specify service explicitly
railway logs --service frontend

# Method 2: Switch to frontend, then view logs
railway service
# Select: frontend from the list
railway logs
```

---

## 📊 QUICK COMMANDS FOR BOTH SERVICES

### View Backend Logs (Last 50 lines)
```bash
railway logs --service backend --lines 50
```

### View Frontend Logs (Last 50 lines)
```bash
railway logs --service frontend --lines 50
```

### Stream Backend Logs (Real-time)
```bash
railway logs --service backend
```

### Stream Frontend Logs (Real-time)
```bash
railway logs --service frontend
```

---

## 🔍 HOW TO IDENTIFY LOGS

### Backend Logs Usually Show:
```
✅ Database connected
✅ Prisma client initialized
✅ Server listening on port 3000
🚀 BISMAN ERP Backend Server Started
[app.js] Routes loaded
[startup] Next.js ready
```

### Frontend Logs Usually Show:
```
▲ Next.js ready
Compiled successfully
Ready on http://localhost:3000
```

---

## 🎯 WHAT YOU NEED TO CHECK RIGHT NOW

Since we just set the **backend environment variables**, you should check the **BACKEND logs** to verify:

### Check Backend Deployment Status
```bash
railway logs --service backend --lines 50
```

**Look for:**
- ✅ `DATABASE_URL` is set
- ✅ `FRONTEND_URL` configured
- ✅ `Database connected`
- ✅ `CORS configured with: https://bisman-erp-frontend-production.up.railway.app`
- ✅ `Server started successfully`

**Should NOT see:**
- ❌ `Missing required environment variable: DATABASE_URL`
- ❌ `Missing required environment variable: FRONTEND_URL`

---

## 📋 COMPLETE LOG CHECKING SEQUENCE

### 1. Check Backend Logs (What We Just Fixed)
```bash
railway logs --service backend --lines 30
```

### 2. Check for Success Messages
Look for:
```
✅ Database connected
✅ CORS configured
✅ Server started successfully
```

### 3. If Deployment Not Complete Yet
Stream live logs:
```bash
railway logs --service backend
```

Wait for deployment to finish (2-3 minutes).

### 4. Check Frontend Logs (Optional)
```bash
railway logs --service frontend --lines 30
```

---

## 🚨 TROUBLESHOOTING

### "Which service am I viewing?"
Run:
```bash
railway status
```
Look for the **Service** line - that's what you're viewing.

### "I want to see backend logs but I'm viewing frontend"
Switch to backend:
```bash
railway service
# Select: backend
railway logs
```

Or specify directly:
```bash
railway logs --service backend
```

### "I need to see both logs at once"
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
railway logs --service backend
```

**Terminal 2 (Frontend):**
```bash
railway logs --service frontend
```

---

## 🎯 RECOMMENDED: CHECK BACKEND LOGS NOW

Since we just set environment variables for the **backend**, run:

```bash
railway logs --service backend --lines 50
```

This will show you:
1. If the backend redeployed with new variables
2. If DATABASE_URL is working
3. If FRONTEND_URL is configured
4. If the server started successfully

---

## 📊 COMMON LOG PATTERNS

### Backend Successful Deployment:
```log
[inf] Starting Container
[inf] RAILWAY CONTAINER STARTED
[inf] Starting Node.js application...
[inf] ✅ Environment validation passed
[inf] ✅ Database connected
[inf] ✅ All routes loaded
[inf] 🚀 BISMAN ERP Backend Server Started Successfully
[inf] 📡 Server URL: http://0.0.0.0:3000
```

### Backend Failed Deployment:
```log
[err] ⚠️ Missing required environment variable: DATABASE_URL
[err] ⚠️ Missing required environment variable: FRONTEND_URL
[err] ❌ Database connection failed
```

### Frontend Successful Deployment:
```log
[inf] ▲ Next.js 14.x.x
[inf] - Local: http://localhost:3000
[inf] ✓ Ready in 2.3s
[inf] ✓ Compiled successfully
```

---

## 🎬 RUN THIS NOW

```bash
# 1. Check which service you're viewing
railway status

# 2. View backend logs (what we need to verify)
railway logs --service backend --lines 50

# 3. If deployment in progress, stream logs
railway logs --service backend
```

---

## ✅ WHAT TO LOOK FOR IN BACKEND LOGS

After setting environment variables, you should see:

1. ✅ **No DATABASE_URL errors**
2. ✅ **No FRONTEND_URL errors**
3. ✅ **"Database connected"**
4. ✅ **"CORS configured with: https://bisman-erp-frontend-production.up.railway.app"**
5. ✅ **"Server started successfully"**
6. ✅ **"🚀 BISMAN ERP Backend Server Started"**

If you see all of these, your backend is **FIXED and WORKING**! 🎉

---

## 🔄 QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `railway status` | See current service |
| `railway service` | Switch service |
| `railway logs` | Stream current service logs |
| `railway logs --service backend` | View backend logs |
| `railway logs --service frontend` | View frontend logs |
| `railway logs --lines 50` | Last 50 lines |
| `railway logs --service backend --lines 50` | Last 50 backend logs |

---

**🎯 Next Step**: Run `railway logs --service backend --lines 50` to check if your backend deployment succeeded!

