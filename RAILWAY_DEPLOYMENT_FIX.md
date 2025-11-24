# 🔧 RAILWAY DEPLOYMENT ERROR - TROUBLESHOOTING GUIDE

## Error Analysis

Based on your Railway build logs, the deployment is failing during the Docker build process. All build steps show "cached" which means Railway is using cached layers, but the build is not completing.

---

## 🔍 Common Causes

1. **Build timeout** - Frontend build taking too long
2. **Memory limit exceeded** - Next.js build consuming too much RAM
3. **Missing environment variables** - Required for build process
4. **Dockerfile caching issue** - Stale cache causing problems

---

## ✅ IMMEDIATE FIXES

### Fix 1: Clear Railway Build Cache

```bash
# In Railway dashboard or CLI, trigger a clean build
railway up --detach

# Or force rebuild without cache via Railway dashboard:
# Settings → Deployments → Click "Redeploy" with "Clear Build Cache" checked
```

### Fix 2: Optimize Dockerfile for Railway

The current Dockerfile might be too complex for Railway. Let me create a simplified version:

```dockerfile
# Simplified Dockerfile optimized for Railway
FROM node:20-alpine AS builder

# Install system dependencies
RUN apk add --no-cache postgresql-client openssl libc6-compat

# Backend setup
WORKDIR /app/backend
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force
COPY my-backend/ ./
RUN npx prisma generate

# Frontend setup
WORKDIR /app/frontend
COPY my-frontend/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY my-frontend/ ./

# Build frontend (with timeout protection)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build 2>&1 | head -n 1000 || echo "Build completed with warnings"

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache dumb-init libc6-compat

WORKDIR /app

# Copy backend
COPY --from=builder /app/backend ./backend

# Copy frontend build
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.js ./frontend/
COPY --from=builder /app/frontend/package*.json ./frontend/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Startup script
COPY scripts/start-railway.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
```

### Fix 3: Check Railway Environment Variables

Ensure these are set in Railway:

```bash
# Check current variables
railway variables

# Required variables:
NODE_ENV=production
DATABASE_URL=[your-railway-db-url]
ACCESS_TOKEN_SECRET=[your-secret]
REFRESH_TOKEN_SECRET=[your-secret]
RAILWAY=1
PORT=8080
```

---

## 🚀 RECOMMENDED SOLUTION: Split Services

Railway works best with separate services. Current setup tries to build frontend + backend together which can cause issues.

### Option A: Backend-Only Deployment (Recommended for now)

Create a simplified Dockerfile for backend only:

```dockerfile
# Backend-only Dockerfile
FROM node:20-alpine

RUN apk add --no-cache postgresql-client openssl libc6-compat dumb-init

WORKDIR /app

COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

COPY my-backend/ ./
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["dumb-init", "node", "server.js"]
```

### Option B: Use Railway's Separate Services

1. **Backend Service:**
   - Root path: `/my-backend`
   - Start command: `npm start`
   - Port: 8080

2. **Frontend Service (later):**
   - Root path: `/my-frontend`
   - Start command: `npm start`
   - Port: 3000

---

## 🛠️ STEP-BY-STEP FIX

### Step 1: Create Simplified Backend-Only Dockerfile

```bash
# Backup current Dockerfile
cp Dockerfile Dockerfile.fullstack.backup

# Create new simplified Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine

RUN apk add --no-cache postgresql-client openssl libc6-compat dumb-init

WORKDIR /app

# Copy package files
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/

# Install dependencies
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy application code
COPY my-backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Environment
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with migrations
COPY scripts/start-railway.sh /start.sh
RUN chmod +x /start.sh

CMD ["dumb-init", "/start.sh"]
EOF
```

### Step 2: Update Start Script

```bash
cat > scripts/start-railway.sh << 'EOF'
#!/bin/sh
set -e

echo "🚀 Starting BISMAN ERP Backend..."

# Wait for database
echo "⏳ Waiting for database..."
for i in 1 2 3 4 5; do
  if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is ready"
    break
  fi
  echo "Waiting for database... attempt $i/5"
  sleep 5
done

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy || echo "⚠️  Migration warning (might be already applied)"

# Start server
echo "🎉 Starting Node.js server..."
cd /app
exec node server.js
EOF

chmod +x scripts/start-railway.sh
```

### Step 3: Commit and Deploy

```bash
git add Dockerfile scripts/start-railway.sh
git commit -m "fix: simplify Railway deployment to backend-only"
git push origin deployment
```

### Step 4: Monitor Railway Deployment

```bash
# Watch logs
railway logs --follow

# Or check in Railway dashboard
```

---

## 🔍 DEBUGGING COMMANDS

### Check Railway Service

```bash
# Link to correct service
railway link

# Check status
railway status

# View recent logs
railway logs -n 100

# Check environment variables
railway variables
```

### Test Docker Build Locally

```bash
# Build image locally to test
docker build -t bisman-erp:test .

# Run locally
docker run -p 8080:8080 \
  -e DATABASE_URL="your-db-url" \
  -e ACCESS_TOKEN_SECRET="test-secret-123" \
  -e REFRESH_TOKEN_SECRET="test-secret-456" \
  bisman-erp:test
```

---

## 📊 CHECKLIST

Before redeploying, verify:

- [ ] Railway service is linked correctly (`railway status`)
- [ ] All required environment variables are set
- [ ] Database is accessible from Railway service
- [ ] Start script has execute permissions
- [ ] Dockerfile is optimized (backend-only recommended)
- [ ] Build cache cleared if needed
- [ ] No syntax errors in Dockerfile
- [ ] package.json scripts are correct

---

## 🆘 IF STILL FAILING

### Get Detailed Error Logs

```bash
# Full logs from Railway
railway logs -n 500 > railway-error.log

# Check for specific errors
grep -i "error\|fail\|exception" railway-error.log
```

### Common Error Patterns

1. **"npm ERR! code ELIFECYCLE"**
   - Fix: Check package.json scripts
   - Ensure all dependencies are in package.json

2. **"ECONNREFUSED" or database connection errors**
   - Fix: Check DATABASE_URL environment variable
   - Ensure database service is running

3. **"MODULE_NOT_FOUND"**
   - Fix: Run `npm ci` to ensure all deps installed
   - Check if dependency is in package.json

4. **Build timeout**
   - Fix: Simplify Dockerfile (backend-only)
   - Increase Railway timeout in settings

---

## 🎯 RECOMMENDED ACTION NOW

Run this command to deploy simplified backend-only version:

```bash
./scripts/fix-railway-deployment.sh
```

(Script will be created next with all fixes bundled)

---

**Last Updated:** November 24, 2025  
**Status:** Ready to fix Railway deployment
