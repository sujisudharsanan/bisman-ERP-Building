# 🚀 Vercel Deployment - Pre-Flight Checklist

## ✅ Configuration Files Status

### 1. `vercel.json` ✅
- [x] Located in project root
- [x] `buildCommand` points to my-frontend
- [x] `outputDirectory` set to my-frontend/.next
- [x] `installCommand` configured
- [x] API rewrites configured for Render backend
- [x] CORS headers configured
- [x] Environment variables defined

### 2. `package.json` (root) ✅
- [x] `vercel-build` script added
- [x] Points to my-frontend subdirectory

### 3. `.vercelignore` ✅
- [x] Excludes backend files
- [x] Excludes documentation
- [x] Optimized for faster deployment

### 4. `my-frontend/src/app/` ✅
- [x] Next.js app directory exists
- [x] Routes properly configured
- [x] Pages are functional

---

## 🎯 Deployment Steps

### Step 1: Verify Local Build
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run build
```
**Expected**: Build succeeds without errors

### Step 2: Commit Changes (if needed)
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
git add vercel.json package.json .vercelignore VERCEL_DEPLOYMENT_GUIDE.md VERCEL_DEPLOYMENT_FIX_SUMMARY.md
git commit -m "fix: Configure Vercel deployment for my-frontend subdirectory"
git push origin under-development
```

### Step 3: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select repository: `bisman-ERP-Building`
4. Configure:
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `.` (leave as root)
   - **Build Command**: `npm run vercel-build` (from package.json)
   - **Output Directory**: `my-frontend/.next` (from vercel.json)
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
   NODE_ENV=production
   ```
6. Click "Deploy"

#### Option B: Vercel CLI
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"

# Login (if not already)
vercel login

# Deploy
vercel --prod
```

---

## 🔐 Environment Variables

### Required Variables (Add in Vercel Dashboard)

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://bisman-erp-rr6f.onrender.com` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

### How to Add:
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add each variable
4. Select environments: Production, Preview, Development
5. Save

---

## 🌐 Backend Configuration Update

### Update CORS on Render (IMPORTANT!)

After getting your Vercel URL (e.g., `https://bisman-erp-xyz.vercel.app`):

1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service
3. Go to Environment
4. Update `ALLOWED_ORIGINS` variable:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://bisman-erp-xyz.vercel.app,https://*.vercel.app
   ```
5. Save and wait for service to restart

**Or** update in code (`my-backend/src/app.js`):
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://bisman-erp-xyz.vercel.app',  // Your Vercel URL
    'https://*.vercel.app'  // All Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
```

---

## 🧪 Post-Deployment Testing

### 1. Basic Checks
```
✅ Frontend loads: https://your-project.vercel.app
✅ No blank page
✅ Styles loaded correctly
✅ No console errors
```

### 2. Navigation Tests
```
✅ Home page redirects to login
✅ Login page loads
✅ All routes accessible
✅ Page refresh works (no 404)
```

### 3. API Integration Tests
```
✅ Open Browser DevTools → Network tab
✅ Try to login
✅ Check API request goes to Render backend
✅ No CORS errors
✅ Response received correctly
✅ Authentication successful
```

### 4. Role-Based Tests
```
✅ Login as SUPER_ADMIN → redirects to /super-admin
✅ Login as ADMIN → redirects to /admin
✅ Login as MANAGER → redirects to /manager
✅ Dashboard loads with correct permissions
```

### 5. Mobile Responsiveness
```
✅ Open DevTools → Toggle device toolbar
✅ Test on Mobile (375px width)
✅ Test on Tablet (768px width)
✅ Mobile menu works
✅ Layout responsive
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Build Fails - "Cannot find module"
**Solution**: 
```bash
cd my-frontend
npm install
git add package-lock.json
git commit -m "fix: Update dependencies"
git push
```

### Issue 2: Page Loads but API Fails
**Symptoms**: Console shows CORS errors or 404 on API calls

**Solution**:
1. Check Vercel environment variables are set
2. Update backend CORS (see Backend Configuration section)
3. Verify Render backend is running

### Issue 3: 404 on Page Refresh
**Solution**: This shouldn't happen with Next.js App Router, but if it does:
1. Check `my-frontend/src/app/` directory structure
2. Verify `next.config.js` rewrites are correct
3. Check Vercel build logs

### Issue 4: Deployment Succeeds but Shows Wrong Content
**Solution**:
1. Clear Vercel cache: Dashboard → Settings → Clear Cache
2. Redeploy: Dashboard → Deployments → Latest → Redeploy
3. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Issue 5: Environment Variables Not Working
**Solution**:
1. Verify variables in Vercel Dashboard → Settings → Environment Variables
2. Ensure `NEXT_PUBLIC_` prefix for client-side variables
3. Redeploy after adding variables

---

## 📊 Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| Local build verification | 2-3 minutes | ⏳ |
| Push to Git | 1 minute | ⏳ |
| Vercel build & deploy | 3-5 minutes | ⏳ |
| DNS propagation (custom domain) | 5-60 minutes | ⏳ |
| Backend CORS update | 2-3 minutes | ⏳ |
| Testing | 10-15 minutes | ⏳ |

**Total Time**: ~25-40 minutes (first deployment)

---

## 🎉 Success Indicators

You'll know deployment is successful when:

```
✅ Vercel deployment shows "Ready"
✅ Frontend URL is accessible
✅ Login page loads with styling
✅ Can login successfully
✅ Dashboard loads after login
✅ No errors in browser console
✅ API calls reach backend
✅ All navigation works
✅ Mobile view is responsive
```

---

## 📝 Quick Command Reference

```bash
# Local build test
cd my-frontend && npm run build

# Git commit
git add -A
git commit -m "fix: Vercel deployment configuration"
git push

# Vercel CLI deploy
vercel --prod

# View deployment logs
vercel logs <deployment-url>

# Check environment variables
vercel env ls

# Pull env variables locally
vercel env pull
```

---

## 📞 Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel CLI**: https://vercel.com/docs/cli
- **Support**: https://vercel.com/support

---

## 🔄 Rollback Plan (If Needed)

If deployment fails and you need to rollback:

### Via Vercel Dashboard:
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu → Promote to Production

### Via CLI:
```bash
vercel rollback <deployment-url>
```

---

## 📌 Notes

- **Backend URL**: `https://bisman-erp-rr6f.onrender.com`
- **Frontend Directory**: `my-frontend/`
- **App Directory**: `my-frontend/src/app/`
- **Build Output**: `my-frontend/.next/`
- **Framework**: Next.js 15.5.4
- **Node Version**: 18+ (Vercel default)

---

## ✅ Final Checklist Before Deploy

Before clicking "Deploy" or running `vercel --prod`:

- [ ] Local build succeeds (`cd my-frontend && npm run build`)
- [ ] All changes committed and pushed to Git
- [ ] Vercel project created/connected
- [ ] Environment variables configured in Vercel
- [ ] Backend is running on Render
- [ ] Team notified about deployment
- [ ] Backup of current production (if applicable)

---

**Status**: 🟢 Ready to Deploy  
**Configuration**: ✅ Complete  
**Backend**: ✅ Running on Render  
**Next Action**: Deploy to Vercel

---

**Created**: October 14, 2025  
**For**: BISMAN ERP Deployment  
**Issue Fixed**: Vercel subdirectory deployment configuration
