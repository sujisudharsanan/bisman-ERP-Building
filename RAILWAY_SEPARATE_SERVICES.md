# Railway Separate Services Configuration

## Architecture Overview

You now have **separate Railway services** for frontend and backend:

```
┌─────────────────────────────────────────────────┐
│           Railway Project                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────┐   ┌──────────────────┐   │
│  │ Backend Service  │   │ Frontend Service │   │
│  ├──────────────────┤   ├──────────────────┤   │
│  │ Dockerfile:      │   │ Dockerfile:      │   │
│  │ Dockerfile.      │   │ Dockerfile.      │   │
│  │   backend        │   │   frontend       │   │
│  ├──────────────────┤   ├──────────────────┤   │
│  │ • Express API    │   │ • Next.js App    │   │
│  │ • Database       │   │ • Static Assets  │   │
│  │ • Migrations     │   │ • SSR/SSG        │   │
│  │ • Socket.IO      │   │                  │   │
│  └──────────────────┘   └──────────────────┘   │
│         ↑                        ↓              │
│         └────────API Calls───────┘              │
└─────────────────────────────────────────────────┘
```

## Files Created

### Backend Service:
- `Dockerfile.backend` - Backend-only Docker image
- `start-backend.sh` - Backend startup script (also embedded in Dockerfile)

### Frontend Service:
- `Dockerfile.frontend` - Frontend-only Docker image
- `start-frontend.sh` - Frontend startup script (also embedded in Dockerfile)

## Railway Service Configuration

### Backend Service Setup:

1. **Service Name**: `bisman-ERP-backend`
2. **Root Directory**: `/` (or leave empty)
3. **Dockerfile Path**: `Dockerfile.backend`
4. **Environment Variables**:
   ```
   DATABASE_URL=<your-postgres-url>
   JWT_SECRET=<your-secret>
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
   ```

### Frontend Service Setup:

1. **Service Name**: `bisman-ERP-frontend`
2. **Root Directory**: `/` (or leave empty)
3. **Dockerfile Path**: `Dockerfile.frontend`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
   NODE_ENV=production
   PORT=3000
   ```

## Deployment Commands

### Deploy Backend:
```bash
# Link to backend service
railway service bisman-ERP-backend

# Deploy
railway up --dockerfile Dockerfile.backend
# OR push to GitHub and Railway auto-deploys
```

### Deploy Frontend:
```bash
# Link to frontend service
railway service bisman-ERP-frontend

# Deploy
railway up --dockerfile Dockerfile.frontend
# OR push to GitHub and Railway auto-deploys
```

## Railway Dashboard Configuration

For each service in Railway dashboard:

### Backend Service Settings:
- **Build**: 
  - Builder: Dockerfile
  - Dockerfile Path: `Dockerfile.backend`
- **Deploy**:
  - Start Command: (handled by Dockerfile ENTRYPOINT)
  - Port: 3000

### Frontend Service Settings:
- **Build**:
  - Builder: Dockerfile
  - Dockerfile Path: `Dockerfile.frontend`
- **Deploy**:
  - Start Command: (handled by Dockerfile ENTRYPOINT)
  - Port: 3000

## Important Notes

1. **No more monolithic deployment** - Each service deploys independently
2. **CORS Configuration** - Backend must allow frontend URL in CORS
3. **API URL** - Frontend needs to know backend URL via env var
4. **Database** - Only backend connects to database
5. **Migrations** - Run automatically by backend on startup

## Testing

### Backend Health Check:
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

### Frontend Check:
```bash
curl https://bisman-erp-frontend-production.up.railway.app
```

## Troubleshooting

If builds fail:
1. Check Railway logs: `railway logs`
2. Verify Dockerfile path in service settings
3. Ensure environment variables are set
4. Check that CORS allows frontend URL in backend
