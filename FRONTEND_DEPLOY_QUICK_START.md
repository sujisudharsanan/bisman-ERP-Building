# 🚀 Quick Frontend Deployment to Railway

## Current Setup
- ✅ Backend: Running at https://bisman-erp-backend-production.up.railway.app
- ✅ Database: PostgreSQL with 48 tables, demo data seeded
- 🆕 Frontend: Service created, ready to deploy

---

## Option 1: Deploy via Railway Dashboard (Easiest) ⭐

### Step 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Select your project: **discerning-creativity**
3. Click on the **frontend** service

### Step 2: Configure Build Settings
1. Click **Settings** tab
2. Under **Build**:
   - **Root Directory**: `my-frontend`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`

### Step 3: Add Environment Variables
Click **Variables** tab and add:
```
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### Step 4: Deploy
1. Click **Deploy** button (top right)
2. Or push to GitHub to trigger auto-deploy

### Step 5: Get Your Frontend URL
After deployment completes (2-5 minutes):
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Your URL will be: `https://frontend-production-XXXX.up.railway.app`

---

## Option 2: Deploy via Railway CLI

```bash
# 1. Navigate to project
cd "/Users/abhi/Desktop/BISMAN ERP"

# 2. Make deploy script executable
chmod +x deploy-frontend-railway.sh

# 3. Run deployment script
./deploy-frontend-railway.sh
```

---

## Option 3: Manual Railway CLI Steps

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"

# Link to Railway project (if not already linked)
railway link

# Switch to frontend service
railway service frontend

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Deploy
railway up

# Check status
railway status

# View logs
railway logs
```

---

## After Frontend Deployment

### 1. Update Backend CORS
Once you have your frontend URL (e.g., `https://frontend-production-abc.up.railway.app`):

Go to Railway Dashboard → **bisman-erp-backend** → Variables:
```
FRONTEND_URL=https://frontend-production-abc.up.railway.app
FRONTEND_URLS=https://frontend-production-abc.up.railway.app,https://bisman-erp-backend-production.up.railway.app
```

Then redeploy backend (click **Deploy** button)

### 2. Test Your Frontend
```bash
# Health check
curl https://your-frontend.up.railway.app/

# Test API proxy
curl https://your-frontend.up.railway.app/api/health

# Open in browser
open https://your-frontend.up.railway.app/auth/login
```

### 3. Test Login
Use these credentials:
- **Email**: `demo_hub_incharge@bisman.demo`
- **Password**: `Demo@123`

---

## Troubleshooting

### Issue: Build fails
**Check**: 
- Root directory is set to `my-frontend`
- package.json exists in my-frontend/
- All dependencies are in package.json

### Issue: API calls fail (CORS error)
**Solution**: 
1. Update backend FRONTEND_URL variable
2. Redeploy backend
3. Check backend logs for CORS configuration

### Issue: Page shows "Internal Server Error"
**Check**:
- NEXT_PUBLIC_API_URL is set correctly
- Environment variables are saved
- Rebuild after adding variables

---

## Expected Deployment Timeline

1. **Build Phase**: 2-3 minutes
   - npm install
   - npm run build
   - Creating standalone build

2. **Deploy Phase**: 1-2 minutes
   - Uploading build
   - Starting server
   - Health checks

3. **Total**: ~5 minutes

---

## Success Checklist

- [ ] Frontend service configured in Railway
- [ ] Environment variables set (NEXT_PUBLIC_API_URL)
- [ ] Build completed successfully
- [ ] Frontend URL generated
- [ ] Frontend accessible in browser
- [ ] Backend CORS updated with frontend URL
- [ ] Login page loads
- [ ] Login works with demo credentials
- [ ] Dashboard loads after login

---

## Quick Reference

### Backend URL
```
https://bisman-erp-backend-production.up.railway.app
```

### Frontend URL (after deployment)
```
https://frontend-production-XXXX.up.railway.app
```

### Database Connection
```
${{bisman-erp-db.DATABASE_URL}}
```

### Login Credentials
```
Email: demo_hub_incharge@bisman.demo
Password: Demo@123
```

---

**Recommended**: Use **Option 1 (Railway Dashboard)** for the easiest deployment experience!

Click "Apply 4 changes" button you see in your screenshot to deploy the frontend.
