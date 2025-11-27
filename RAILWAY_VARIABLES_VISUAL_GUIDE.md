# 🎯 How to Find Variables in Railway Dashboard

## 📍 Step-by-Step Visual Guide

### Step 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Click on your project: **discerning-creativity** (or your project name)

---

### Step 2: Select Backend Service

You'll see 3 boxes/cards:
- **bisman-ERP-Backend** ← Click this one first
- **bisman-ERP-frontend**
- **bisman-erp-db**

**Click on the `bisman-ERP-Backend` service box**

---

### Step 3: Find the Variables Tab

After clicking the service, you'll see the service details page.

**Look at the TOP of the page** - you'll see several tabs:

```
┌─────────────────────────────────────────────────┐
│  Deployments  |  Variables  |  Settings  |  Metrics  │
└─────────────────────────────────────────────────┘
```

**Click on the "Variables" tab** (second tab)

---

### Alternative Way to Access Variables:

If you can't find the tabs at the top, try this:

1. Click on **bisman-ERP-Backend** service
2. Look for a **sidebar on the left** with icons
3. Find an icon that looks like a **key** or **gear**
4. Click on it - this might be the Variables section

---

## 📝 What You'll See in Variables Tab

Once you're in the Variables section, you'll see:

```
┌─────────────────────────────────────────┐
│  Variables                               │
│  ─────────────────────────────────      │
│                                          │
│  [+ New Variable]  button                │
│                                          │
│  Existing variables (if any):           │
│  • DATABASE_URL                          │
│  • NODE_ENV                              │
│  • etc...                                │
└─────────────────────────────────────────┘
```

---

## 🚀 How to Add Variables

### Method 1: One by One

1. Click **[+ New Variable]** button
2. You'll see two fields:
   - **Name:** (e.g., `FRONTEND_URL`)
   - **Value:** (e.g., `https://bisman-erp-frontend-production.up.railway.app`)
3. Click **Add** or **Save**
4. Repeat for each variable

---

### Method 2: Raw Editor (Faster!)

Look for a button that says:
- **"Raw Editor"** or
- **"Edit Raw"** or
- Three dots menu ⋮ → **"Raw Editor"**

This lets you paste all variables at once:

```bash
FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
FRONTEND_URLS=https://bisman-erp-frontend-production.up.railway.app
CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app
ALLOW_LOCALHOST=0
JWT_SECRET=your-secret-here
SESSION_SECRET=your-session-secret-here
```

---

## 📋 Backend Variables to Add

**For `bisman-ERP-Backend` service:**

Copy and paste these (use Raw Editor if available):

```bash
# Database (should already exist)
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}

# Environment
NODE_ENV=production
PORT=8080

# Secrets (CHANGE THESE!)
JWT_SECRET=bisman-erp-jwt-secret-change-this-2025
SESSION_SECRET=bisman-erp-session-secret-change-this-2025

# Frontend URLs for CORS (USE YOUR EXACT URL)
FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
FRONTEND_URLS=https://bisman-erp-frontend-production.up.railway.app
CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app

# Security
ALLOW_LOCALHOST=0

# Database Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Logging
LOG_LEVEL=info
```

---

## 📋 Frontend Variables to Add

**For `bisman-ERP-frontend` service:**

1. Click on **bisman-ERP-frontend** service
2. Click **Variables** tab
3. Add these:

```bash
# Backend API URL (USE YOUR EXACT BACKEND URL)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE_URL=https://bisman-erp-backend-production.up.railway.app

# Environment
NODE_ENV=production
PORT=3000

# Railway
RAILWAY=1

# Next.js
NEXT_TELEMETRY_DISABLED=1

# Features
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENV=production
```

---

## 🔄 After Adding Variables

**IMPORTANT:** Variables won't take effect until you redeploy!

### How to Redeploy:

1. Stay on the service page (Backend or Frontend)
2. Click **"Deployments"** tab (first tab)
3. Look for **"Deploy"** button (usually top-right)
4. Click **"Deploy"**
5. Wait for deployment to complete (3-8 minutes)

---

## 🎯 Quick Screenshot Guide

### Where to Look:

```
Railway Dashboard Layout:
┌─────────────────────────────────────────────────┐
│  Railway Logo    Your Project Name    Profile   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  Backend     │  │  Frontend    │            │
│  │  Service     │  │  Service     │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  Click one service ↓                            │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Deployments | Variables | Settings       │  │
│  │                                           │  │
│  │  Click "Variables" tab here ←            │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🚨 If You Still Can't Find It

### Try These:

1. **URL Method:**
   - Go to: `https://railway.app/project/YOUR_PROJECT_ID/service/BACKEND_SERVICE_ID`
   - Add `/variables` to the end
   - Full URL: `https://railway.app/project/.../service/.../variables`

2. **Use Railway CLI:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Link project
   railway link
   
   # Set variables
   railway variables set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
   ```

3. **Look for Settings Icon:**
   - Some Railway UI versions have Variables under **Settings**
   - Click Settings → Look for "Environment Variables" section

---

## 📸 What the Variables Tab Looks Like

When you find it, you'll see something like:

```
Variables
─────────────────────────────────────

Service Variables                    [+ New Variable]
────────────────────────────────────────────────────

Variable Name          Value
─────────────────────  ──────────────────────────
DATABASE_URL           postgres://...
NODE_ENV              production
PORT                  8080

[Add more variables using + New Variable button]

────────────────────────────────────────────────────
Shared Variables                     [+ New]
────────────────────────────────────────────────────
(Empty or existing shared vars)
```

---

## ✅ Verification

After adding variables, verify they're set:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Check variables
railway variables
```

This will show all variables for the selected service.

---

## 🆘 Still Stuck?

**Send me a screenshot of:**
1. Your Railway dashboard after clicking on Backend service
2. What tabs/buttons you see at the top
3. Any sidebars or menus you see

I'll help you find the exact location!

---

## 📞 Alternative: Use Railway CLI

If you can't find the Variables tab, use CLI instead:

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Select backend service
railway service

# Add variables one by one
railway variables set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
railway variables set CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app
railway variables set NODE_ENV=production
railway variables set PORT=8080

# Deploy
railway up
```

---

**Let me know which step you're stuck on and I'll help you further!** 🚀
