# 🚨 Render Deployment Fix

## Problem
Render was failing with `Cannot find module 'cors'` because dependencies weren't being installed properly.

## Solution Applied

### 1. Created `render.yaml` (Infrastructure as Code)
- Automatically configures your Render service
- Sets up PostgreSQL database
- Configures environment variables
- Defines build and start commands

### 2. Fixed `my-backend/package.json`
- Added `"build": "prisma generate"` script
- Added `"postinstall": "prisma generate"` to auto-generate Prisma Client
- Fixed syntax errors (trailing commas)

### 3. Added `.node-version` file
- Ensures Render uses Node.js 18.20.8 (matching your local version)

## Deploy to Render (Two Options)

### Option A: Using render.yaml (Recommended - Automatic)

1. **Push changes to Git:**
   ```bash
   git add render.yaml my-backend/package.json my-backend/.node-version
   git commit -m "fix: add Render configuration for automated deployment"
   git push origin main
   ```

2. **Connect to Render:**
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repo: `bisman-ERP-Building`
   - Render will detect `render.yaml` and auto-configure everything
   - Click "Apply"

3. **Set Environment Variables** (in Render dashboard):
   - `FRONTEND_URL`: Your Vercel URL (e.g., `https://your-app.vercel.app`)
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   
   The database URL will be automatically set from the PostgreSQL service.

### Option B: Manual Setup (If Blueprint Doesn't Work)

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `bisman-erp-db`
   - Region: Oregon (or closest to you)
   - Plan: Free
   - Click "Create Database"
   - Copy the **Internal Database URL**

2. **Create Web Service:**
   - Go to Render Dashboard → New → Web Service
   - Connect GitHub repo: `bisman-ERP-Building`
   - Configure:
     ```
     Name: bisman-erp-backend
     Region: Oregon (same as database)
     Branch: main
     Root Directory: my-backend
     Runtime: Node
     Build Command: npm install && npx prisma generate
     Start Command: npm start
     ```

3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<paste Internal Database URL from step 1>
   JWT_SECRET=<generate with: openssl rand -base64 32>
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy automatically

## Verify Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-backend.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

## Update Frontend

After backend is deployed, update your Vercel frontend:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL` to your Render URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```
3. Redeploy frontend

## Common Issues & Fixes

### Issue: "Cannot find module 'X'"
**Fix:** Dependencies not installed. Ensure Build Command includes `npm install`:
```bash
npm install && npx prisma generate
```

### Issue: "Prisma Client not generated"
**Fix:** Added `postinstall` script in package.json (already done)

### Issue: Database connection fails
**Fix:** 
- Use **Internal Database URL** (not External) in `DATABASE_URL`
- Ensure backend and database are in the same region
- Format: `postgres://user:password@dpg-xxxxx-postgres.render.com/database_name`

### Issue: CORS errors
**Fix:** Set `FRONTEND_URL` in Render to match your Vercel domain exactly:
```
FRONTEND_URL=https://your-app.vercel.app
```

## Files Changed

- ✅ `/render.yaml` - Render infrastructure configuration
- ✅ `/my-backend/package.json` - Added build scripts and fixed syntax
- ✅ `/my-backend/.node-version` - Locked Node.js version to 18.20.8

## Next Steps

1. Push these changes to Git
2. Deploy using Option A or B above
3. Test the health endpoint
4. Update frontend with new backend URL
5. Test full login flow

---

**Reference:** See `CLOUD_DEPLOYMENT_GUIDE.md` for complete deployment documentation.
