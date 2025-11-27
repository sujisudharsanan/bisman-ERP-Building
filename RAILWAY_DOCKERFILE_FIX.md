# Railway Service Configuration Instructions

## Problem: Railway is using the OLD Dockerfile

Your logs show Railway is still trying to use the old monolithic `Dockerfile` which references `scripts/start-railway.sh`.

## Solution: Configure Dockerfile Path in Railway Dashboard

Since you have **separate services**, you need to configure each one:

### For Frontend Service:

1. Go to Railway Dashboard: https://railway.app/
2. Select your project: **discerning-creativity**
3. Click on **bisman-ERP-frontend** service
4. Go to **Settings** tab
5. Scroll to **Build** section
6. Set **Dockerfile Path**: `Dockerfile.frontend`
7. Click **Save**
8. Go to **Deployments** tab
9. Click **Deploy** or trigger redeploy

### For Backend Service:

1. In Railway Dashboard
2. Click on **bisman-ERP-backend** service  
3. Go to **Settings** tab
4. Scroll to **Build** section
5. Set **Dockerfile Path**: `Dockerfile.backend`
6. Click **Save**
7. Go to **Deployments** tab
8. Click **Deploy** or trigger redeploy

## Alternative: Use Railway CLI with Service-Specific Configuration

### Option 1: Create railway.toml files

Create separate config files for each service:

**For Frontend** (`railway.frontend.toml`):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.frontend"

[deploy]
startCommand = "node server.js"
restartPolicyType = "ON_FAILURE"
```

**For Backend** (`railway.backend.toml`):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.backend"

[deploy]
startCommand = "node index.js"
restartPolicyType = "ON_FAILURE"
```

### Option 2: Use Railway Service-Specific Directories

Create service directories:
```
/services/frontend/railway.toml → points to Dockerfile.frontend
/services/backend/railway.toml → points to Dockerfile.backend
```

## Quick Fix: Update via Railway Dashboard NOW

**Fastest solution** is to use the Railway Dashboard UI to set the Dockerfile path for each service.

This is a **one-time configuration** - after this, all future deploys will use the correct Dockerfile!
