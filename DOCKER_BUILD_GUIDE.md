# Docker Build Guide - Next.js Frontend

## Overview
This guide provides clean-rebuild procedures, Docker build commands, and troubleshooting for the BISMAN ERP Next.js frontend.

---

## Local Clean Rebuild Checklist

Run these commands from the repository root to ensure a fully clean build:

```bash
# 1. Navigate to frontend directory
cd my-frontend

# 2. Remove all build artifacts and caches
rm -rf .next node_modules .turbo .cache dist
find . -name 'tsconfig.tsbuildinfo' -delete
find . -name '.eslintcache' -delete

# 3. Clean npm cache (optional but recommended after version changes)
npm cache clean --force

# 4. Fresh deterministic install
npm ci

# 5. Regenerate Prisma client (if prisma used in frontend)
npx prisma generate

# 6. Set required build-time environment variables
export NEXT_PUBLIC_API_URL=/api
export NEXT_PUBLIC_MM_TEAM_SLUG=erp

# 7. Lint (will fail fast if code issues exist)
npm run lint

# 8. Type-check (catches TypeScript errors before build)
npm run type-check

# 9. Build with verbose error output
npm run build:verbose

# 10. (Optional) Test the production build locally
NODE_ENV=production node .next/standalone/server.js
# Then visit http://localhost:3000
```

### Quick cleanup script (copy-paste)
```bash
cd my-frontend && \
  rm -rf .next node_modules .turbo .cache dist && \
  npm cache clean --force && \
  npm ci && \
  npx prisma generate && \
  export NEXT_PUBLIC_API_URL=/api && \
  export NEXT_PUBLIC_MM_TEAM_SLUG=erp && \
  npm run lint && \
  npm run type-check && \
  npm run build:verbose
```

---

## Docker Build Commands

### Build standalone frontend image (from repo root)

```bash
# Enable BuildKit for cache mounts and better output
export DOCKER_BUILDKIT=1

# Remove old image (optional)
docker image rm bisman-frontend:latest 2>/dev/null || true

# Build with plain progress for full error visibility
docker build \
  --progress=plain \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg NEXT_PUBLIC_MM_TEAM_SLUG=erp \
  -f my-frontend/Dockerfile \
  -t bisman-frontend:latest \
  .

# Run the container
docker run --rm -p 3000:3000 bisman-frontend:latest
```

### Build fullstack image (root Dockerfile)

```bash
export DOCKER_BUILDKIT=1

docker build \
  --progress=plain \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg NEXT_PUBLIC_MM_TEAM_SLUG=erp \
  -t bisman-fullstack:latest \
  .

# Run fullstack container
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  bisman-fullstack:latest
```

### Build with no cache (force clean rebuild)

```bash
docker build --no-cache \
  --progress=plain \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  -f my-frontend/Dockerfile \
  -t bisman-frontend:debug \
  .
```

### Capture build log for analysis

```bash
docker build \
  --progress=plain \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  -f my-frontend/Dockerfile \
  -t bisman-frontend:debug \
  . 2>&1 | tee build.log

# Search for errors
grep -n "Error:" build.log | head -20
grep -n "Failed" build.log | head -20
```

---

## Dockerfile Architecture

### my-frontend/Dockerfile (standalone frontend)
- **Stage 1 (deps)**: Installs ALL dependencies (dev + prod) with cache mount
- **Stage 2 (builder)**: Runs `prisma generate` + `npm run build:verbose` with full error visibility
- **Stage 3 (runtime)**: Minimal production image with only prod deps + `.next/standalone` output

### Root Dockerfile (fullstack)
- **Stage (deps)**: Backend dependencies + Prisma
- **Stage (build-frontend)**: Frontend build with same hardened pattern as standalone
- **Stage (runner)**: Combined runtime with backend + frontend

---

## Environment Variables

### Build-time variables (NEXT_PUBLIC_*)
These must be available during `next build`:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `/api` | Backend API base URL |
| `NEXT_PUBLIC_MM_TEAM_SLUG` | No | `erp` | Mattermost team slug |

Declare in Dockerfile:
```dockerfile
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```

Pass at build time:
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com ...
```

### Runtime variables
These are read by the Node server at runtime (not needed during build):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `production` | Runtime mode |

---

## Prisma Integration

### When Prisma is used in frontend:

1. **schema.prisma location**: `my-frontend/prisma/schema.prisma`
2. **Generate before build**: `npx prisma generate` must run before `next build`
3. **Dockerfile sequence**:
   ```dockerfile
   COPY prisma ./prisma
   RUN npm ci
   RUN npx prisma generate
   RUN npm run build
   ```

### When Prisma is NOT used in frontend:
- Remove `prisma` directory from frontend
- Remove `npx prisma generate` from Dockerfile
- Remove `@prisma/client` from `package.json`

---

## Troubleshooting

### 1. Build fails with no clear error message

**Symptoms**: Docker build exits with code 1, logs show compiled pages but no stack trace.

**Diagnosis**:
```bash
# Run local build with verbose output
cd my-frontend
npm run build:verbose 2>&1 | tee build.log
grep -n "Error" build.log
```

**Common causes**:
- Missing `export default` in a page component
- Conditional component definition (component can be `undefined`)
- Circular imports
- Missing environment variable evaluated at build time

**Fix**:
- Check the first page listed after the error
- Search for `export default` in that file
- Ensure component is never conditionally undefined

### 2. Error about missing environment variable

**Symptoms**: `ReferenceError: process is not defined` or `Cannot read property 'NEXT_PUBLIC_API_URL' of undefined`

**Diagnosis**:
```bash
# Check where env var is used
grep -R "process.env.NEXT_PUBLIC_API_URL" my-frontend/src
```

**Fix**:
- Add `ARG` + `ENV` declarations in Dockerfile (see Environment Variables section)
- Pass `--build-arg NEXT_PUBLIC_API_URL=...` at build time
- Ensure variable is accessed only in client components or API routes (not module top-level in server components)

### 3. Error about Prisma schema or generated client

**Symptoms**: `Cannot find module '@prisma/client'` or `Prisma schema not found`

**Diagnosis**:
```bash
# Check if schema exists
ls -l my-frontend/prisma/schema.prisma

# Check if @prisma/client is installed
grep "@prisma/client" my-frontend/package.json
```

**Fix Option A** (if Prisma IS used):
```dockerfile
# Ensure this sequence in Dockerfile
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
RUN npm run build
```

**Fix Option B** (if Prisma is NOT used):
```bash
# Remove Prisma references
rm -rf my-frontend/prisma
npm uninstall @prisma/client prisma
# Update Dockerfile to skip prisma generate
```

### 4. Build fails on specific page (e.g., "Element type is invalid")

**Symptoms**: Runtime error in browser after successful build: `Error: Element type is invalid: expected a string... but got: undefined`

**Diagnosis**:
```bash
# Find components without default export
node -e "
const fs=require('fs');
const path=require('path');
function scan(dir){
  for(const f of fs.readdirSync(dir)){
    const p=path.join(dir,f);
    if(fs.statSync(p).isDirectory()) scan(p);
    else if(/page\.tsx$/.test(f)){
      const c=fs.readFileSync(p,'utf8');
      if(!/export default/.test(c)){
        console.log('Missing default export:',p);
      }
    }
  }
}
scan('my-frontend/src/app');
"
```

**Fix**:
- Ensure every `page.tsx` has `export default function PageName() {...}`
- Check that imported components are exported correctly
- Verify no conditional component definitions (e.g., `let Comp; if(...) Comp = () => ...;`)

### 5. Docker build uses stale cache

**Symptoms**: Changes not reflected in build, old errors persist.

**Solution**:
```bash
# Nuclear option: remove all Docker build cache
docker builder prune -af

# Then rebuild with --no-cache
docker build --no-cache -t bisman-frontend:latest .
```

### 6. Out of memory during build

**Symptoms**: `FATAL ERROR: Reached heap limit` or process killed.

**Fix**:
```dockerfile
# Add to builder stage
ENV NODE_OPTIONS=--max_old_space_size=4096
```

Or increase Docker memory limit in Docker Desktop settings.

### 7. Lint or type-check fails but was ignored before

**Symptoms**: Build now fails on lint/type errors that were previously ignored.

**Why**: Updated `next.config.js` to NOT ignore errors (`ignoreDuringBuilds: false`).

**Fix**:
```bash
# Fix lint errors
npm run lint:fix

# Fix type errors
npm run type-check
# Then address reported TypeScript issues
```

---

## Verification Checklist

Before pushing to production:

- [ ] Local `npm run build:verbose` completes successfully
- [ ] Local `npm run lint` passes with 0 warnings
- [ ] Local `npm run type-check` passes
- [ ] Docker build completes without errors
- [ ] Docker container starts and serves homepage
- [ ] No console errors in browser
- [ ] All critical pages render correctly
- [ ] Environment variables are set in deployment platform

---

## Deployment Platform Configuration

### Railway
```bash
# Set in Railway dashboard > Variables
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_MM_TEAM_SLUG=erp
DATABASE_URL=postgresql://...
```

### Render
```bash
# Set in Render dashboard > Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

### Vercel
```bash
# Set in Vercel dashboard > Environment Variables
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

---

## Quick Reference

### Clean local build
```bash
cd my-frontend && rm -rf .next node_modules && npm ci && npm run build:verbose
```

### Clean Docker build
```bash
docker build --no-cache --progress=plain -f my-frontend/Dockerfile -t bisman-frontend:latest .
```

### Debug build failure
```bash
docker build --progress=plain -f my-frontend/Dockerfile -t test . 2>&1 | tee build.log && grep -n "Error" build.log
```

### Test production build locally
```bash
cd my-frontend && NODE_ENV=production node .next/standalone/server.js
```

---

## Support

If build still fails after following this guide:
1. Capture full build log: `npm run build:verbose 2>&1 | tee build.log`
2. Search for first error: `grep -n "Error:" build.log | head -5`
3. Share the error block and the file path mentioned
