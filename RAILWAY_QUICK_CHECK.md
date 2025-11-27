# ⚡ RAILWAY - QUICK STATUS CHECK

**Run these commands after 5 minutes:**

---

## 1️⃣ Check Backend Logs
```bash
railway logs
```
**Select**: `bisman-ERP-Backend`

**Look for**:
- ✅ `Database connected`
- ✅ `CORS configured with: https://bisman-erp-frontend...`
- ✅ `Server Started Successfully`

---

## 2️⃣ Check Frontend Logs
```bash
railway logs
```
**Select**: `bisman-ERP-frontend`

**Look for**:
- ✅ `Server listening on http://0.0.0.0:3000`
- ✅ No build errors

---

## 3️⃣ Test Backend
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```
**Expected**: `{"status":"ok",...}`

---

## 4️⃣ Open Frontend
```
https://bisman-erp-frontend-production.up.railway.app
```
**Expected**: Login page loads ✅

---

## 5️⃣ Test Login
```
Email: demo_hub_incharge@bisman.demo
Password: Demo@123
```
**Expected**: Successfully logs in ✅

---

## 📊 All Environment Variables Set

### Backend ✅
- DATABASE_URL
- FRONTEND_URL
- JWT_SECRET
- SESSION_SECRET

### Frontend ✅
- NEXT_PUBLIC_API_URL

---

## 🎯 If Everything Works:

✅ **SUCCESS!** Your Railway deployment is complete and functional!

---

## 🔧 If Issues Remain:

```bash
# View all backend variables
railway variables
# Select: bisman-ERP-Backend

# View all frontend variables
railway variables
# Select: bisman-ERP-frontend

# Redeploy if needed
railway redeploy
```

---

**⏱️ Wait 5 minutes, then run the checks above!**
