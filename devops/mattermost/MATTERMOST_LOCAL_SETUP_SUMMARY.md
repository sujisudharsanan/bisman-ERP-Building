# 🎯 Mattermost Local Setup - Complete Guide

## 📋 Overview

You now have **two ways** to run Mattermost for development:

1. **Railway (Cloud)** - ✅ Currently configured, recommended
2. **Local (Native)** - New option, for offline development

---

## ✅ Option 1: Railway Mattermost (Current Setup)

### Status: **ACTIVE** ✅

Your current configuration:
```env
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=1y54w4qe4fg3djq186tixu34uc
```

### How to Use:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

### Advantages:
- ✅ **Zero setup** - Already working
- ✅ **Zero maintenance** - Railway manages it
- ✅ **Team collaboration** - Everyone uses same instance
- ✅ **Production parity** - Identical to production
- ✅ **No local resources** - Saves disk/memory

### This is **RECOMMENDED** for normal development! ✅

---

## 🔧 Option 2: Local Mattermost (New)

### Status: **AVAILABLE** (Not yet installed)

For offline development or when you need a local server.

### Quick Install:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh
```

**Installation time:** ~10 minutes

### What Gets Installed:
1. PostgreSQL 15 (via Homebrew)
2. Mattermost server binary (macOS native)
3. Local database: `mattermost_local`
4. Startup/stop scripts
5. Configuration files

### After Installation:

#### 1. Start Local Mattermost:
```bash
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

#### 2. Create Admin Account:
- Open: http://localhost:8065
- Register first user (becomes admin)
- Generate Personal Access Token

#### 3. Switch to Local:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh local
```

#### 4. Restart Frontend:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

---

## 🔄 Environment Switching

Easily switch between Railway and Local with the switcher script!

### Show Current Environment:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh status
```

### Switch to Railway:
```bash
./switch-mm-env.sh railway
```

### Switch to Local:
```bash
./switch-mm-env.sh local
```

The script will:
- ✅ Backup your current `.env.local`
- ✅ Update `MM_BASE_URL` and `MM_ADMIN_TOKEN`
- ✅ Verify local Mattermost is running (if switching to local)
- ✅ Show next steps

---

## 📊 Comparison: Railway vs Local

| Feature | Railway (Current) | Local (New Option) |
|---------|-------------------|-------------------|
| **Setup** | ✅ Done | 🔧 Run script |
| **Internet** | ✅ Required | ❌ Not needed |
| **Speed** | ✅ Fast | ⚡ Fastest |
| **Maintenance** | ✅ None | 🔧 Manual updates |
| **Team Use** | ✅ Shared | ❌ Solo only |
| **Disk Space** | ✅ None | 📦 ~500MB |
| **Offline** | ❌ No | ✅ Yes |
| **Production Parity** | ✅ Identical | ⚠️ May differ |

---

## 🎯 When to Use Which?

### Use Railway (Keep Current Setup): ✅

**Best for:**
- Normal development work
- Team collaboration
- Production parity
- Limited local resources
- Always online work

**Use when:**
- Working with team members
- Testing production features
- Sharing channels/messages
- You have internet connection

### Use Local:

**Best for:**
- Offline development
- Plugin development
- Database schema changes
- Performance testing
- Learning/experimentation

**Use when:**
- No internet available
- Need fastest response times
- Testing database migrations
- Developing Mattermost plugins

---

## 🚀 Quick Start Guides

### Railway (Current - Recommended):

```bash
# Already configured! Just run:
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both

# Open http://localhost:3000
# Click Spark button
# Start chatting! ✅
```

### Local (New Option):

```bash
# Step 1: Install (one-time)
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh

# Step 2: Start Mattermost
cd ~/mattermost-local/mattermost
./start-mattermost.sh

# Step 3: Switch environment
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh local

# Step 4: Start frontend
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both

# Done! Now using local Mattermost ✅
```

---

## 📁 Files Created

### Setup Scripts:
```
devops/mattermost/
├── local/
│   ├── setup-local-mattermost.sh   # Automated installer ✅
│   └── README.md                    # Detailed guide ✅
├── switch-mm-env.sh                 # Environment switcher ✅
├── LOCAL_DEVELOPMENT_OPTIONS.md     # Options comparison ✅
└── MATTERMOST_LOCAL_SETUP_SUMMARY.md # This file ✅
```

### After Local Installation:
```
~/mattermost-local/
└── mattermost/
    ├── start-mattermost.sh          # Start script ✅
    ├── stop-mattermost.sh           # Stop script ✅
    ├── config/config.json           # Configuration ✅
    └── .env.local.mattermost        # Env template ✅
```

---

## 🔧 Common Tasks

### Check Current Environment:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh status
```

### Switch to Railway:
```bash
./switch-mm-env.sh railway
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

### Switch to Local:
```bash
# Make sure local is running first!
cd ~/mattermost-local/mattermost
./start-mattermost.sh

# Then switch
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh local

# Restart frontend
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

### Stop Local Mattermost:
```bash
cd ~/mattermost-local/mattermost
./stop-mattermost.sh
```

---

## 🐛 Troubleshooting

### "Local Mattermost not running"
```bash
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### "Database connection failed"
```bash
# Start PostgreSQL
brew services start postgresql@15

# Wait 5 seconds, then restart Mattermost
cd ~/mattermost-local/mattermost
./start-mattermost.sh
```

### "Port 8065 already in use"
```bash
# Stop any existing Mattermost
cd ~/mattermost-local/mattermost
./stop-mattermost.sh

# Or kill manually
lsof -i :8065
kill -9 <PID>
```

### "Cannot connect to Railway"
```bash
# Check your internet connection
curl https://mattermost-production-84fd.up.railway.app/api/v4/system/ping

# If offline, switch to local
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh local
```

---

## 📚 Documentation

Detailed guides available:

1. **LOCAL_DEVELOPMENT_OPTIONS.md** - Compare all options
2. **local/README.md** - Complete local setup guide
3. **local/setup-local-mattermost.sh** - Automated installer
4. **switch-mm-env.sh** - Environment switcher
5. **MATTERMOST_TOKEN_CONFIGURED.md** - Current Railway setup

---

## ✅ Installation Checklist

### Railway Setup (Current): ✅
- [x] Mattermost deployed on Railway
- [x] PostgreSQL database created
- [x] Admin token configured
- [x] Frontend environment set
- [x] Chat widget working
- [x] Auto-provisioning enabled
- [x] `npm run dev:both` script ready

### Local Setup (Optional):
- [ ] Run `setup-local-mattermost.sh`
- [ ] PostgreSQL installed
- [ ] Mattermost server downloaded
- [ ] Local database created
- [ ] Admin account created
- [ ] Personal Access Token generated
- [ ] Environment variables updated
- [ ] Successfully switched to local

---

## 🎯 My Recommendation

### For Your Situation:

**Continue using Railway (current setup)!** ✅

**Reasons:**
1. Already configured and working
2. No setup needed
3. Team can collaborate
4. Same as production
5. Zero maintenance

**Only install local Mattermost if:**
- You frequently work offline
- You need to develop Mattermost plugins
- You want to test database changes
- You need absolute fastest performance

**Railway is perfect for 95% of development work!** 🚀

---

## 🚀 Next Steps

### To Continue with Railway (Recommended):
```bash
# You're already set up! Just use it:
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

### To Install Local Mattermost (Optional):
```bash
# Run the automated installer:
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/local"
./setup-local-mattermost.sh

# Follow the prompts
# Installation takes ~10 minutes
```

### To Switch Between Environments:
```bash
# Use the switcher script:
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost"
./switch-mm-env.sh railway   # Use Railway
./switch-mm-env.sh local     # Use Local
./switch-mm-env.sh status    # Check current
```

---

## 📞 Quick Reference

### Railway Mattermost:
- **URL:** https://mattermost-production-84fd.up.railway.app
- **Token:** 1y54w4qe4fg3djq186tixu34uc
- **Status:** ✅ Active (default)

### Local Mattermost (after setup):
- **URL:** http://localhost:8065
- **Token:** Generate after installation
- **Status:** Available (not yet installed)

### Commands:
```bash
# Railway (current)
npm run dev:both                    # Start frontend

# Local (after install)
~/mattermost-local/mattermost/start-mattermost.sh   # Start MM
~/mattermost-local/mattermost/stop-mattermost.sh    # Stop MM

# Switching
devops/mattermost/switch-mm-env.sh railway          # To Railway
devops/mattermost/switch-mm-env.sh local            # To Local
```

---

## 🎉 Summary

You now have:

### ✅ Current Setup (Railway):
- Fully configured and working
- Zero maintenance required
- Ready for team collaboration
- **Recommended for normal development**

### 🔧 New Option (Local):
- Installation script ready
- Can run offline
- Fastest performance
- **Use when needed**

### 🔄 Easy Switching:
- One command to switch: `./switch-mm-env.sh`
- Automatic backup of config
- Works seamlessly

**Default recommendation: Keep using Railway!** ✅

**Want local? Run:** `./setup-local-mattermost.sh` 🚀
