# 🎯 RAILWAY CLI - ACTIVE SESSION COMMANDS

**Current Session**: Railway CLI Active  
**Date**: November 27, 2025

---

## 🔥 COMMANDS TO RUN RIGHT NOW

### 1️⃣ Add PostgreSQL (Currently Running)
```bash
railway add
# Select: PostgreSQL from the menu
```

**Wait for it to complete** (~30 seconds)

---

### 2️⃣ Generate JWT Secret (Run This Next)
```bash
JWT_SECRET=$(openssl rand -base64 48) && echo "Generated: $JWT_SECRET"
```

**Copy the output** - you'll need it!

---

### 3️⃣ Generate Session Secret (Run This Next)
```bash
SESSION_SECRET=$(openssl rand -base64 48) && echo "Generated: $SESSION_SECRET"
```

**Copy the output** - you'll need it!

---

### 4️⃣ Set Frontend URL (Update with YOUR URL)
```bash
railway variables set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
```

**Common Frontend URLs:**
- Production: `https://bisman-erp-frontend-production.up.railway.app`
- Staging: `https://bisman-erp-frontend-staging.up.railway.app`
- Custom: `https://app.bisman-erp.com`

**Don't know your frontend URL?** Check Railway dashboard or run:
```bash
railway open
```

---

### 5️⃣ Set JWT Secret
```bash
railway variables set JWT_SECRET="PASTE_YOUR_GENERATED_SECRET_HERE"
```

---

### 6️⃣ Set Session Secret
```bash
railway variables set SESSION_SECRET="PASTE_YOUR_GENERATED_SECRET_HERE"
```

---

### 7️⃣ Verify All Variables Are Set
```bash
railway variables
```

**You should see:**
- ✅ DATABASE_URL (from PostgreSQL)
- ✅ FRONTEND_URL (you just set)
- ✅ JWT_SECRET (you just set)
- ✅ SESSION_SECRET (you just set)

---

### 8️⃣ Watch Deployment Logs
```bash
railway logs --follow
```

**Look for these success messages:**
```
✅ Database connected
✅ Prisma client initialized
✅ Server started successfully
🚀 BISMAN ERP Backend Server Started
```

Press `Ctrl+C` to exit logs.

---

### 9️⃣ Run Database Migrations
```bash
railway run npx prisma migrate deploy
```

---

### 🔟 Test Health Endpoint
```bash
railway open
```

Then in another terminal:
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

---

## 📝 COPY-PASTE SEQUENCE (After PostgreSQL is Added)

**Run these commands in order:**

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 48)

# Set frontend URL (UPDATE THIS!)
railway variables set FRONTEND_URL=https://YOUR-FRONTEND-URL-HERE

# Set secrets
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set SESSION_SECRET="$SESSION_SECRET"

# Verify
railway variables

# Watch deployment
railway logs --follow
```

---

## 🚨 IMPORTANT NOTES

### Frontend URL Format
✅ CORRECT: `https://bisman-erp-frontend-production.up.railway.app`  
❌ WRONG: `https://bisman-erp-frontend-production.up.railway.app/`  
❌ WRONG: `http://bisman-erp-frontend-production.up.railway.app`

**No trailing slash, use HTTPS!**

---

### If Commands Don't Work

**Try with double quotes:**
```bash
railway variables set "FRONTEND_URL=https://your-url.app"
```

**Or use the `--set` flag:**
```bash
railway variables --set FRONTEND_URL=https://your-url.app
```

---

## 🔍 CHECK YOUR PROGRESS

After each step, verify:

**After PostgreSQL added:**
```bash
railway variables | grep DATABASE_URL
```
Should show: `DATABASE_URL=postgresql://...`

**After setting FRONTEND_URL:**
```bash
railway variables | grep FRONTEND_URL
```
Should show: `FRONTEND_URL=https://...`

**After setting secrets:**
```bash
railway variables | grep -E "JWT_SECRET|SESSION_SECRET"
```
Should show both variables.

---

## ⚡ QUICK COMMANDS REFERENCE

| Command | What It Does |
|---------|--------------|
| `railway variables` | Show all variables |
| `railway variables set KEY=VALUE` | Set a variable |
| `railway logs` | View logs |
| `railway logs --follow` | Live logs |
| `railway status` | Check status |
| `railway open` | Open dashboard |
| `railway run <cmd>` | Run command |
| `railway redeploy` | Force redeploy |

---

## 🎯 YOUR NEXT STEPS

1. ✅ Wait for PostgreSQL to finish adding
2. ✅ Generate JWT and SESSION secrets
3. ✅ Find your frontend URL
4. ✅ Set all three variables
5. ✅ Watch logs for success
6. ✅ Run migrations
7. ✅ Test health endpoint

---

## 🆘 TROUBLESHOOTING

### "Service not found"
```bash
railway link
# Select your backend service
```

### "Not authenticated"
```bash
railway login
```

### "Database URL not appearing"
```bash
# Wait 30 seconds, then check
railway variables | grep DATABASE
```

### "Variables not saving"
```bash
# Make sure you're in the right service
railway service
# Select your backend service
```

---

## 📞 GET HELP

If stuck, check:
- `RAILWAY_CLI_GUIDE.md` - Full command reference
- `RAILWAY_COMMANDS_NOW.md` - Detailed step-by-step
- `RAILWAY_CRITICAL_FIX_NOV27.md` - Complete explanation

Or run:
```bash
railway help
```

---

**🚀 You're almost there! Complete the steps above and your deployment will be fixed!**

