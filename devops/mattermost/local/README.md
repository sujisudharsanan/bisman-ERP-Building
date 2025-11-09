# 🚀 Local Mattermost Installation Guide

## 🎯 Overview

This guide helps you set up Mattermost to run locally on your Mac without Docker.

---

## ⚡ Quick Start

### Automated Installation (Recommended):

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh
```

This script will:
1. ✅ Install PostgreSQL (if needed)
2. ✅ Create Mattermost database
3. ✅ Download Mattermost server
4. ✅ Configure for local development
5. ✅ Create startup/stop scripts

### Manual Installation:

If you prefer manual setup, follow the steps in `LOCAL_DEVELOPMENT_OPTIONS.md`

---

## 🔧 Prerequisites

### Required:
- **Homebrew** - macOS package manager
- **PostgreSQL 15+** - Database (script installs if missing)
- **~500MB disk space** - For Mattermost server

### Check Homebrew:
```bash
brew --version
```

If not installed:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 📋 Installation Steps

### Step 1: Run Setup Script

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh
```

**What it does:**
- Installs PostgreSQL (via Homebrew)
- Creates database `mattermost_local`
- Downloads Mattermost 9.11.3 for macOS
- Configures for local use
- Creates helper scripts

**Time:** ~5-10 minutes (depending on download speed)

### Step 2: Start Mattermost

```bash
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

**Output:**
```
🚀 Starting Mattermost Local Server...
Starting Mattermost on http://localhost:8065
Server is listening on :8065
```

### Step 3: Create Admin Account

1. Open browser: `http://localhost:8065`
2. Click **"Create Account"**
3. Fill in details:
   - **Email:** admin@localhost.com
   - **Username:** admin
   - **Password:** (your secure password)
4. First user automatically becomes **System Admin** ✅

### Step 4: Generate Personal Access Token

1. **Login** to Mattermost as admin
2. Click your **profile picture** (top-right)
3. Go to **Profile → Security**
4. Scroll to **Personal Access Tokens**
5. Click **"Create New Token"**
6. **Description:** "ERP Integration"
7. Click **"Save"**
8. **Copy the token** (shown only once!)

### Step 5: Update Frontend Configuration

Edit `my-frontend/.env.local`:

```env
# Switch to Local Mattermost
MM_BASE_URL=http://localhost:8065
MM_ADMIN_TOKEN=<paste-your-token-here>
MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_DEMO_PASSWORD=Welcome@2025
```

### Step 6: Restart Frontend

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

---

## 🔄 Environment Switching

You can switch between Railway (production) and Local Mattermost:

### Use Railway Mattermost:

```bash
# Edit my-frontend/.env.local
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=1y54w4qe4fg3djq186tixu34uc
```

### Use Local Mattermost:

```bash
# Edit my-frontend/.env.local
MM_BASE_URL=http://localhost:8065
MM_ADMIN_TOKEN=<your-local-token>
```

### Environment Switcher Script:

I'll create a helper script to switch easily:

```bash
# Switch to Railway
./switch-mm-env.sh railway

# Switch to Local
./switch-mm-env.sh local
```

---

## 🛠️ Managing Local Mattermost

### Start Server:
```bash
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### Stop Server:
```bash
cd ~/mattermost-local/mattermost
./stop-mattermost.sh
```

### Check if Running:
```bash
curl http://localhost:8065/api/v4/system/ping
# Should return: {"status":"OK"}
```

### View Logs:
```bash
cd ~/mattermost-local/mattermost
tail -f logs/mattermost.log
```

### Restart Server:
```bash
cd ~/mattermost-local/mattermost
./stop-mattermost.sh
./start-mattermost.sh
```

---

## 📊 Database Management

### Connect to Database:
```bash
psql mattermost_local
```

### View Users:
```sql
SELECT username, email, roles FROM users;
```

### Reset Database:
```bash
# ⚠️ This will delete all data!
dropdb mattermost_local
createdb mattermost_local
psql mattermost_local -c "GRANT ALL PRIVILEGES ON DATABASE mattermost_local TO mmuser;"
psql mattermost_local -c "ALTER DATABASE mattermost_local OWNER TO mmuser;"
psql mattermost_local -c "GRANT ALL ON SCHEMA public TO mmuser;"

# Restart Mattermost to recreate schema
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### Backup Database:
```bash
pg_dump mattermost_local > ~/mattermost_backup_$(date +%Y%m%d).sql
```

### Restore Database:
```bash
psql mattermost_local < ~/mattermost_backup_20250109.sql
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused" error

**Cause:** Mattermost not running  
**Fix:**
```bash
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### Issue: "Database connection failed"

**Cause:** PostgreSQL not running  
**Fix:**
```bash
brew services start postgresql@15
# Wait 5 seconds, then restart Mattermost
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### Issue: Port 8065 already in use

**Cause:** Another Mattermost instance running  
**Fix:**
```bash
# Find process using port 8065
lsof -i :8065

# Kill the process
kill -9 <PID>

# Or use stop script
cd ~/mattermost-local/mattermost
./stop-mattermost.sh
```

### Issue: "Permission denied" on PostgreSQL

**Cause:** Database permissions not set  
**Fix:**
```bash
psql mattermost_local <<EOF
GRANT ALL PRIVILEGES ON DATABASE mattermost_local TO mmuser;
ALTER DATABASE mattermost_local OWNER TO mmuser;
GRANT ALL ON SCHEMA public TO mmuser;
EOF
```

### Issue: Download fails during setup

**Cause:** Version not available for your architecture  
**Fix:**
```bash
# The script will try alternative version automatically
# Or manually download from: https://releases.mattermost.com/
```

---

## 📈 Performance Tips

### 1. Increase Database Connections:
Edit `~/mattermost-local/mattermost/config/config.json`:
```json
"SqlSettings": {
  "MaxIdleConns": 50,
  "MaxOpenConns": 500
}
```

### 2. Enable Caching:
Edit config.json:
```json
"FileSettings": {
  "EnableFileAttachments": true,
  "MaxFileSize": 104857600
}
```

### 3. Optimize PostgreSQL:
Edit `/opt/homebrew/var/postgresql@15/postgresql.conf`:
```conf
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 64MB
```

Restart PostgreSQL:
```bash
brew services restart postgresql@15
```

---

## 🔒 Security Notes

### Local Development:
- ✅ Uses demo password for auto-provisioning
- ✅ No SSL (local HTTP only)
- ✅ Developer mode enabled

### Production (Railway):
- ✅ HTTPS enabled
- ✅ Strong passwords required
- ✅ MFA recommended

### Best Practices:
1. **Don't use local token in production**
2. **Change demo password before deploying**
3. **Keep tokens in .env.local (not committed)**
4. **Backup database regularly**

---

## 📊 Comparison: Local vs Railway

| Feature | Local | Railway |
|---------|-------|---------|
| **Setup Time** | 10 minutes | ✅ Already done |
| **Internet Required** | ❌ No | ✅ Yes |
| **Performance** | ⚡ Fastest | ✅ Fast |
| **Maintenance** | 🔧 You manage | ✅ Auto-managed |
| **Team Sharing** | ❌ Solo only | ✅ Whole team |
| **Disk Space** | 500MB local | ✅ None |
| **Updates** | 🔧 Manual | ✅ Automatic |

---

## 🎯 When to Use Which?

### Use Railway (Current Setup): ✅ Recommended
- **Team collaboration** - Multiple developers
- **Production parity** - Same as live environment
- **Zero maintenance** - No local setup needed
- **Limited resources** - Save local disk/memory

### Use Local:
- **Offline development** - No internet access
- **Plugin development** - Testing Mattermost plugins
- **Schema modifications** - Database changes
- **Performance testing** - Absolute fastest response

---

## 📝 Files Created

After running setup, you'll have:

```
~/mattermost-local/
├── mattermost/
│   ├── bin/mattermost           # Server binary
│   ├── config/config.json       # Configuration
│   ├── data/                    # File uploads
│   ├── logs/                    # Log files
│   ├── plugins/                 # Plugins directory
│   ├── start-mattermost.sh      # Start script ✅
│   ├── stop-mattermost.sh       # Stop script ✅
│   └── .env.local.mattermost    # Env template ✅
└── mattermost-9.11.3-darwin-arm64.tar.gz
```

---

## 🚀 Quick Reference

### Start Everything:
```bash
# Terminal 1: Start Mattermost
cd ~/mattermost-local/mattermost
./start-mattermost.sh

# Terminal 2: Start Frontend
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

### Access:
- **Mattermost:** http://localhost:8065
- **Frontend:** http://localhost:3000
- **ERP Chat:** Click Spark button in ERP

### Stop Everything:
```bash
# Stop Frontend: Ctrl+C in Terminal 2
# Stop Mattermost:
cd ~/mattermost-local/mattermost
./stop-mattermost.sh
```

---

## ✅ Installation Checklist

After running setup script, verify:

- [ ] PostgreSQL installed and running
- [ ] Database `mattermost_local` created
- [ ] Mattermost downloaded and extracted
- [ ] Configuration file updated
- [ ] Server starts successfully
- [ ] Accessible at http://localhost:8065
- [ ] Admin account created
- [ ] Personal Access Token generated
- [ ] Frontend `.env.local` updated
- [ ] Chat widget connects to local Mattermost

---

## 📞 Support

### Check Logs:
```bash
# Mattermost logs
tail -f ~/mattermost-local/mattermost/logs/mattermost.log

# PostgreSQL logs
tail -f /opt/homebrew/var/log/postgresql@15.log
```

### Test Connection:
```bash
# Test Mattermost
curl http://localhost:8065/api/v4/system/ping

# Test PostgreSQL
psql mattermost_local -c "SELECT version();"
```

### Clean Reinstall:
```bash
# Remove everything
rm -rf ~/mattermost-local
dropdb mattermost_local

# Run setup again
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh
```

---

## 🎉 Summary

You now have two options:

### ✅ Option 1: Keep Using Railway (Recommended)
- Already configured
- Zero maintenance
- Team collaboration
- Production parity

### 🔧 Option 2: Install Local Mattermost
- Run setup script
- Manage local server
- Work offline
- Fastest performance

**Choose based on your needs!**

For most development, **Railway is recommended** ✅
