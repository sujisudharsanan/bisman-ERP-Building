# Railway CLI Quick Guide

**Date**: November 27, 2025  
**Railway CLI Version**: 4.11.0

---

## 🚀 Essential Railway CLI Commands

### **1. Authentication**
```bash
# Login to Railway
railway login

# Check who you're logged in as
railway whoami

# Logout
railway logout
```

---

### **2. Project Management**

```bash
# Link this directory to your Railway project
railway link

# Check current project status
railway status

# List all your projects
railway list

# Open project in browser
railway open
```

---

### **3. Environment Variables**

```bash
# View all environment variables
railway variables

# Add a new environment variable
railway variables --set KEY=VALUE

# Add multiple variables
railway variables --set FRONTEND_URL=https://your-frontend.app
railway variables --set JWT_SECRET=your-secret-here

# Delete a variable
railway variables --unset KEY
```

---

### **4. Deployment**

```bash
# Deploy current directory
railway up

# Deploy with specific environment
railway up --environment production

# Redeploy (force new deployment)
railway redeploy

# Check deployment logs
railway logs

# Follow logs in real-time
railway logs --follow
```

---

### **5. Database Management**

```bash
# Add PostgreSQL database
railway add --database postgres

# Add Redis
railway add --database redis

# Connect to database shell
railway run psql

# Get database connection string
railway variables | grep DATABASE_URL
```

---

### **6. Running Commands**

```bash
# Run a command in Railway environment
railway run node index.js

# Run migrations
railway run npx prisma migrate deploy

# Run any shell command with Railway environment
railway run <your-command>
```

---

### **7. Logs & Debugging**

```bash
# View logs
railway logs

# View logs for specific service
railway logs --service backend

# Follow logs in real-time
railway logs --follow

# View last 100 lines
railway logs --tail 100
```

---

### **8. Service Management**

```bash
# List services in project
railway service

# Switch to different service
railway service <service-name>

# Open service in browser
railway open
```

---

## 🔧 Quick Fix Commands for Your Deployment

### **Step 1: Link to Your Project**
```bash
railway link
# Select your project from the list
```

### **Step 2: Add PostgreSQL**
```bash
railway add --database postgres
```

### **Step 3: Set Environment Variables**
```bash
# Set frontend URL
railway variables --set FRONTEND_URL=https://your-frontend-domain.up.railway.app

# Generate and set JWT secret
JWT_SECRET=$(openssl rand -base64 48)
railway variables --set JWT_SECRET=$JWT_SECRET

# Generate and set session secret
SESSION_SECRET=$(openssl rand -base64 48)
railway variables --set SESSION_SECRET=$SESSION_SECRET
```

### **Step 4: Check Variables**
```bash
railway variables
```

### **Step 5: View Deployment Logs**
```bash
railway logs --follow
```

### **Step 6: Run Migrations (if needed)**
```bash
railway run npx prisma migrate deploy
```

---

## 🎯 Complete Fix Script

Run these commands in order:

```bash
# 1. Link to your project
railway link

# 2. Add PostgreSQL
railway add --database postgres

# 3. Set all required environment variables
railway variables --set FRONTEND_URL=https://your-frontend.up.railway.app
railway variables --set JWT_SECRET=$(openssl rand -base64 48)
railway variables --set SESSION_SECRET=$(openssl rand -base64 48)

# 4. Verify variables are set
railway variables | grep -E "DATABASE_URL|FRONTEND_URL|JWT_SECRET|SESSION_SECRET"

# 5. Redeploy to apply changes
railway redeploy

# 6. Watch logs
railway logs --follow

# 7. Run migrations
railway run npx prisma migrate deploy
```

---

## 🔍 Troubleshooting Commands

### Check if variables are set correctly:
```bash
railway variables
```

### Test database connection:
```bash
railway run node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e));"
```

### View current deployment status:
```bash
railway status
```

### Open Railway dashboard:
```bash
railway open
```

### Get help for any command:
```bash
railway help
railway <command> --help
```

---

## 📝 Common Use Cases

### View Real-Time Logs
```bash
railway logs --follow
```

### Set Multiple Variables at Once
```bash
railway variables --set FRONTEND_URL=https://frontend.app \
  JWT_SECRET=$(openssl rand -base64 48) \
  SESSION_SECRET=$(openssl rand -base64 48)
```

### Run Database Migrations
```bash
railway run npx prisma migrate deploy
```

### Test Login Endpoint
```bash
# Get your backend URL first
railway open

# Then test (replace URL with yours)
curl -X POST https://bisman-erp-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'
```

### Check Health Endpoint
```bash
# Get your backend URL
BACKEND_URL=$(railway open --print)

# Test health
curl $BACKEND_URL/api/health
```

---

## 🎓 Interactive Mode

```bash
# Start interactive mode
railway

# This opens an interactive shell where you can:
# - View logs
# - Manage variables
# - Run commands
# - Deploy
```

---

## 🔐 Security Best Practices

### Never commit secrets to git:
```bash
# Add to .gitignore
echo ".railway/*" >> .gitignore
echo "railway.json" >> .gitignore
```

### Rotate secrets periodically:
```bash
# Generate new JWT secret
railway variables --set JWT_SECRET=$(openssl rand -base64 48)
```

### Use different environments:
```bash
# Production
railway variables --set NODE_ENV=production --environment production

# Staging
railway variables --set NODE_ENV=staging --environment staging
```

---

## 📊 Useful Aliases

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# Railway shortcuts
alias rl='railway link'
alias rs='railway status'
alias rlogs='railway logs --follow'
alias rv='railway variables'
alias ropen='railway open'
alias rup='railway up'
alias rredeploy='railway redeploy'
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

---

## 🎯 Your Next Steps

1. **Link your project:**
   ```bash
   railway link
   ```

2. **View current variables:**
   ```bash
   railway variables
   ```

3. **Check if DATABASE_URL exists:**
   ```bash
   railway variables | grep DATABASE_URL
   ```

4. **If no DATABASE_URL, add PostgreSQL:**
   ```bash
   railway add --database postgres
   ```

5. **Set missing variables:**
   ```bash
   railway variables --set FRONTEND_URL=https://your-frontend.up.railway.app
   railway variables --set JWT_SECRET=$(openssl rand -base64 48)
   railway variables --set SESSION_SECRET=$(openssl rand -base64 48)
   ```

6. **Watch deployment:**
   ```bash
   railway logs --follow
   ```

---

## 📞 Help & Documentation

- **Railway Docs**: https://docs.railway.app
- **CLI Reference**: https://docs.railway.app/develop/cli
- **Get CLI Help**: `railway help`
- **Command Help**: `railway <command> --help`

---

**Quick Start**: Run `railway link` to connect this directory to your Railway project!

