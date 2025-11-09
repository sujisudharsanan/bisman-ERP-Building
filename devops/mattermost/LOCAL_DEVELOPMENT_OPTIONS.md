# Local Mattermost Development Setup (Without Docker)

## 🎯 Problem
Your macOS 12.7.6 doesn't support Docker Desktop, but you need local Mattermost for development.

## ✅ Solution: Dual Environment Setup

We'll configure your app to work with:
1. **Railway Mattermost** - For production and local development (recommended)
2. **Optional: Native Mattermost** - If you really need a local server

---

## 🚀 Option 1: Use Railway for Local Development (Recommended)

This is the **easiest and recommended** approach since Mattermost is already running on Railway.

### ✅ Advantages:
- No local installation needed
- Same as production environment
- Already configured and working
- Auto-provisioning works
- Zero maintenance

### Configuration (Already Done!):

Your `.env.local` already points to Railway:
```env
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=1y54w4qe4fg3djq186tixu34uc
```

### How to Use:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

Your local frontend at `http://localhost:3000` will connect to Railway Mattermost! ✅

---

## 🔧 Option 2: Run Mattermost Native Binary (Local Server)

If you really need a local Mattermost server, you can run the native binary without Docker.

### Requirements:
- PostgreSQL 12+ running locally
- Mattermost Server Binary for macOS
- ~500MB disk space

### Steps:

#### 1. Install PostgreSQL Locally
```bash
# Install PostgreSQL using Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create Mattermost database
createdb mattermost_local
psql mattermost_local -c "CREATE USER mmuser WITH PASSWORD 'mmuser_password';"
psql mattermost_local -c "GRANT ALL PRIVILEGES ON DATABASE mattermost_local TO mmuser;"
psql mattermost_local -c "ALTER DATABASE mattermost_local OWNER TO mmuser;"
psql mattermost_local -c "GRANT ALL ON SCHEMA public TO mmuser;"
```

#### 2. Download Mattermost Server
```bash
# Create directory for Mattermost
mkdir -p ~/mattermost-local
cd ~/mattermost-local

# Download Mattermost Team Edition (macOS)
# Version 11.0.4 (same as Railway)
curl -L https://releases.mattermost.com/11.0.4/mattermost-11.0.4-darwin-arm64.tar.gz -o mattermost.tar.gz

# Extract
tar -xvzf mattermost.tar.gz

# Navigate to mattermost folder
cd mattermost
```

#### 3. Configure Mattermost
```bash
# Edit config.json
nano config/config.json
```

**Key settings to change:**
```json
{
  "ServiceSettings": {
    "SiteURL": "http://localhost:8065",
    "ListenAddress": ":8065"
  },
  "SqlSettings": {
    "DriverName": "postgres",
    "DataSource": "postgres://mmuser:mmuser_password@localhost:5432/mattermost_local?sslmode=disable&connect_timeout=10"
  }
}
```

#### 4. Start Mattermost
```bash
cd ~/mattermost-local/mattermost
./bin/mattermost
```

Mattermost will be available at: `http://localhost:8065`

---

## 🔄 Option 3: Hybrid Setup (Best of Both Worlds)

Use Railway for production and local for development with environment switching.

### Create Multiple Environment Files:

#### `.env.local` (Local Mattermost)
```env
# Local PostgreSQL Mattermost
MM_BASE_URL=http://localhost:8065
MM_ADMIN_TOKEN=<generate-after-local-setup>
MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_DEMO_PASSWORD=Welcome@2025
```

#### `.env.production` (Railway Mattermost)
```env
# Production Railway Mattermost
MM_BASE_URL=https://mattermost-production-84fd.up.railway.app
MM_ADMIN_TOKEN=1y54w4qe4fg3djq186tixu34uc
MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_DEMO_PASSWORD=Welcome@2025
```

### Switch Between Environments:
```bash
# Use Railway (current setup)
npm run dev:both

# Use Local Mattermost
cp .env.local.backup .env.local  # If you created local config
npm run dev
```

---

## 📋 Comparison: Railway vs Local

| Feature | Railway (Current) | Local Binary |
|---------|------------------|--------------|
| **Installation** | ✅ None needed | ❌ PostgreSQL + Binary |
| **Maintenance** | ✅ Auto-updated | ❌ Manual updates |
| **Performance** | ✅ Fast CDN | ⚡ Fastest (local) |
| **Offline Work** | ❌ Needs internet | ✅ Works offline |
| **Team Sharing** | ✅ Everyone uses same | ❌ Each dev needs setup |
| **Production Parity** | ✅ Identical | ⚠️ May drift |
| **Cost** | ✅ Free tier | ✅ Free (uses your machine) |
| **Disk Space** | ✅ None | ❌ ~500MB |

---

## 🎯 My Recommendation

**Keep using Railway for local development!** Here's why:

### ✅ Advantages:
1. **Zero setup** - Already working
2. **Production parity** - Same environment as production
3. **Team collaboration** - Everyone uses same instance
4. **No maintenance** - Railway handles updates
5. **No resource usage** - Saves your local machine resources
6. **Already configured** - Token, channels, everything ready

### 📝 When to Use Local:
- **Offline development** - Working without internet
- **Testing schema changes** - Need to modify database
- **Performance testing** - Need absolute fastest response
- **Plugin development** - Developing Mattermost plugins

---

## 🚀 Quick Start (Current Setup)

Your current setup is already optimal for local development:

```bash
# Start frontend + show Mattermost info
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev:both
```

Your local frontend connects to Railway Mattermost:
- Frontend: `http://localhost:3000`
- Mattermost: `https://mattermost-production-84fd.up.railway.app`

**This is the recommended approach!** ✅

---

## 🔧 If You Still Want Local Mattermost

I can create scripts to help you:
1. Install and configure PostgreSQL
2. Download and setup Mattermost binary
3. Create startup scripts
4. Configure environment switching

Just let me know if you want to proceed with local installation!

---

## 📝 Current Status

### ✅ What's Working Now:
- Railway Mattermost: Running
- Frontend: Connects to Railway
- Auto-provisioning: Working
- Chat widget: Functional

### 🎯 Recommendation:
**Continue using Railway for development!** It's the best option given your system constraints.

### 🔄 Alternative:
If you absolutely need local Mattermost, I'll help you install the native binary. Let me know!
