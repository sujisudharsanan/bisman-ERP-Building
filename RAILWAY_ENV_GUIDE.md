# Railway Environment Variables Setup

## Required Environment Variables

Set these in your Railway project settings (Settings → Variables):

### Production Environment
```bash
# Node Environment
NODE_ENV=production

# Server Port (Railway sets this automatically)
PORT=8080

# Database (Railway Postgres plugin will set this automatically)
DATABASE_URL=postgresql://...

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-secret-key-here
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# Optional: Frontend URL (only if frontend is on separate domain)
# Not needed if frontend and backend are on same Railway service
# FRONTEND_URL=https://your-frontend-domain.railway.app
```

### How to Generate Secure Secrets

```bash
# Generate a random secret (use in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

## Current Setup (Same-Origin Deployment)

Since your frontend and backend are deployed together on Railway:

✅ **No CORS issues** - same origin, no Cross-Origin Resource Sharing needed
✅ **No FRONTEND_URL needed** - both served from same domain
✅ **Cookies work automatically** - `sameSite: 'lax'` is perfect for same-origin
✅ **No cross-domain complexity** - simpler and more secure

## Cookie Configuration

Cookies are automatically configured for Railway:

- **httpOnly: true** - Prevents JavaScript access (XSS protection)
- **secure: true** - Only sent over HTTPS (Railway provides HTTPS)
- **sameSite: 'lax'** - Perfect for same-origin setup
- **path: '/'** - Available across entire site

## Login Credentials (Development/Testing)

Default demo accounts available:

```
Super Admin:
Email: super@bisman.local
Password: password (or changeme)

Admin:
Email: admin@bisman.local
Password: changeme

Manager:
Email: manager@bisman.local
Password: changeme

Staff/Hub:
Email: hub@bisman.local
Password: changeme
```

## Verifying Setup

After deployment, test these endpoints:

```bash
# 1. Health check
curl https://your-app.railway.app/api/health

# 2. Login (should return user data and set cookies)
curl -X POST https://your-app.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@bisman.local","password":"password"}' \
  -c cookies.txt -v

# 3. Check auth (should return user info using cookies)
curl https://your-app.railway.app/api/me \
  -b cookies.txt -v
```

## Troubleshooting

### "No token found in cookies"
- Check that cookies are set: Response should have `Set-Cookie` headers
- Verify `sameSite: 'lax'` (not 'none' for same-origin)
- Ensure `secure: true` (Railway uses HTTPS)

### "Origin undefined"
- This is normal for same-origin requests
- CORS allows `undefined` origin (same-origin)
- Not an error when frontend/backend are on same domain

### Database Connection Issues
- Railway Postgres plugin sets `DATABASE_URL` automatically
- Check Railway dashboard: Data → Postgres → Connection string
- Prisma will use this automatically

## Production Checklist

- [ ] Set strong JWT secrets (32+ characters, random)
- [ ] `NODE_ENV=production` is set
- [ ] Database is connected (check `/api/health/database`)
- [ ] Login works and sets cookies
- [ ] `/api/me` returns user data
- [ ] Frontend loads and authenticates

## Security Notes

✅ **Current setup is secure because:**
- Cookies are `httpOnly` (no JS access)
- Cookies are `secure` (HTTPS only)
- No CORS attacks (same-origin)
- JWT tokens are properly signed
- Rate limiting on auth endpoints (5 attempts per 15 min)

🔒 **Keep these secret:**
- JWT_SECRET
- ACCESS_TOKEN_SECRET  
- REFRESH_TOKEN_SECRET
- DATABASE_URL

Never commit these to git!
