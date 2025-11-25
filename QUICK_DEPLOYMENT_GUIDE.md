# 🚀 Quick Production Deployment Guide

## ✅ Pre-Deployment Verification

### 1. Check All Errors Are Fixed ✓
```bash
cd my-frontend
npm run type-check  # Should show 0 errors ✓
```

### 2. Test Build Locally
```bash
cd my-frontend
npm run build
npm start  # Test on http://localhost:3000
```

---

## 🔧 Production Environment Setup

### Frontend Environment (.env.production)
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com

# Optional: Analytics, Monitoring
# NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

### Backend Environment (.env.production)
```env
# Server
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@host:5432/bisman_erp
DB_HOST=your-db-host.com
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=bisman_erp

# Authentication
JWT_SECRET=generate-a-secure-random-string-here
JWT_EXPIRES_IN=7d

# Security
COOKIE_SECRET=another-secure-random-string

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## 🚢 Deployment Steps

### Option 1: Deploy to Railway (Recommended)

**Backend:**
1. Go to [Railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Deploy from GitHub (my-backend folder)
5. Set environment variables
6. Note the backend URL

**Frontend:**
1. Create new service in same project
2. Deploy from GitHub (my-frontend folder)
3. Set NEXT_PUBLIC_API_URL to backend URL
4. Deploy

### Option 2: Deploy to Vercel + Railway

**Database (Railway):**
```bash
1. Create Railway project
2. Add PostgreSQL
3. Copy DATABASE_URL
```

**Backend (Railway):**
```bash
1. Create new service
2. Deploy my-backend
3. Add environment variables
4. Note the backend URL
```

**Frontend (Vercel):**
```bash
cd my-frontend
vercel --prod

# Or use Vercel dashboard:
# 1. Import GitHub repository
# 2. Set root directory to my-frontend
# 3. Add environment variables
# 4. Deploy
```

### Option 3: Deploy to VPS (DigitalOcean, AWS, etc.)

**1. Prepare Server:**
```bash
# SSH into server
ssh root@your-server-ip

# Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql nginx
```

**2. Setup Database:**
```bash
sudo -u postgres psql
CREATE DATABASE bisman_erp;
CREATE USER bisman_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bisman_erp TO bisman_user;
\q
```

**3. Deploy Backend:**
```bash
cd /var/www
git clone your-repo.git
cd your-repo/my-backend
npm install --production
npm run build  # if applicable

# Create .env file
nano .env
# Paste production environment variables

# Start with PM2
npm install -g pm2
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup
```

**4. Deploy Frontend:**
```bash
cd /var/www/your-repo/my-frontend
npm install
npm run build

# Start with PM2
pm2 start npm --name "frontend" -- start
```

**5. Configure Nginx:**
```nginx
# /etc/nginx/sites-available/bisman-erp
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bisman-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Post-Deployment Verification

### 1. Test Frontend
```bash
curl https://your-domain.com
# Should return HTML
```

### 2. Test Backend API
```bash
curl https://your-domain.com/api/health
# Should return { "status": "ok" } or similar
```

### 3. Test Authentication
1. Open browser to your domain
2. Try to log in
3. Verify dashboard loads
4. Check that protected routes work

### 4. Test Key Features
- [ ] User login/logout
- [ ] Create a task
- [ ] Upload a file
- [ ] Send a chat message
- [ ] Start a video call

---

## 🔒 Security Checklist (Critical!)

Before going live:

```bash
# 1. Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output for JWT_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output for COOKIE_SECRET

# 2. Verify environment variables
# - No default passwords
# - All secrets are random and secure
# - Database credentials are strong

# 3. Enable HTTPS
# - Install SSL certificate
# - Redirect HTTP to HTTPS
# - Set secure cookie flags

# 4. Configure CORS
# - Allow only your frontend domain
# - No wildcards in production

# 5. Rate limiting
# - Verify it's enabled on backend
# - Test it works (try multiple requests)
```

---

## 📊 Monitoring Setup

### Health Checks
Add a health check endpoint (already in backend):
```bash
# Test it
curl https://your-backend-url.com/api/health
```

### Logging
```bash
# Backend logs (if using PM2)
pm2 logs backend

# Frontend logs (if using PM2)
pm2 logs frontend
```

### Uptime Monitoring
Consider setting up:
- UptimeRobot (free)
- Pingdom
- Better Uptime
- Railway built-in monitoring

---

## 🆘 Quick Troubleshooting

### Issue: 502 Bad Gateway
```bash
# Check if services are running
pm2 status

# Restart services
pm2 restart all

# Check nginx
sudo systemctl status nginx
sudo nginx -t
```

### Issue: Database Connection Failed
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check database is running
sudo systemctl status postgresql
```

### Issue: Frontend Can't Reach Backend
```bash
# Check NEXT_PUBLIC_API_URL in frontend
echo $NEXT_PUBLIC_API_URL

# Should match your backend URL
# Rebuild frontend if changed
cd my-frontend
npm run build
pm2 restart frontend
```

---

## 🎉 You're Live!

Once everything is verified:

1. ✅ Share the URL with your team
2. ✅ Monitor logs for first 24 hours
3. ✅ Set up automated backups
4. ✅ Document any custom configurations
5. ✅ Create runbook for common issues

---

## 📞 Support Resources

**Documentation:**
- Frontend: `/my-frontend/README.md`
- Backend: `/my-backend/README.md`
- API: `/API_DOCUMENTATION.md`

**Logs Location:**
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`

**Database Backup:**
```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20250126.sql
```

---

*Quick Reference Guide*  
*Version: 1.0*  
*Date: November 26, 2025*  
*Status: ✅ Ready for Production*
