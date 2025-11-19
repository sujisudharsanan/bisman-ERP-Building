# 🚨 Vercel Deployment Fix

## Problem
Vercel deployment failing with:
```
npm error Missing script: "build"
Error: Command "npm run build" exited with 1
```

**Root Cause:** Vercel is trying to build from the root directory instead of the `my-frontend` subdirectory.

## ✅ Solution

### Option A: Configure in Vercel Dashboard (Recommended - Easiest)

1. **Go to your Vercel project:**
   - https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → General**

3. **Set Root Directory:**
   - Find "Root Directory" section
   - Click "Edit"
   - Enter: `my-frontend`
   - Click "Save"

4. **Verify Build Settings:**
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

5. **Redeploy:**
   - Go to "Deployments" tab
   - Click "..." on latest deployment → "Redeploy"
   - ✅ Should build successfully!

### Option B: Delete and Re-import Project

If Option A doesn't work:

1. **Delete the existing project from Vercel**
   - Go to Settings → General
   - Scroll to bottom → "Delete Project"

2. **Re-import from GitHub:**
   - Go to Vercel Dashboard
   - Click "Add New" → "Project"
   - Import `bisman-ERP-Building` repository
   - **IMPORTANT:** When configuring:
     - Root Directory: `my-frontend`
     - Framework: Next.js (auto-detected)
     - Leave other settings as default

3. **Set Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NODE_ENV=production
   ```

4. **Deploy:**
   - Click "Deploy"
   - ✅ Should build successfully!

## 🔧 Alternative: Create a Root package.json (Not Recommended)

If you absolutely cannot change Root Directory in Vercel:

```json
// Create /package.json in the root
{
  "name": "bisman-erp-monorepo",
  "scripts": {
    "build": "cd my-frontend && npm install && npm run build",
    "start": "cd my-frontend && npm start",
    "dev": "cd my-frontend && npm run dev"
  }
}
```

**But this is NOT recommended** because it complicates your monorepo structure.

## 📝 Environment Variables for Vercel

After deployment succeeds, set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

# Optional
NODE_ENV=production
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

**Important:** 
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Non-prefixed variables are server-side only
- After changing env vars, you MUST redeploy

## 🧪 Test Deployment

Once deployed successfully:

```bash
# Test homepage
curl https://your-app.vercel.app

# Test API connection (open in browser)
https://your-app.vercel.app/login
```

## ⚠️ Common Issues

### Issue: Still shows "Missing script: build"
**Fix:** Clear Vercel build cache
- Go to Settings → General
- Find "Build & Development Settings"
- Toggle "Build Command" (edit it, then save with same value)
- This forces Vercel to re-detect settings
- Redeploy

### Issue: "Cannot find module 'next'"
**Fix:** Root Directory is wrong
- Ensure Root Directory is set to `my-frontend`
- Not `my-frontend/` (no trailing slash)
- Not empty (would use root)

### Issue: "NEXT_PUBLIC_API_URL is undefined"
**Fix:** Environment variables not set
- Go to Settings → Environment Variables
- Add `NEXT_PUBLIC_API_URL`
- **Must redeploy** after adding env vars

### Issue: CORS errors after deployment
**Fix:** Update backend FRONTEND_URL
- Go to Render dashboard
- Update `FRONTEND_URL` to your Vercel URL:
  ```
  FRONTEND_URL=https://your-app.vercel.app
  ```
- Render will auto-redeploy

### Issue: 404 on all pages except homepage
**Fix:** Next.js routing issue
- Ensure you're using Next.js 15.5.4 (check package.json)
- Verify you have `app` directory (not `pages`)
- Check `next.config.js` for any custom routing

## 📂 Project Structure (For Reference)

Your repository structure:
```
bisman-ERP-Building/
├── my-backend/           # → Deploy to Render
│   ├── package.json
│   ├── index.js
│   └── ...
├── my-frontend/          # → Deploy to Vercel (set as Root Directory)
│   ├── package.json      # ✅ Has "build": "next build"
│   ├── next.config.js
│   ├── src/
│   └── ...
├── render.yaml           # Render config
└── vercel.json           # Vercel config (minimal)
```

## ✅ Deployment Checklist

- [ ] Set Root Directory to `my-frontend` in Vercel
- [ ] Framework detected as Next.js
- [ ] Build command is `npm run build`
- [ ] Environment variables set (NEXT_PUBLIC_API_URL)
- [ ] Deployment successful
- [ ] Homepage loads
- [ ] Login page works
- [ ] API calls reach backend
- [ ] Updated FRONTEND_URL in Render backend

## 🚀 Quick Fix Commands (If needed)

```bash
# Verify package.json has build script
cd my-frontend
cat package.json | grep "build"
# Should show: "build": "next build"

# Test build locally
npm run build
# Should succeed

# Check Next.js version
npm list next
# Should show: next@15.5.4
```

## 📞 Still Having Issues?

1. Check Vercel build logs for specific errors
2. Verify Root Directory setting (most common issue)
3. Try deleting and re-importing project
4. Check that `my-frontend/package.json` has `"build": "next build"`

---

**Reference:** See `CLOUD_DEPLOYMENT_GUIDE.md` for complete deployment documentation.
