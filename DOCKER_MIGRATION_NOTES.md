# Docker Configuration - Separate Services

## Current Active Files (Nov 28, 2025)

### ✅ ACTIVE - Separate Services Architecture:
- `Dockerfile.backend` - Backend service only
- `Dockerfile.frontend` - Frontend service only
- `start-backend.sh` - Backend startup script
- `start-frontend.sh` - Frontend startup script

### 📦 ARCHIVED - Old Monolithic Setup:
- `Dockerfile.monolithic.old` - Old combined frontend+backend (deprecated)
- `start-railway.sh.old` - Old unified startup (deprecated)

## Migration Notes

**Before (Monolithic):**
- Single container running both frontend and backend
- Backend served frontend via Next.js integration
- One Dockerfile, one startup script

**After (Microservices):**
- Separate Railway services for frontend and backend
- Independent deployments and scaling
- Backend: `Dockerfile.backend` → API + Database
- Frontend: `Dockerfile.frontend` → Next.js SSR

## Railway Configuration

### Backend Service:
```
Service: bisman-ERP-backend
Dockerfile: Dockerfile.backend
Port: 3000
```

### Frontend Service:
```
Service: bisman-ERP-frontend
Dockerfile: Dockerfile.frontend
Port: 3000
```

## Why the Change?

1. **Independent Scaling** - Scale frontend and backend separately
2. **Faster Deployments** - Only rebuild what changed
3. **Better Resource Management** - Dedicated resources per service
4. **Easier Debugging** - Isolated logs and metrics
5. **Industry Standard** - Follows microservices best practices

## If You Need to Rollback

To revert to monolithic setup:
```bash
mv Dockerfile.monolithic.old Dockerfile
mv start-railway.sh.old start-railway.sh
```

Then update Railway to use `Dockerfile` instead of `Dockerfile.backend`/`Dockerfile.frontend`.
