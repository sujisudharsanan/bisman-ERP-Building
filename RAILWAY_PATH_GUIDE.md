# 🚂 Railway Path Resolution Guide

## Current Project Structure

```
BISMAN ERP/ (project root)
├── my-frontend/
│   ├── Dockerfile ✅
│   └── railway.toml ✅ (dockerfilePath = "Dockerfile")
│
└── my-backend/
    ├── Dockerfile ✅
    └── railway.toml ✅ (dockerfilePath = "Dockerfile")
```

---

## How Railway Searches for Files

### Scenario 1: ❌ Root Directory NOT SET (Default)

**Railway's working directory:** `/workspace/` (project root)

**Frontend Service:**
- Looks for: `./Dockerfile` (relative to project root)
- **Result:** ❌ ERROR - "Dockerfile does not exist"
- **Why:** No Dockerfile at project root (we deleted it)

**Backend Service:**
- Looks for: `./Dockerfile` (relative to project root)
- **Result:** ❌ ERROR - "Dockerfile does not exist"

---

### Scenario 2: ✅ Root Directory SET CORRECTLY

#### Frontend Service Configuration:
```
Root Directory: my-frontend
```

**Railway's working directory:** `/workspace/my-frontend/`

- Looks for: `Dockerfile` (= `my-frontend/Dockerfile`)
- Reads: `my-frontend/railway.toml`
- **Result:** ✅ SUCCESS - Dockerfile found!

#### Backend Service Configuration:
```
Root Directory: my-backend
```

**Railway's working directory:** `/workspace/my-backend/`

- Looks for: `Dockerfile` (= `my-backend/Dockerfile`)
- Reads: `my-backend/railway.toml`
- **Result:** ✅ SUCCESS - Dockerfile found!

---

## How to Fix in Railway Dashboard

### For Frontend Service:

1. Go to Railway Dashboard
2. Select **Frontend Service**
3. Click **Settings** tab
4. Scroll to **Source** or **Service Settings** section
5. Find **"Root Directory"** or **"Watch Paths"** field
6. Set to: `my-frontend`
7. Click **Save** or **Update**
8. Trigger new deployment (git push or manual redeploy)

### For Backend Service:

1. Go to Railway Dashboard
2. Select **Backend Service**
3. Click **Settings** tab
4. Scroll to **Source** or **Service Settings** section
5. Find **"Root Directory"** or **"Watch Paths"** field
6. Set to: `my-backend`
7. Click **Save** or **Update**
8. Trigger new deployment

---

## Path Resolution Formula

```
Final Path = Root Directory + dockerfilePath
```

### Examples:

**Frontend:**
```
Root Directory: my-frontend
dockerfilePath: Dockerfile
Final Path: my-frontend/Dockerfile ✅
```

**Backend:**
```
Root Directory: my-backend
dockerfilePath: Dockerfile
Final Path: my-backend/Dockerfile ✅
```

**Wrong Configuration (empty root):**
```
Root Directory: (empty)
dockerfilePath: Dockerfile
Final Path: ./Dockerfile ❌ (doesn't exist at root)
```

---

## Visual Railway Settings

Look for one of these in Railway Dashboard:

```
┌─────────────────────────────────────┐
│ Service Settings                    │
├─────────────────────────────────────┤
│ Root Directory: [my-frontend]       │ ← SET THIS
│                                     │
│ Build Command: (auto-detected)     │
│                                     │
│ Start Command: node server.js      │
└─────────────────────────────────────┘
```

OR

```
┌─────────────────────────────────────┐
│ Source Configuration                │
├─────────────────────────────────────┤
│ Watch Paths: [my-frontend]          │ ← OR SET THIS
│                                     │
│ Build: Dockerfile                   │
└─────────────────────────────────────┘
```

---

## Debugging Commands

Run these locally to verify paths:

```bash
# Check files exist
ls -la my-frontend/Dockerfile
ls -la my-frontend/railway.toml
ls -la my-backend/Dockerfile
ls -la my-backend/railway.toml

# Check railway.toml content
grep "dockerfilePath" my-frontend/railway.toml
grep "dockerfilePath" my-backend/railway.toml

# Simulate Railway's perspective (frontend)
cd my-frontend && ls Dockerfile && cd ..

# Simulate Railway's perspective (backend)
cd my-backend && ls Dockerfile && cd ..
```

---

## Current Configuration Status

✅ **Files are correctly placed**
✅ **railway.toml configurations are correct**
❌ **Railway Root Directory NOT SET** ← FIX THIS IN DASHBOARD

**Action Required:** Set Root Directory in Railway Dashboard for both services!
