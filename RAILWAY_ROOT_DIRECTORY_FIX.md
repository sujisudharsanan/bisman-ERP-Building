# 🚨 URGENT: Railway Root Directory Fix

## Problem:
Railway says: `failed to read dockerfile: open Dockerfile.frontend: no such file or directory`

This means Railway's **Root Directory** is set incorrectly!

## Solution:

### Frontend Service Configuration:

1. Go to Railway Dashboard
2. Select **bisman-ERP-frontend** service
3. Go to **Settings** tab
4. Find **Root Directory** setting
5. **Set it to**: `/` (root of repository)
   - OR leave it **EMPTY** (same as root)
   - **NOT** `/my-frontend/` ❌

6. **Dockerfile Path**: `Dockerfile.frontend`
   - This path is relative to the Root Directory
   - Since Root Directory is `/`, it looks for `/Dockerfile.frontend` ✅

7. Click **Save**
8. Go to **Deployments** → Click **Redeploy**

---

## Correct Settings for Frontend:

```
Service: bisman-ERP-frontend
├─ Root Directory: /  (or empty)
├─ Dockerfile Path: Dockerfile.frontend
├─ Build Command: (leave empty, handled by Dockerfile)
└─ Start Command: node server.js
```

---

## Correct Settings for Backend:

```
Service: bisman-ERP-backend
├─ Root Directory: /  (or empty)
├─ Dockerfile Path: Dockerfile.backend
├─ Build Command: (leave empty, handled by Dockerfile)
└─ Start Command: node index.js
```

---

## Why This Matters:

Railway constructs the path like this:
```
Full Path = Root Directory + Dockerfile Path
```

**Current (WRONG)**:
- Root Directory: `/my-frontend/` (or something else)
- Dockerfile Path: `Dockerfile.frontend`
- Result: `/my-frontend/Dockerfile.frontend` ❌ (doesn't exist)

**Correct**:
- Root Directory: `/`
- Dockerfile Path: `Dockerfile.frontend`
- Result: `/Dockerfile.frontend` ✅ (exists!)

---

## Quick Check:

Your files are located here:
```
/Dockerfile.frontend        ← Frontend Dockerfile ✅
/Dockerfile.backend         ← Backend Dockerfile ✅
/my-frontend/               ← Frontend source code
/my-backend/                ← Backend source code
```

Railway needs to start from `/` to see the Dockerfiles!
