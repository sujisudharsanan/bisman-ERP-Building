# 🚀 Railway CLI - Quick Fix Commands

**Run these commands in order to fix your deployment**

---

## ✅ Step 1: Check Current Status

```bash
railway status
```

---

## ✅ Step 2: View Current Variables

```bash
railway variables
```

Check if you have:
- DATABASE_URL
- FRONTEND_URL
- JWT_SECRET
- SESSION_SECRET

---

## ✅ Step 3: Add PostgreSQL (if DATABASE_URL missing)

```bash
railway add --database postgres
```

Wait 30 seconds for it to provision.

---

## ✅ Step 4: Set Frontend URL

**Replace with YOUR actual frontend URL:**

```bash
railway variables --set FRONTEND_URL=https://your-frontend-domain.up.railway.app
```

Examples:
- `https://bisman-erp-frontend.railway.app`
- `https://app.bisman-erp.com`
- `https://your-actual-frontend.up.railway.app`

---

## ✅ Step 5: Generate and Set JWT_SECRET

```bash
railway variables --set JWT_SECRET=$(openssl rand -base64 48)
```

---

## ✅ Step 6: Generate and Set SESSION_SECRET

```bash
railway variables --set SESSION_SECRET=$(openssl rand -base64 48)
```

---

## ✅ Step 7: Verify All Variables Are Set

```bash
railway variables | grep -E "DATABASE_URL|FRONTEND_URL|JWT_SECRET|SESSION_SECRET"
```

You should see all 4 variables listed.

---

## ✅ Step 8: Watch Deployment Logs

```bash
railway logs --follow
```

Look for:
- ✅ Database connected
- ✅ Server started successfully
- 🚀 BISMAN ERP Backend Server Started

Press `Ctrl+C` to exit log view.

---

## ✅ Step 9: Run Database Migrations

```bash
railway run npx prisma migrate deploy
```

---

## ✅ Step 10: Test Your Deployment

```bash
# Get your backend URL
railway open

# Or test health endpoint directly (replace with your URL)
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

Expected response: `{"status":"ok",...}`

---

## 🎯 ALL-IN-ONE COMMAND SEQUENCE

Copy and paste this (update FRONTEND_URL with your actual URL):

```bash
# Check status
railway status

# Add PostgreSQL
railway add --database postgres

# Wait for provisioning
sleep 30

# Set all required variables (UPDATE FRONTEND_URL!)
railway variables --set FRONTEND_URL=https://YOUR-FRONTEND-URL-HERE.up.railway.app
railway variables --set JWT_SECRET=$(openssl rand -base64 48)
railway variables --set SESSION_SECRET=$(openssl rand -base64 48)

# Verify
railway variables

# Watch logs
railway logs --follow
```

---

## 🔄 Alternative: Run the Automated Script

I've created an interactive script for you:

```bash
./railway-fix.sh
```

This script will:
1. Check your current configuration
2. Prompt for missing variables
3. Add PostgreSQL if needed
4. Generate secrets automatically
5. Show deployment logs

---

## 📊 Useful Commands After Setup

### View Logs
```bash
railway logs --follow
```

### Check All Variables
```bash
railway variables
```

### Open in Browser
```bash
railway open
```

### Redeploy
```bash
railway redeploy
```

### Run Commands in Railway Environment
```bash
railway run <command>
```

### Get Database URL
```bash
railway variables | grep DATABASE_URL
```

---

## 🆘 Troubleshooting

### If PostgreSQL doesn't add:
```bash
# Try again
railway add --database postgres

# Or check if it's already there
railway variables | grep DATABASE_URL
```

### If variables don't save:
```bash
# Make sure you're linked to the right project
railway status

# Try setting variables one at a time
railway variables --set FRONTEND_URL=https://your-frontend.app
```

### If deployment doesn't trigger:
```bash
# Manually redeploy
railway redeploy
```

### If you need to change a variable:
```bash
# Just set it again with new value
railway variables --set FRONTEND_URL=https://new-url.com
```

---

## 🎯 Quick Start (Right Now!)

**Run these 3 commands:**

```bash
# 1. View current state
railway variables

# 2. Add database (if missing)
railway add --database postgres

# 3. Run the fix script
./railway-fix.sh
```

That's it! The script will guide you through the rest.

---

## ✅ Success Checklist

After running the commands, verify:

- [ ] `railway variables` shows DATABASE_URL
- [ ] `railway variables` shows FRONTEND_URL
- [ ] `railway variables` shows JWT_SECRET
- [ ] `railway variables` shows SESSION_SECRET
- [ ] `railway logs` shows "Database connected"
- [ ] `railway logs` shows "Server started successfully"
- [ ] Health endpoint returns {"status":"ok"}

---

**Need help?** Check `RAILWAY_CLI_GUIDE.md` for complete command reference.

