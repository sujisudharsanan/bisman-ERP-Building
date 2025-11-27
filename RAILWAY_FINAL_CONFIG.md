# ✅ FINAL Railway Configuration - Service-Specific Dockerfiles

## New Clean Architecture

Each service has its Dockerfile in its own folder:

```
my-backend/
  └── Dockerfile       ← Backend Dockerfile

my-frontend/
  └── Dockerfile       ← Frontend Dockerfile
```

---

## Railway Dashboard Configuration

### Frontend Service Settings:

```
Service Name: bisman-ERP-frontend
┌─────────────────────────────────────┐
│ Root Directory: my-frontend         │
│ Dockerfile Path: Dockerfile         │
│ Start Command: (handled by Docker)  │
│ Health Check: /                     │
└─────────────────────────────────────┘
```

**Steps**:
1. Go to Railway Dashboard → bisman-ERP-frontend
2. Settings → Build
   - **Root Directory**: `my-frontend`
   - **Dockerfile Path**: `Dockerfile`
3. Settings → Deploy
   - **Health Check Path**: `/`
4. Click **Save**
5. Redeploy

---

### Backend Service Settings:

```
Service Name: bisman-ERP-backend
┌─────────────────────────────────────┐
│ Root Directory: my-backend          │
│ Dockerfile Path: Dockerfile         │
│ Start Command: (handled by Docker)  │
│ Health Check: /api/health           │
└─────────────────────────────────────┘
```

**Steps**:
1. Go to Railway Dashboard → bisman-ERP-backend
2. Settings → Build
   - **Root Directory**: `my-backend`
   - **Dockerfile Path**: `Dockerfile`
3. Settings → Deploy
   - **Health Check Path**: `/api/health`
4. Click **Save**
5. Redeploy

---

## File Structure

```
/Users/abhi/Desktop/BISMAN ERP/
├── my-backend/
│   ├── Dockerfile              ← Backend builds from here
│   ├── package.json
│   ├── prisma/
│   └── index.js
│
├── my-frontend/
│   ├── Dockerfile              ← Frontend builds from here
│   ├── package.json
│   ├── next.config.js
│   └── src/
│
├── railway.toml                ← Not used (services use their own folders)
└── railway.backend.toml        ← Not used (services use their own folders)
```

---

## How Railway Finds the Dockerfiles

### Frontend Service:
```
Railway Root: my-frontend/
Dockerfile Path: Dockerfile
Full Path: my-frontend/Dockerfile ✅
```

### Backend Service:
```
Railway Root: my-backend/
Dockerfile Path: Dockerfile
Full Path: my-backend/Dockerfile ✅
```

---

## Benefits of This Approach

✅ **Clean separation** - Each service is self-contained  
✅ **No relative path confusion** - No `../` needed  
✅ **Standard practice** - Dockerfile lives with the code  
✅ **Easy maintenance** - Each team can work independently  
✅ **No root clutter** - No Dockerfiles at repo root  

---

## Environment Variables

### Frontend Service:
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
PORT=3000
```

### Backend Service:
```env
NODE_ENV=production
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<secret>
FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
PORT=3000
```

---

## Deployment

After configuring Railway Dashboard:

```bash
# Just push to GitHub
git push origin deployment

# Railway auto-deploys both services independently!
```

---

## Verification

Check if correctly configured:

```bash
# Frontend logs
railway logs -s bisman-ERP-frontend

# Backend logs  
railway logs -s bisman-ERP-backend
```

Expected: Both should build from their respective Dockerfiles! ✅
