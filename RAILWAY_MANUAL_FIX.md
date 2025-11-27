# ⚡ RAILWAY MANUAL FIX - STEP BY STEP

**CRITICAL**: Follow these exact steps to fix your deployment

---

## 🎯 PROBLEM

- **Backend CORS** pointing to wrong URL (localhost + backend URL)
- **Frontend** not loading (Application failed to respond)
- **Missing**: FRONTEND_URL variable in backend service

---

## ✅ SOLUTION (5 Commands)

### Command 1: Set FRONTEND_URL for Backend

```bash
railway variables --set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
```

**When prompted**: Select `bisman-ERP-Backend`

---

### Command 2: Redeploy Backend

```bash
railway redeploy
```

**When prompted**: Select `bisman-ERP-Backend`

---

### Command 3: Set NEXT_PUBLIC_API_URL for Frontend

```bash
railway variables --set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
```

**When prompted**: Select `bisman-ERP-frontend`

---

### Command 4: Redeploy Frontend

```bash
railway redeploy
```

**When prompted**: Select `bisman-ERP-frontend`

---

### Command 5: Watch Backend Logs (After 5 min)

```bash
railway logs
```

**When prompted**: Select `bisman-ERP-Backend`

**Look for**:
```
Allowed Origins: {
  '0': 'https://bisman-erp-frontend-production.up.railway.app'  ✅
}
```

---

## 🔍 VERIFICATION

### After Redeployment (Wait 5-10 minutes):

1. **Open Frontend**: https://bisman-erp-frontend-production.up.railway.app
   - Should see login page ✅
   - No "Application failed to respond" ✅

2. **Check Backend CORS**:
   ```bash
   railway logs
   ```
   - Select: bisman-ERP-Backend
   - Should show frontend URL in allowed origins ✅

3. **Test Login**:
   - Email: demo_hub_incharge@bisman.demo
   - Password: Demo@123
   - Should login successfully ✅

---

## 📊 WHAT THIS FIXES

| Issue | Before | After |
|-------|--------|-------|
| Backend CORS | localhost + backend URL | ✅ Frontend URL |
| Frontend Loading | ❌ Failed | ✅ Working |
| API Connection | ❌ No URL | ✅ Backend URL set |

---

## ⏱️ TIMELINE

- Command execution: 2 minutes
- Backend redeploy: 3-4 minutes
- Frontend redeploy: 3-4 minutes
- **Total**: ~10 minutes

---

## 🚨 IF STILL NOT WORKING

Check both services logs:

```bash
# Backend logs
railway logs
# Select: bisman-ERP-Backend

# Frontend logs  
railway logs
# Select: bisman-ERP-frontend
```

Look for:
- Backend: "Database connected" ✅
- Backend: "CORS configured with: https://bisman-erp-frontend..." ✅
- Frontend: "Server listening on..." ✅

---

## 📝 COPY-PASTE COMMANDS

```bash
# 1. Set backend FRONTEND_URL (select bisman-ERP-Backend)
railway variables --set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app

# 2. Redeploy backend (select bisman-ERP-Backend)
railway redeploy

# 3. Set frontend API URL (select bisman-ERP-frontend)
railway variables --set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# 4. Redeploy frontend (select bisman-ERP-frontend)
railway redeploy

# 5. Watch logs after 5 min (select bisman-ERP-Backend)
railway logs
```

---

**⚡ START NOW**: Run command 1 above!
