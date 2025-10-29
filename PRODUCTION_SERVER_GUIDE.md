# Production Server Guide

## Current Status ✅

**Production Next.js server is running on port 3000**

- Build: Clean production build completed (29 Oct 2025)
- Server: Next.js 14.2.33 standalone mode
- Static chunks: Properly served with `application/javascript` Content-Type
- All pages: Responding with HTTP 200

## Quick Commands

### Check Server Status
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
lsof -iTCP:3000 -sTCP:LISTEN
```

### View Server Logs
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
tail -f logs/prod.log
```

### Stop Server
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
kill -9 $(cat logs/prod.pid)
# Or force kill all on port 3000:
lsof -ti:3000 | xargs kill -9
```

### Rebuild and Restart
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"

# Stop current server
lsof -ti:3000 | xargs kill -9 || true

# Clean rebuild
rm -rf .next
export NO_CACHE=1 CI=true
npm run build

# Copy static files to standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Start production server
NODE_ENV=production PORT=3000 nohup node .next/standalone/server.js > logs/prod.log 2>&1 &
echo $! > logs/prod.pid

# Wait and verify
sleep 3
tail logs/prod.log
```

## Key URLs

- **Home**: http://localhost:3000/
- **Login**: http://localhost:3000/auth/login
- **Enterprise Admin Modules**: http://localhost:3000/enterprise-admin/modules
- **Enterprise Admin Users**: http://localhost:3000/enterprise-admin/users
- **Enterprise Admin Organizations**: http://localhost:3000/enterprise-admin/organizations

## Build Configuration

### Environment Variables
- `NO_CACHE=1` - Disables webpack persistent cache (prevents ENOSPC)
- `CI=true` - Skips lint/type-check during build (faster builds)
- `NODE_ENV=production` - Production mode
- `PORT=3000` - Server port

### Next.js Config
- Output: `standalone` mode
- Cache: Disabled when `NO_CACHE=1` or `CI=true`
- Security headers: CSP, nosniff, XSS protection
- Rewrites: Same-origin API proxy (no CORS)

## Standalone Build Structure

```
.next/standalone/
├── .next/
│   ├── static/          ← Must be copied manually
│   ├── server/
│   └── ...build files
├── public/              ← Must be copied manually
├── node_modules/
├── package.json
└── server.js           ← Main server file
```

**Important**: After `npm run build`, you must:
1. Copy `.next/static` to `.next/standalone/.next/static`
2. Copy `public` to `.next/standalone/public`

## Troubleshooting

### Chunks Return 404/nosniff
**Problem**: Static chunks not found or wrong Content-Type

**Solution**:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
# Copy static files
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
# Restart server
lsof -ti:3000 | xargs kill -9
NODE_ENV=production PORT=3000 nohup node .next/standalone/server.js > logs/prod.log 2>&1 &
```

### Dev HMR Module Errors
**Problem**: `Cannot find module './1682.js'` in dev mode

**Solution**: Use production mode instead:
```bash
# Stop dev server
lsof -ti:3000 | xargs kill -9
# Use production (no HMR issues)
npm run build && NODE_ENV=production node .next/standalone/server.js
```

### ENOSPC During Build
**Problem**: No space left on device

**Solution**:
```bash
export NO_CACHE=1  # Disable webpack cache
rm -rf .next       # Clean old build
npm run build
```

### Build Taking Too Long
**Problem**: Lint/type-check slowing down build

**Solution**:
```bash
export CI=true     # Skip lint/type-check
npm run build
```

## Production Deployment

For deployment to Railway/Vercel/Render:

1. Ensure `next.config.js` has `output: 'standalone'`
2. Set environment variables:
   - `NODE_ENV=production`
   - `CI=true` (optional, for faster builds)
3. Build command: `npm run build`
4. Post-build: Copy static files
5. Start command: `node .next/standalone/server.js`

## Module Management Page

The 4-column Module Management page is now live at:
http://localhost:3000/enterprise-admin/modules

**Features**:
- Categories selection (left column)
- Super Admins filtered by category (second column)
- Modules list (third column)
- Pages by module (right column)
- Assign selected pages to super admin
- Metrics cards showing totals

**API Endpoints Used**:
- `GET /api/admin/modules` - List all modules
- `GET /api/admin/users?role=super_admin` - List super admins
- `GET /layout_registry.json` - Pages registry
- `POST /api/enterprise-admin/super-admins/:id/assign-module` - Assign pages

## Latest Build Output

```
✓ Compiled successfully
✓ Generating static pages (131/131)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
├ ○ /                                    8.88 kB        96.1 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/auth/logout                     0 B                0 B
└ ○ /login                               3.5 kB         90.7 kB
+ First Load JS shared by all            87.2 kB
```

**Note**: The "Dynamic server usage" warning on `/api/permissions` is benign and doesn't affect functionality.

---

**Last Updated**: 29 October 2025, 11:53 AM
**Build Status**: ✅ Production Ready
**Server Status**: ✅ Running on :3000
