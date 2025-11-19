# Production Deployment Guide - Mattermost Chat Integration

## Overview
This guide covers deploying the Bisman ERP with integrated Mattermost chat to production (Railway, Vercel, or similar platforms).

---

## Prerequisites

### Required Services
- ✅ **ERP Frontend**: Next.js app (Railway/Vercel)
- ✅ **ERP Backend**: Node.js/Express API (Railway)
- ✅ **Mattermost**: Self-hosted or Railway deployment
- ✅ **PostgreSQL**: For backend and Mattermost

### Required Environment Variables

#### Frontend (Next.js)
```bash
# Mattermost Configuration
MM_BASE_URL=https://your-mattermost.railway.app
MM_ADMIN_TOKEN=your_admin_token_here
NEXT_PUBLIC_MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_DEMO_PASSWORD=your_secure_password_here

# Backend API
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
BACKEND_API_URL=https://your-backend.railway.app

# Database (if needed for SSR)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Node Environment
NODE_ENV=production
```

#### Backend (Express)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PORT=3001
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here
```

#### Mattermost (Docker/Railway)
```bash
MM_DBNAME=mattermost
MM_USERNAME=mmuser
MM_PASSWORD=your_db_password_here
MM_HOST=postgres_host
MM_PORT=5432
MM_SERVICESETTINGS_SITEURL=https://your-mattermost.railway.app
```

---

## Deployment Steps

### 1. Deploy Mattermost (Railway)

#### Option A: Using Railway Template
1. Go to Railway dashboard
2. Click "New Project" → "Deploy from Template"
3. Search for "Mattermost" template
4. Configure environment variables
5. Deploy

#### Option B: Manual Docker Deployment
Create `Dockerfile` for Mattermost:
```dockerfile
FROM mattermost/mattermost-team-edition:latest

# Copy custom config if needed
# COPY config.json /mattermost/config/config.json

EXPOSE 8065

CMD ["mattermost"]
```

Deploy to Railway:
```bash
railway login
railway init
railway up
```

#### Configure Mattermost After Deployment
1. Access Mattermost URL: `https://your-mattermost.railway.app`
2. Create admin account
3. Go to **System Console** → **Web Server**
   - **Site URL**: `https://your-mattermost.railway.app`
   - **Enable CORS**: Yes
   - **CORS Origin**: Add your ERP frontend URL
   
4. Go to **System Console** → **Users and Teams**
   - Enable **Open Server** (for provisioning) OR
   - Configure **OAuth 2.0** for SSO

5. Generate Admin Token:
   - Go to **Account Settings** → **Security** → **Personal Access Tokens**
   - Create token with full permissions
   - Copy token for `MM_ADMIN_TOKEN`

---

### 2. Deploy Backend API (Railway/Render)

```bash
# From project root
cd my-backend

# Install dependencies
npm ci

# Build TypeScript (if applicable)
npm run build

# Deploy to Railway
railway login
railway init
railway up
```

**Environment Variables** (set in Railway dashboard):
- `DATABASE_URL`
- `PORT=3001`
- `NODE_ENV=production`
- `JWT_SECRET`

**Health Check**: Verify at `https://your-backend.railway.app/api/health`

---

### 3. Deploy Frontend (Vercel/Railway)

#### Option A: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# From frontend directory
cd my-frontend

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard or via CLI:
```bash
vercel env add MM_BASE_URL production
vercel env add MM_ADMIN_TOKEN production
vercel env add NEXT_PUBLIC_API_URL production
# ... add all required vars
```

#### Option B: Railway

```bash
cd my-frontend
railway login
railway init
railway up
```

Add environment variables via Railway dashboard.

---

### 4. Configure CORS and Security Headers

#### In Mattermost `config.json` (System Console → Environment → Web Server):
```json
{
  "ServiceSettings": {
    "SiteURL": "https://your-mattermost.railway.app",
    "AllowCorsFrom": "https://your-erp.vercel.app https://your-erp.railway.app",
    "CorsAllowCredentials": true,
    "CorsExposedHeaders": "Content-Type, Authorization",
    "WebsocketURL": "",
    "EnableInsecureOutgoingConnections": false
  }
}
```

#### In Next.js `next.config.js`:
Already configured! Verify these sections exist:
- ✅ Rewrites for `/chat/*` → Mattermost
- ✅ Headers with CSP allowing iframe embedding
- ✅ `X-Frame-Options: SAMEORIGIN`

---

### 5. Database Setup

#### Backend Database (PostgreSQL)
```sql
-- Run migrations
npm run migrate:production

-- Or manually run SQL files
psql $DATABASE_URL < schema.sql
```

#### Mattermost Database
Mattermost auto-migrates on startup. Ensure:
- PostgreSQL 12+ is running
- Database is created: `CREATE DATABASE mattermost;`
- User has full permissions

---

### 6. SSL/TLS Configuration

**Railway automatically provides SSL**. Ensure:
- ✅ All `MM_BASE_URL` and `NEXT_PUBLIC_API_URL` use `https://`
- ✅ Cookie settings use `SameSite=None; Secure` (handled automatically in production)
- ✅ WebSocket connections use `wss://` (Mattermost auto-detects)

---

### 7. Testing Production Deployment

#### Health Checks
```bash
# Backend API
curl https://your-backend.railway.app/api/health

# Mattermost
curl https://your-mattermost.railway.app/api/v4/system/ping

# Frontend (proxied Mattermost)
curl https://your-erp.vercel.app/api/mattermost/health
```

#### Test Chat Login
1. Open ERP in browser: `https://your-erp.vercel.app`
2. Login with admin credentials
3. Click chat widget icon
4. Should see Mattermost channels (not login page)
5. Check browser DevTools → Application → Cookies
   - Look for `MMAUTHTOKEN` cookie
   - Should have `SameSite=None; Secure`

#### Test Chat Functionality
- ✅ Send a message in team chat
- ✅ Create a direct message
- ✅ Switch between tabs (Team/DM/Support)
- ✅ Open full chat in new tab

---

## Security Checklist

### Environment Variables
- [ ] All secrets stored in platform environment (not committed to git)
- [ ] `MM_ADMIN_TOKEN` is secure and rotated periodically
- [ ] `JWT_SECRET` is strong (32+ chars, random)
- [ ] `DATABASE_URL` uses strong password
- [ ] `NEXT_PUBLIC_MM_DEMO_PASSWORD` is changed from default

### Mattermost Configuration
- [ ] Admin account has strong password
- [ ] Open server is disabled (or OAuth is configured)
- [ ] Rate limiting is enabled
- [ ] Email verification is enabled
- [ ] CORS is restricted to your ERP domain only
- [ ] Personal Access Tokens are restricted

### Network Security
- [ ] All connections use HTTPS/WSS
- [ ] CORS headers properly configured
- [ ] CSP headers allow only necessary resources
- [ ] Firewall rules restrict database access

### Application Security
- [ ] Error messages don't expose sensitive info in production
- [ ] Logging excludes passwords and tokens
- [ ] Rate limiting on login endpoints
- [ ] Session timeout configured
- [ ] SQL injection prevention (parameterized queries)

---

## Monitoring and Logging

### Railway Logs
```bash
# View frontend logs
railway logs --service=frontend

# View backend logs
railway logs --service=backend

# View Mattermost logs
railway logs --service=mattermost
```

### Key Metrics to Monitor
- **Uptime**: Frontend, Backend, Mattermost
- **Error Rate**: 4xx/5xx responses
- **Response Time**: API latency
- **Database Connections**: Pool usage
- **Memory/CPU**: Resource utilization

### Alerting
Set up Railway/Vercel alerts for:
- Service downtime
- High error rate (>5% 5xx)
- Memory usage >80%
- Database connection errors

---

## Troubleshooting Production Issues

### Issue: Chat shows login page instead of auto-login

**Diagnosis**:
```bash
# Check cookies in browser DevTools
# Should see MMAUTHTOKEN with Secure flag

# Check login endpoint
curl -i -X POST https://your-erp.vercel.app/api/mattermost/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Look for Set-Cookie headers with SameSite=None; Secure
```

**Solutions**:
1. Verify `MM_BASE_URL` uses HTTPS
2. Check CORS configuration in Mattermost
3. Ensure cookies have `SameSite=None; Secure`
4. Clear browser cache and cookies

---

### Issue: CORS errors in browser console

**Diagnosis**:
```
Access to fetch at 'https://mattermost.../api/v4/...' from origin 'https://erp...' 
has been blocked by CORS policy
```

**Solutions**:
1. Add your ERP domain to Mattermost CORS config
2. Restart Mattermost after config change
3. Verify rewrites in `next.config.js` are working
4. Check browser console for specific CORS error details

---

### Issue: Database connection errors

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check database is running and accessible
3. Test connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
4. Check connection pool settings
5. Review database logs

---

### Issue: High memory usage / crashes

**Solutions**:
1. Increase Railway service RAM allocation
2. Check for memory leaks (Node.js profiling)
3. Optimize database queries (add indexes)
4. Enable Next.js production optimizations:
   ```js
   // next.config.js
   swcMinify: true,
   compress: true,
   ```
5. Use caching (Redis) for frequent queries

---

## Performance Optimization

### Frontend (Next.js)
```js
// next.config.js
module.exports = {
  compress: true,
  swcMinify: true,
  images: {
    domains: ['your-mattermost.railway.app'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  }
}
```

### Backend API
- Use connection pooling for database
- Implement caching (Redis/in-memory)
- Enable gzip compression
- Use database indexes on frequently queried fields

### Mattermost
- Configure search indexing
- Enable data retention policies
- Set up CDN for static assets
- Use read replicas for database if needed

---

## Backup and Recovery

### Database Backups
Railway provides automatic daily backups. Manual backup:
```bash
# Backend database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Mattermost database
pg_dump $MM_DATABASE_URL > mattermost_backup_$(date +%Y%m%d).sql
```

### File Storage
Mattermost file uploads should use S3 or similar:
```json
{
  "FileSettings": {
    "DriverName": "amazons3",
    "AmazonS3AccessKeyId": "...",
    "AmazonS3SecretAccessKey": "...",
    "AmazonS3Bucket": "mattermost-files"
  }
}
```

### Restore Process
```bash
# Restore database
psql $DATABASE_URL < backup_20250111.sql

# Restart services
railway restart
```

---

## Scaling Considerations

### Horizontal Scaling
- **Frontend**: Vercel auto-scales
- **Backend**: Railway can run multiple instances
- **Mattermost**: Requires load balancer + shared storage

### Vertical Scaling
Increase Railway service resources:
- Small: 512MB RAM, 0.5 CPU
- Medium: 2GB RAM, 1 CPU
- Large: 4GB RAM, 2 CPU

### Database Scaling
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer)
- Index optimization
- Partitioning for large tables

---

## Cost Optimization

### Railway Pricing
- Starter: $5/month per service
- Pro: Usage-based ($0.000463/GB-hour)

### Tips to Reduce Costs
1. Use Railway's free tier for development
2. Set resource limits on services
3. Implement efficient caching
4. Use CDN for static assets
5. Archive old data (Mattermost retention)
6. Monitor and optimize slow queries

---

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Weekly: Review error logs
- [ ] Monthly: Rotate secrets/tokens
- [ ] Monthly: Review and archive old data
- [ ] Quarterly: Update dependencies
- [ ] Quarterly: Performance audit
- [ ] Annually: Security audit

### Update Process
```bash
# Update dependencies
npm audit fix
npm update

# Test locally
npm run dev:both

# Deploy to staging
vercel --prod --scope=staging

# Deploy to production
vercel --prod
```

---

## Emergency Procedures

### Complete Service Outage
1. Check Railway status page
2. Review error logs
3. Rollback to previous deployment if needed:
   ```bash
   vercel rollback
   railway rollback
   ```
4. Notify users via status page

### Data Breach Response
1. Immediately rotate all secrets
2. Force logout all users (revoke sessions)
3. Review access logs
4. Notify affected users
5. Update security measures

---

## Checklist: Pre-Launch

- [ ] All environment variables configured
- [ ] SSL certificates valid
- [ ] Health checks passing
- [ ] Chat widget loads properly
- [ ] Can send/receive messages
- [ ] CORS configured correctly
- [ ] Error tracking set up (Sentry)
- [ ] Monitoring dashboards configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained on admin tasks
- [ ] Incident response plan ready

---

## Resources

- [Mattermost Documentation](https://docs.mattermost.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Railway Guides](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)

---

## Support Contacts

- **Technical Issues**: Open GitHub issue
- **Mattermost Help**: https://mattermost.com/support/
- **Railway Support**: https://railway.app/help

---

**Last Updated**: November 11, 2025
**Version**: 1.0.0
