# 🚀 Railway Deployment - Environment Variables Setup

## 🔴 Critical Issues Found

Your Railway deployment logs show **3 REQUIRED variables are missing**:

```
❌ Missing required environment variable: DATABASE_URL
❌ Missing required environment variable: JWT_SECRET
❌ Missing required environment variable: FRONTEND_URL
```

---

## ✅ Quick Fix: Add Environment Variables to Railway

### Step 1: Go to Railway Dashboard

1. Open [Railway Dashboard](https://railway.app)
2. Select your project: **BISMAN ERP Backend**
3. Go to **Variables** tab

### Step 2: Add Required Variables

Copy and paste these into Railway:

```bash
# ============================================
# REQUIRED VARIABLES
# ============================================

# Database (Railway provides this automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secret (MUST be 32+ characters)
JWT_SECRET=bisman_erp_production_secure_jwt_secret_key_2025_railway_v1

# Frontend URL (Your Railway frontend URL)
FRONTEND_URL=https://your-frontend-app.railway.app

# ============================================
# RECOMMENDED VARIABLES
# ============================================

# Node Environment
NODE_ENV=production

# OTP Secret
OTP_HASH_SECRET=bisman_erp_production_otp_hash_secret_key_2025_secure

# CORS Additional URLs
FRONTEND_URLS=https://your-frontend-app.railway.app,https://bisman-erp-backend-production.up.railway.app

# Disable Rate Limiting (optional, for testing)
DISABLE_RATE_LIMIT=false

# ============================================
# OPTIONAL (Can skip for now)
# ============================================

# Redis (only if you have Redis service)
# REDIS_URL=${{Redis.REDIS_URL}}

# Mattermost (only if using chat)
# MM_BASE_URL=https://your-mattermost.railway.app
# MM_ADMIN_TOKEN=your-mattermost-admin-token
```

---

## 📋 Step-by-Step Guide

### 1. DATABASE_URL (Automatic)

**Railway Postgres provides this automatically!**

In Railway Variables, add:
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

This references your Railway Postgres database.

### 2. JWT_SECRET (Critical for Auth)

**Use a STRONG secret (32+ characters)**

```
JWT_SECRET = bisman_erp_production_secure_jwt_secret_key_2025_railway_v1
```

Or generate a random one:
```bash
# Run locally to generate random secret
openssl rand -hex 32
```

Then paste the output as JWT_SECRET in Railway.

### 3. FRONTEND_URL (Required for CORS)

**Your Railway frontend URL**

```
FRONTEND_URL = https://your-frontend-app.railway.app
```

Replace `your-frontend-app` with your actual Railway frontend service name.

### 4. OTP_HASH_SECRET (Recommended)

```
OTP_HASH_SECRET = bisman_erp_production_otp_hash_secret_key_2025_secure
```

### 5. NODE_ENV (Should be set)

```
NODE_ENV = production
```

---

## 🎯 Railway Variables Configuration

### Using Railway Template Variables

If you have a **Postgres service** in your Railway project:

```bash
# Reference the Postgres DATABASE_URL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# If you add Redis later
REDIS_URL=${{Redis.REDIS_URL}}
```

### Complete Railway Variables List

Add these in **Railway Dashboard > Your Service > Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ YES |
| `JWT_SECRET` | `bisman_erp_production_secure_jwt_secret_key_2025_railway_v1` | ✅ YES |
| `FRONTEND_URL` | `https://your-frontend-app.railway.app` | ✅ YES |
| `NODE_ENV` | `production` | ⚠️ Recommended |
| `OTP_HASH_SECRET` | `bisman_erp_production_otp_hash_secret_key_2025_secure` | ⚠️ Recommended |
| `FRONTEND_URLS` | `https://your-frontend-app.railway.app` | ⚠️ Recommended |
| `DISABLE_RATE_LIMIT` | `false` | ℹ️ Optional |

---

## 🔧 How to Add Variables in Railway

### Method 1: Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Select your project
3. Click on your backend service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable:
   - **Variable Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}`
   - Click **Add**
7. Repeat for all variables above
8. Click **Deploy** to restart with new variables

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Add variables
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set JWT_SECRET='bisman_erp_production_secure_jwt_secret_key_2025_railway_v1'
railway variables set FRONTEND_URL='https://your-frontend-app.railway.app'
railway variables set NODE_ENV='production'
railway variables set OTP_HASH_SECRET='bisman_erp_production_otp_hash_secret_key_2025_secure'
```

---

## 🔍 Current Issues in Your Deployment

### 1. ❌ No DATABASE_URL
```
[err] Missing required environment variable: DATABASE_URL
[err] Environment variable not found: DATABASE_URL
```

**Fix:** Add `DATABASE_URL=${{Postgres.DATABASE_URL}}`

### 2. ❌ No JWT_SECRET
```
[err] Missing required environment variable: JWT_SECRET
```

**Fix:** Add `JWT_SECRET=bisman_erp_production_secure_jwt_secret_key_2025_railway_v1`

### 3. ❌ No FRONTEND_URL
```
[err] Missing required environment variable: FRONTEND_URL
```

**Fix:** Add `FRONTEND_URL=https://your-frontend-app.railway.app`

### 4. ⚠️ Redis Not Available
```
[err] Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379
[err] Redis not available, using in-memory token store
```

**Status:** This is OK for now - in-memory will work. Add Redis service later if needed.

### 5. ⚠️ Mattermost Not Configured
```
[err] MM_BASE_URL not set, using default
[err] Missing required environment variables: MM_ADMIN_TOKEN
```

**Status:** Only needed if you're using Mattermost chat. Can skip for now.

---

## 🚀 After Adding Variables

### What Happens Next

1. Railway will automatically **redeploy** your service
2. You'll see new deployment logs
3. The errors should be **GONE**
4. Server will start successfully

### Expected Clean Output

```
✅ Environment validation passed
✅ Database connected
✅ Server starting on port 3000
✅ Chat module loaded
✅ All routes mounted
🚀 BISMAN ERP Backend Server Started Successfully
```

---

## 📊 Verification Checklist

After redeployment, check:

- [ ] No DATABASE_URL errors
- [ ] No JWT_SECRET errors  
- [ ] No FRONTEND_URL errors
- [ ] Server starts successfully
- [ ] Health endpoint works: `https://your-backend.railway.app/api/health`
- [ ] Can access root: `https://your-backend.railway.app/`

---

## 🔒 Security Best Practices

### Production Secrets

**Generate STRONG secrets for production:**

```bash
# Generate JWT_SECRET (64 characters)
openssl rand -hex 32
# Output: a3f8b9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1

# Generate OTP_HASH_SECRET (64 characters)
openssl rand -hex 32
# Output: b9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

Use these generated values instead of the examples above for maximum security.

### Never Commit Secrets

✅ **DO:** Add to Railway Variables  
❌ **DON'T:** Commit to `.env` files in git  
❌ **DON'T:** Hardcode in code files

---

## 🎯 Quick Copy-Paste (Update Values!)

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=bisman_erp_production_secure_jwt_secret_key_2025_railway_v1
FRONTEND_URL=https://your-frontend-app.railway.app
NODE_ENV=production
OTP_HASH_SECRET=bisman_erp_production_otp_hash_secret_key_2025_secure
FRONTEND_URLS=https://your-frontend-app.railway.app,https://bisman-erp-backend-production.up.railway.app
DISABLE_RATE_LIMIT=false
```

**Remember to replace:**
- `your-frontend-app` with your actual Railway frontend service name
- Optionally, generate stronger secrets with `openssl rand -hex 32`

---

## 📞 Support

### If Issues Persist

1. **Check Railway Logs:**
   ```bash
   railway logs
   ```

2. **Check Variables Set Correctly:**
   - Railway Dashboard > Variables
   - Ensure no typos

3. **Manual Redeploy:**
   - Railway Dashboard > Deployments
   - Click "Deploy" to force redeploy

### Common Issues

**Q: DATABASE_URL still missing?**  
A: Make sure you have a Postgres service in your Railway project and it's linked

**Q: CORS errors in frontend?**  
A: Update FRONTEND_URL and FRONTEND_URLS to match your frontend Railway URL

**Q: JWT errors on login?**  
A: Ensure JWT_SECRET is set and is 32+ characters

---

## ✅ Summary

### Action Required

1. ✅ Go to Railway Dashboard
2. ✅ Add the 3 REQUIRED variables:
   - `DATABASE_URL`
   - `JWT_SECRET`  
   - `FRONTEND_URL`
3. ✅ Add RECOMMENDED variables:
   - `NODE_ENV`
   - `OTP_HASH_SECRET`
4. ✅ Click Deploy/Save
5. ✅ Wait for redeployment
6. ✅ Check logs for success

### Expected Result

```
✅ Environment validation passed
✅ Server running successfully
✅ No critical errors
🚀 Ready for production!
```

---

**Next:** After adding variables, wait 1-2 minutes for Railway to redeploy, then check logs again!
