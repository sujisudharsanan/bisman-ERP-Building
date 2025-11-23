# Quick Fix for Railway Build Error

## Issue
The Docker build is failing with "Module not found: Can't resolve 'dayjs'" even though dayjs is in package.json.

## Root Cause
The build stage was using `npm install` instead of `npm ci`, which can cause dependency resolution issues in Docker builds, especially with lockfile mismatches.

## Solution Applied
Changed Dockerfile line 18 from:
```dockerfile
RUN npm install --prefix frontend
```

To:
```dockerfile
RUN cd frontend && npm ci --ignore-scripts && npm cache clean --force
```

## Why This Fixes It
1. **`npm ci`** - Installs from package-lock.json exactly (clean install)
2. **`--ignore-scripts`** - Skips lifecycle scripts that might cause issues
3. **`npm cache clean --force`** - Ensures no cache corruption

## Verify the Fix
```bash
# Rebuild on Railway
git add Dockerfile
git commit -m "fix: use npm ci for deterministic frontend build"
git push origin deployment
```

## Alternative If Still Failing
If the issue persists, the problem might be:
1. **Stale package-lock.json** - Regenerate it:
   ```bash
   cd my-frontend
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   git commit -m "chore: regenerate package-lock.json"
   git push
   ```

2. **Railway build cache** - Clear Railway cache:
   - Go to Railway dashboard
   - Select your service
   - Settings → "Clear Build Cache"
   - Redeploy

## Expected Build Time
- With cache: ~30-45 seconds
- Without cache: ~2-3 minutes

## Related Files
- `/Dockerfile` - Main build configuration
- `/my-frontend/package.json` - Dependencies (dayjs @ 1.11.19)
- `/my-frontend/package-lock.json` - Lockfile

---
**Updated:** November 24, 2025
