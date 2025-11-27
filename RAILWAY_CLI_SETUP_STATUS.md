# ✅ Railway Environment Variables - Already Set

## 🎯 Variables Successfully Set via CLI

The following variables have been **successfully added** to your Railway project:

### ✅ Completed Variables

1. **JWT_SECRET** ✅
   ```
   JWT_SECRET=bisman_erp_production_secure_jwt_secret_key_2025_railway_v1
   ```

2. **OTP_HASH_SECRET** ✅
   ```
   OTP_HASH_SECRET=bisman_erp_production_otp_hash_secret_key_2025_secure
   ```

---

## 🔧 Remaining Variables to Set

### Step 1: Link to Your Backend Service

The Railway CLI needs you to select which service to add variables to. Run:

```bash
railway service
```

Then **select your backend service** from the list (e.g., "backend" or "bisman-erp-backend").

### Step 2: Set Remaining Variables

After linking the service, run these commands:

```bash
# DATABASE_URL (references Postgres service)
railway variables --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"

# NODE_ENV
railway variables --set "NODE_ENV=production"

# FRONTEND_URL (update with your actual frontend URL)
railway variables --set "FRONTEND_URL=https://your-frontend-app.railway.app"

# FRONTEND_URLS (for multiple CORS origins)
railway variables --set "FRONTEND_URLS=https://your-frontend-app.railway.app,https://bisman-erp-backend-production.up.railway.app"

# DISABLE_RATE_LIMIT
railway variables --set "DISABLE_RATE_LIMIT=false"
```

---

## 📋 Alternative: Use Railway Dashboard

If CLI is giving issues, use the **Railway Dashboard** (faster):

### 1. Go to Railway Dashboard
- Open: https://railway.app
- Select your project: **BISMAN ERP**
- Click on your **backend service**

### 2. Go to Variables Tab
Click **Variables** in the left sidebar

### 3. Add Each Variable
Click **+ New Variable** and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `bisman_erp_production_secure_jwt_secret_key_2025_railway_v1` |
| `NODE_ENV` | `production` |
| `OTP_HASH_SECRET` | `bisman_erp_production_otp_hash_secret_key_2025_secure` |
| `FRONTEND_URL` | `https://your-frontend-app.railway.app` |
| `FRONTEND_URLS` | `https://your-frontend-app.railway.app,https://bisman-erp-backend-production.up.railway.app` |
| `DISABLE_RATE_LIMIT` | `false` |

### 4. Save and Deploy
Railway will automatically redeploy with the new variables.

---

## 🎯 Quick Command Reference

### Set All Variables at Once (after linking service)

```bash
# Link to backend service first
railway service

# Then run all at once
railway variables \
  --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
  --set "JWT_SECRET=bisman_erp_production_secure_jwt_secret_key_2025_railway_v1" \
  --set "NODE_ENV=production" \
  --set "OTP_HASH_SECRET=bisman_erp_production_otp_hash_secret_key_2025_secure" \
  --set "FRONTEND_URL=https://bisman-erp-backend-production.up.railway.app" \
  --set "FRONTEND_URLS=https://bisman-erp-backend-production.up.railway.app,http://localhost:3000" \
  --set "DISABLE_RATE_LIMIT=false"
```

---

## 🔍 Verify Variables

### Check Variables via CLI
```bash
railway variables
```

### Check Variables via Dashboard
- Railway Dashboard > Your Service > Variables tab
- Should see all 7 variables listed

---

## 🚀 After Setting Variables

### What Happens Next
1. Railway automatically **redeploys** your service
2. New deployment will use the environment variables
3. Errors should be **resolved**

### Check Deployment Logs
```bash
# Follow logs in real-time
railway logs --follow

# Or check in dashboard
# Railway Dashboard > Your Service > Deployments > Latest > Logs
```

### Expected Success Output
```
✅ Environment validation passed
✅ Database connected: postgres://...
✅ JWT_SECRET configured (49 characters)
✅ Server starting on port 3000
🚀 BISMAN ERP Backend Server Started Successfully
```

---

## ✅ Checklist

- [x] JWT_SECRET set via CLI ✅
- [x] OTP_HASH_SECRET set via CLI ✅
- [ ] Link to backend service: `railway service`
- [ ] Set DATABASE_URL
- [ ] Set NODE_ENV
- [ ] Set FRONTEND_URL (update with actual URL)
- [ ] Set FRONTEND_URLS
- [ ] Set DISABLE_RATE_LIMIT
- [ ] Verify variables: `railway variables`
- [ ] Check deployment logs: `railway logs`
- [ ] Test health endpoint: `https://your-backend.railway.app/api/health`

---

## 🎯 Next Steps

### Option 1: Complete via CLI
```bash
# 1. Link to backend service
railway service
# Select your backend service from the list

# 2. Set remaining variables (run commands above)

# 3. Verify
railway variables
```

### Option 2: Complete via Dashboard (Recommended - Faster!)
1. Go to https://railway.app
2. Select project > backend service > Variables
3. Add remaining variables manually
4. Done! ✅

---

## 📞 Troubleshooting

### Issue: "No service linked"
**Solution:** Run `railway service` and select your backend service

### Issue: Variables not showing
**Solution:** Make sure you're in the correct project:
```bash
railway status  # Check current project
railway link    # Re-link if needed
```

### Issue: Deployment still failing
**Solution:** 
1. Check logs: `railway logs`
2. Verify all 7 variables are set
3. Ensure DATABASE_URL uses `${{Postgres.DATABASE_URL}}` format

---

## 🎉 Summary

**Already Set (via CLI):**
- ✅ JWT_SECRET
- ✅ OTP_HASH_SECRET

**Remaining (5 variables):**
- DATABASE_URL
- NODE_ENV
- FRONTEND_URL
- FRONTEND_URLS
- DISABLE_RATE_LIMIT

**Recommended:** Use **Railway Dashboard** for the remaining 5 variables - it's faster and easier!
