# Vercel Deployment Guide for BISMAN ERP

## 🚀 Quick Deployment Steps

### Prerequisites
- Backend deployed on Render: `https://bisman-erp-rr6f.onrender.com`
- Vercel account with CLI installed (optional)
- GitHub repository connected to Vercel (recommended)

---

## Method 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository: `bisman-ERP-Building`
4. Select the repository and click **"Import"**

### Step 2: Configure Project Settings

#### Root Directory
- **Root Directory**: Leave as `.` (root)
- Vercel will automatically use the `vercel.json` configuration

#### Framework Preset
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run vercel-build` (from `package.json`)
- **Output Directory**: `my-frontend/.next` (from `vercel.json`)
- **Install Command**: `cd my-frontend && npm install`

#### Environment Variables
Add these in the Vercel Dashboard under **"Environment Variables"**:

```env
# Backend API URL (REQUIRED)
NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com

# Environment
NODE_ENV=production
```

### Step 3: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (3-5 minutes)
3. Your app will be live at `https://your-project.vercel.app`

---

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from Root Directory
```bash
# Navigate to project root
cd "/Users/abhi/Desktop/BISMAN ERP"

# Deploy (first time)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? bisman-erp (or your choice)
# - Directory? ./ (root)
# - Override settings? No (uses vercel.json)

# For production deployment
vercel --prod
```

---

## 🔧 Configuration Files

### 1. `vercel.json` (Root Directory)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "cd my-frontend && npm install && npm run build",
  "outputDirectory": "my-frontend/.next",
  "devCommand": "cd my-frontend && npm run dev",
  "installCommand": "cd my-frontend && npm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://bisman-erp-rr6f.onrender.com/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://bisman-erp-rr6f.onrender.com"
  }
}
```

**Key Features**:
- ✅ Points to `my-frontend` subdirectory
- ✅ Proxies `/api/*` requests to Render backend
- ✅ Sets CORS headers for API calls
- ✅ Configures environment variables

### 2. `package.json` Scripts
```json
{
  "scripts": {
    "vercel-build": "cd my-frontend && npm install && npm run build"
  }
}
```

### 3. `.vercelignore`
Excludes unnecessary files from deployment:
```
my-backend/
apps/
system-docs/
node_modules/
*.log
```

---

## 🌐 API Proxy Configuration

Your Vercel deployment will proxy API requests to your Render backend:

- **Frontend URL**: `https://your-project.vercel.app`
- **API Proxy**: `https://your-project.vercel.app/api/*` → `https://bisman-erp-rr6f.onrender.com/api/*`
- **Direct Backend**: `https://bisman-erp-rr6f.onrender.com`

### Example API Calls

```typescript
// In your frontend code
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Will be proxied through Vercel
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// Or use the full URL
fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

---

## 🔐 Environment Variables Setup

### Vercel Dashboard Method
1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://bisman-erp-rr6f.onrender.com` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

### Vercel CLI Method
```bash
# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://bisman-erp-rr6f.onrender.com

vercel env add NODE_ENV production
# Enter value: production

# Pull environment variables for local development
vercel env pull
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Couldn't find any `pages` or `app` directory"
**Solution**: ✅ Already fixed in `vercel.json` with proper directory configuration

### Issue 2: API Calls Failing (CORS Errors)
**Cause**: Backend not configured for Vercel domain

**Solution**: Update backend CORS settings on Render:

In your backend `my-backend/src/app.js` or `server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-project.vercel.app',  // Add your Vercel URL
    'https://*.vercel.app'  // Allow all Vercel preview deployments
  ],
  credentials: true
}));
```

Or set environment variable in Render:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://your-project.vercel.app,https://*.vercel.app
```

### Issue 3: Environment Variables Not Working
**Solution**: 
- Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check Vercel Dashboard → Settings → Environment Variables

### Issue 4: Build Fails with Module Not Found
**Cause**: Missing dependencies in `my-frontend/package.json`

**Solution**:
```bash
cd my-frontend
npm install
npm run build  # Test locally first
```

### Issue 5: 404 on Page Refresh
**Cause**: Next.js routing issue

**Solution**: Already handled by Next.js App Router. Verify `my-frontend/app/` directory structure exists.

---

## 📊 Deployment Checklist

Before deploying to Vercel, ensure:

- [ ] Backend is running on Render: `https://bisman-erp-rr6f.onrender.com`
- [ ] `vercel.json` points to `my-frontend` directory
- [ ] `package.json` has `vercel-build` script
- [ ] Environment variables are configured
- [ ] CORS is enabled on backend for Vercel domain
- [ ] Local build succeeds: `cd my-frontend && npm run build`
- [ ] `.vercelignore` excludes unnecessary files
- [ ] Git repository is pushed to GitHub/GitLab/Bitbucket

---

## 🔄 Continuous Deployment

Once connected to Git:
- **Push to `main` branch** → Automatic production deployment
- **Push to other branches** → Automatic preview deployments
- **Pull Requests** → Preview deployment with unique URL

---

## 📈 Post-Deployment

### Verify Deployment
1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Test login functionality
3. Check API calls in Browser DevTools → Network tab
4. Verify all routes work correctly

### Monitor Performance
- Vercel Dashboard → Analytics
- Check build logs for warnings
- Monitor API response times

### Custom Domain (Optional)
1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning (automatic)

---

## 🎯 Quick Commands Reference

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls

# View logs
vercel logs <deployment-url>

# Remove deployment
vercel rm <deployment-name>

# Open project in browser
vercel open

# Pull environment variables
vercel env pull
```

---

## 📞 Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel CLI Reference**: https://vercel.com/docs/cli

---

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Frontend loads at Vercel URL
- ✅ Login page is accessible
- ✅ API calls reach backend on Render
- ✅ Authentication works correctly
- ✅ All routes are accessible
- ✅ No CORS errors in browser console
- ✅ Build time is under 5 minutes

---

**Last Updated**: October 14, 2025  
**Backend URL**: https://bisman-erp-rr6f.onrender.com  
**Frontend Directory**: `my-frontend`  
**Framework**: Next.js 15.5.4
