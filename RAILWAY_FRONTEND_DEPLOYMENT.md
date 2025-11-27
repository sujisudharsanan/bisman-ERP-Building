# Railway Frontend Deployment Guide

## Current Status

### ✅ Backend Service
- **URL**: https://bisman-erp-backend-production.up.railway.app
- **Status**: Running successfully
- **API**: Integrated with Next.js

### ✅ Database Service
- **Public URL**: `${{bisman-erp-db.DATABASE_PUBLIC_URL}}`
- **Internal URL**: `${{bisman-erp-db.DATABASE_URL}}`
- **Status**: 48 tables created, demo data seeded

### 🆕 Frontend Service (New)
- **Status**: Created but not deployed
- **Needs**: Environment variables and deployment configuration

---

## Frontend Deployment Steps

### Step 1: Configure Frontend Environment Variables

Go to Railway Dashboard → **frontend service** → Variables tab and add:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENV=production

# Optional: If using authentication
NEXTAUTH_URL=https://your-frontend-url.up.railway.app
NEXTAUTH_SECRET=<generate-a-secret>

# Optional: Analytics or monitoring
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Step 2: Update Frontend Dockerfile (if needed)

If you're using the monorepo structure, create a frontend-specific Dockerfile:

**File: `Dockerfile.frontend`**

```dockerfile
# Frontend Dockerfile for Railway
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY my-frontend/package*.json ./
RUN npm ci --only=production

# Build the app
FROM base AS builder
WORKDIR /app
COPY my-frontend/package*.json ./
RUN npm ci
COPY my-frontend/ ./
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Step 3: Configure Railway Frontend Service

#### Option A: Using Dockerfile (Recommended)

1. Go to Railway Dashboard → **frontend service** → Settings
2. Under **Build**, set:
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.frontend`
   - **Docker Context**: `.` (root)

#### Option B: Using Nixpacks (Automatic)

1. Go to Railway Dashboard → **frontend service** → Settings
2. Under **Build**, set:
   - **Builder**: Nixpacks
   - **Root Directory**: `my-frontend`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`

### Step 4: Set Railway Variables in Frontend Service

```bash
# Build-time variables (needed during build)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# Runtime variables
NODE_ENV=production
PORT=3000
```

### Step 5: Update Backend CORS Configuration

Update backend environment variables to allow frontend URL:

```bash
# In backend service variables
FRONTEND_URL=https://your-frontend.up.railway.app
FRONTEND_URLS=https://your-frontend.up.railway.app,https://bisman-erp-backend-production.up.railway.app
```

---

## Quick Deploy via Railway CLI

### Method 1: Deploy Frontend from Root

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"

# Link to Railway project
railway link

# Select the frontend service
railway service

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# Deploy
railway up
```

### Method 2: Deploy Frontend from my-frontend Directory

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"

# Create railway.json for frontend
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Link and deploy
railway link
railway up
```

---

## Frontend Configuration Files

### Update `my-frontend/.env.production`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENV=production

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_CALLS=true
```

### Update `my-frontend/next.config.js`

Make sure you have:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Railway
  reactStrictMode: true,
  
  // API rewrites to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bisman-erp-backend-production.up.railway.app/api/:path*',
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

---

## Verification Steps

### 1. Check Frontend Deployment
Once deployed, your frontend will be available at:
```
https://frontend-production-XXXX.up.railway.app
```

### 2. Test Health Check
```bash
curl https://your-frontend.up.railway.app/
```

### 3. Test API Connection
```bash
curl https://your-frontend.up.railway.app/api/health
```

### 4. Test Login Page
Open in browser:
```
https://your-frontend.up.railway.app/auth/login
```

---

## Update Backend CORS After Frontend Deployment

Once you have your frontend URL, update backend:

```bash
cd my-backend

# Add frontend URL to backend environment
railway variables set FRONTEND_URL=https://your-frontend.up.railway.app
railway variables set FRONTEND_URLS=https://your-frontend.up.railway.app

# Redeploy backend
railway up
```

---

## Troubleshooting

### Issue: Frontend shows "API connection failed"

**Solution**: Check CORS settings in backend
```bash
# In Railway backend service
railway logs
# Look for CORS errors
```

### Issue: "Module not found" errors

**Solution**: Ensure `output: 'standalone'` in next.config.js

### Issue: Environment variables not loading

**Solution**: 
1. Prefix with `NEXT_PUBLIC_` for client-side variables
2. Rebuild after adding variables
3. Check Railway dashboard → Variables tab

### Issue: 404 on API routes

**Solution**: Add rewrites in next.config.js (see above)

---

## Complete Environment Variables Reference

### Backend Service Variables
```bash
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{bisman-erp-db.DATABASE_PUBLIC_URL}}
NODE_ENV=production
PORT=8080
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
FRONTEND_URL=https://your-frontend.up.railway.app
FRONTEND_URLS=https://your-frontend.up.railway.app
```

### Frontend Service Variables
```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### Database Service Variables
```bash
# Automatically set by Railway
DATABASE_URL=postgresql://postgres:password@host:port/railway
DATABASE_PUBLIC_URL=postgresql://postgres:password@public-host:port/railway
```

---

## Quick Commands Summary

```bash
# 1. Navigate to project
cd "/Users/abhi/Desktop/BISMAN ERP"

# 2. Link to Railway
railway link

# 3. Select frontend service
railway service

# 4. Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
railway variables set NODE_ENV=production

# 5. Deploy frontend
railway up

# 6. Check deployment status
railway status

# 7. View logs
railway logs

# 8. Get frontend URL
railway domain
```

---

## Expected Result

After deployment:
- ✅ Frontend accessible at Railway URL
- ✅ API calls proxied to backend
- ✅ Login page works
- ✅ Authentication flows work
- ✅ All features functional

---

**Next Action**: Deploy frontend using Railway CLI or push to trigger auto-deploy!
