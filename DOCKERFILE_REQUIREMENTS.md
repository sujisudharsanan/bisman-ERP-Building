# Separate Frontend & Backend Deployment - Dockerfile Guide

## ✅ What You Need (FINAL ANSWER)

For **separate deployments**, you need exactly **2 Dockerfiles**:

```
Repository Root
│
├── my-backend/
│   └── Dockerfile          ← Builds ONLY backend (Express + DB)
│
├── my-frontend/
│   └── Dockerfile          ← Builds ONLY frontend (Next.js)
│
└── (NO other Dockerfiles needed!)
```

## Railway Configuration

### Backend Service: `bisman-ERP-backend`

**Dashboard Settings**:
```
Root Directory:    my-backend
Dockerfile Path:   Dockerfile
Build Context:     my-backend/
Result:            Uses my-backend/Dockerfile
```

**What It Builds**:
- ✅ Express backend
- ✅ Database migrations
- ✅ API endpoints
- ❌ NO frontend

---

### Frontend Service: `bisman-ERP-frontend`

**Dashboard Settings**:
```
Root Directory:    my-frontend
Dockerfile Path:   Dockerfile
Build Context:     my-frontend/
Result:            Uses my-frontend/Dockerfile
```

**What It Builds**:
- ✅ Next.js frontend
- ✅ Static assets
- ✅ SSR/SSG
- ❌ NO backend

---

## How Railway Finds Dockerfiles

### Backend:
```
Railway Root Dir:  my-backend/
Dockerfile Path:   Dockerfile
Full Path:         my-backend/Dockerfile ✅
```

### Frontend:
```
Railway Root Dir:  my-frontend/
Dockerfile Path:   Dockerfile
Full Path:         my-frontend/Dockerfile ✅
```

---

## What Each Dockerfile Contains

### `my-backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy backend files (from my-backend/ directory)
COPY package*.json ./
COPY prisma ./prisma/
COPY . ./

# Install and build
RUN npm ci
RUN npx prisma generate

# Start backend
CMD ["node", "index.js"]
```

### `my-frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy frontend files (from my-frontend/ directory)
COPY package*.json ./
COPY . ./

# Build Next.js
RUN npm ci
RUN npm run build

# Production server
FROM node:20-alpine
COPY --from=builder /app/.next/standalone ./
CMD ["node", "server.js"]
```

---

## Common Mistakes to Avoid

❌ **DON'T** put Dockerfile at repository root  
❌ **DON'T** use `../my-backend/` or `../my-frontend/` paths  
❌ **DON'T** try to build both services in one Dockerfile  
❌ **DON'T** have multiple Dockerfiles at root (Dockerfile.backend, Dockerfile.frontend, etc.)  

✅ **DO** keep each Dockerfile in its service folder  
✅ **DO** use relative paths from the service folder (COPY . ./)  
✅ **DO** set Railway Root Directory to the service folder  
✅ **DO** keep services completely independent  

---

## Deployment Process

1. **Update Railway Dashboard**:
   - Backend: Root Directory = `my-backend`
   - Frontend: Root Directory = `my-frontend`

2. **Push to GitHub**:
   ```bash
   git push origin deployment
   ```

3. **Railway Automatically**:
   - Detects changes in `my-backend/` → Builds with `my-backend/Dockerfile`
   - Detects changes in `my-frontend/` → Builds with `my-frontend/Dockerfile`
   - Deploys each service independently

---

## Benefits of This Approach

✅ **True Microservices** - Each service is completely independent  
✅ **Fast Builds** - Only rebuild what changed  
✅ **Easy Scaling** - Scale frontend and backend separately  
✅ **Clear Structure** - Dockerfile lives with the code  
✅ **No Confusion** - No root-level Dockerfiles to manage  

---

## Current Status

✅ Removed root-level Dockerfiles  
✅ Only 2 Dockerfiles remain (in service folders)  
⚠️ **ACTION REQUIRED**: Update Railway Dashboard Root Directories

Once Dashboard is updated, you'll have a clean microservices architecture! 🎯
