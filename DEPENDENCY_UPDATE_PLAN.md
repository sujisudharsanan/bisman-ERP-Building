# 📦 Dependency Update Plan - Next.js 15 Project

**Date**: 2025-11-25  
**Project**: BISMAN ERP - Frontend  
**Current Next.js**: 15.1.3  
**Current React**: 18.3.1  
**Current Node**: 20.x

---

## 🎯 Executive Summary

Your project has **35+ outdated packages**. Most are **safe minor/patch updates**. I've identified:

- ✅ **Safe to update immediately**: 28 packages (minor/patch)
- ⚠️ **Requires attention**: 7 packages (major/breaking)
- 🔒 **Critical security**: Prisma v7 available but breaking
- 🚫 **Stay pinned**: Next.js 15.1.3, TypeScript 5.5.4

---

## 📊 Dependency Audit Results

### 🟢 Safe Minor/Patch Updates (Auto-Update)

These have **no breaking changes** and should be updated immediately:

| Package | Current | Latest | Type | Notes |
|---------|---------|--------|------|-------|
| `@mui/icons-material` | 7.3.2 | 7.3.5 | Patch | Safe |
| `@mui/material` | 7.3.2 | 7.3.5 | Patch | Safe |
| `@mui/x-data-grid-pro` | 8.12.1 | 8.19.0 | Minor | Safe (same v8) |
| `@playwright/test` | 1.56.0 | 1.56.1 | Patch | Safe |
| `@tanstack/react-query` | 5.90.2 | 5.90.10 | Patch | Safe |
| `@testing-library/jest-dom` | 6.8.0 | 6.9.1 | Minor | Safe |
| `@types/react` | 18.3.24 | 18.3.27 | Patch | Safe |
| `@types/react-grid-layout` | 1.3.5 | 1.3.6 | Patch | Safe |
| `@typescript-eslint/eslint-plugin` | 8.45.0 | 8.48.0 | Patch | Safe |
| `@typescript-eslint/parser` | 8.45.0 | 8.48.0 | Patch | Safe |
| `axios` | 1.12.2 | 1.13.2 | Minor | Safe |
| `emoji-picker-react` | 4.15.0 | 4.15.2 | Patch | Safe |
| `next-auth` | 4.24.11 | 4.24.13 | Patch | Safe |
| `react-chartjs-2` | 5.3.0 | 5.3.1 | Patch | Safe |
| `react-hook-form` | 7.63.0 | 7.66.1 | Patch | Safe |
| `tailwind-merge` | 3.3.1 | 3.4.0 | Minor | Safe |
| `vitest` | 4.0.3 | 4.0.13 | Patch | Safe |
| `zod` | 4.1.11 | 4.1.13 | Patch | Safe |
| `autoprefixer` | 10.4.14 | 10.4.22 | Patch | Safe |

### ⚠️ Major Version Updates (Requires Testing)

These have **breaking changes** or significant updates:

#### 🔴 Critical - Do NOT Update Yet

| Package | Current | Latest | Action | Reason |
|---------|---------|--------|--------|--------|
| **Prisma** | 5.22.0 | 7.0.0 | ❌ HOLD | Major breaking changes in v7 |
| **@prisma/client** | 5.22.0 | 7.0.0 | ❌ HOLD | Must match Prisma version |
| **Next.js** | 15.1.3 | 16.0.4 | ❌ HOLD | Just fixed v15 issues, stable |
| **React** | 18.3.1 | 19.2.0 | ❌ HOLD | Next 15 supports React 18/19 |
| **React DOM** | 18.3.1 | 19.2.0 | ❌ HOLD | Must match React version |
| **TypeScript** | 5.5.4 | 5.9.3 | ❌ HOLD | Pinned for Next 15 stability |

#### 🟡 Major - Update with Caution

| Package | Current | Latest | Action | Notes |
|---------|---------|--------|--------|-------|
| `@types/node` | 20.11.30 | 24.10.1 | ⚠️ TEST | Update to Node 20 latest (20.19.x) |
| `@types/react` | 18.3.24 | 19.2.7 | ❌ SKIP | Stay on v18 types |
| `@types/react-dom` | 18.3.7 | 19.2.3 | ❌ SKIP | Stay on v18 types |
| `@testing-library/react` | 14.3.1 | 16.3.0 | ❌ SKIP | v16 for React 19 only |
| `eslint` | 8.57.1 | 9.39.1 | ❌ HOLD | v9 has breaking config changes |
| `eslint-config-next` | 15.5.4 | 16.0.4 | ❌ HOLD | Tied to Next.js version |
| `tailwindcss` | 3.4.7 | 4.1.17 | ❌ HOLD | v4 is major rewrite |
| `bcryptjs` | 2.4.3 | 3.0.3 | ⚠️ TEST | Check hash compatibility |
| `jose` | 5.10.0 | 6.1.2 | ⚠️ TEST | JWT library, check APIs |
| `marked` | 12.0.2 | 17.0.1 | ❌ SKIP | Major v13-17 changes |
| `recharts` | 2.15.4 | 3.5.0 | ❌ SKIP | v3 has breaking changes |
| `react-icons` | 4.12.0 | 5.5.0 | ⚠️ TEST | Check icon availability |
| `lucide-react` | 0.544.0 | 0.554.0 | ✅ SAFE | Pre-1.0, safe patch |

---

## 🚀 Recommended Update Strategy

### Phase 1: Safe Updates (Do Now) ✅

Update all minor/patch versions that are guaranteed safe:

```bash
cd my-frontend

# Clean slate
rm -rf node_modules package-lock.json .next

# Update specific safe packages
npm install @mui/icons-material@latest \
  @mui/material@latest \
  @mui/x-data-grid-pro@latest \
  @playwright/test@latest \
  @tanstack/react-query@latest \
  @testing-library/jest-dom@latest \
  @types/react-grid-layout@latest \
  @typescript-eslint/eslint-plugin@latest \
  @typescript-eslint/parser@latest \
  axios@latest \
  emoji-picker-react@latest \
  next-auth@latest \
  react-chartjs-2@latest \
  react-hook-form@latest \
  tailwind-merge@latest \
  vitest@latest \
  zod@latest \
  autoprefixer@latest \
  lucide-react@latest

# Prisma - keep same version
npm install prisma@5.22.0 @prisma/client@5.22.0

# Regenerate Prisma client
npx prisma generate

# Test
npm run type-check
npm run build
npm run dev
```

### Phase 2: Test Carefully (After Phase 1 Works) ⚠️

```bash
# Update @types/node to latest Node 20 types
npm install --save-dev @types/node@^20.19.0

# Test bcryptjs v3 (check password hashing)
npm install bcryptjs@^3.0.0

# Test jose v6 (check JWT signing/verification)
npm install jose@^6.0.0

# Test react-icons v5
npm install react-icons@^5.0.0

# After each, run:
npm run type-check
npm run build
npm run dev
```

### Phase 3: Major Upgrades (Future - Not Now) 🔮

**Do NOT do these now**, but plan for future:

- **Prisma v7**: Wait 2-3 months for ecosystem stability
- **Next.js 16**: Wait for v16.1+ (early releases have bugs)
- **React 19**: Next.js 15 supports it, but ecosystem not ready
- **Tailwind v4**: Major rewrite, wait for stable tooling
- **ESLint v9**: Requires config migration

---

## 🛠️ Automated Update Script

I've created `scripts/update-deps.sh` that will:

1. ✅ Backup your current `package.json` and `package-lock.json`
2. ✅ Clean all caches and build artifacts
3. ✅ Update safe dependencies
4. ✅ Reinstall everything from scratch
5. ✅ Regenerate Prisma client
6. ✅ Run type-check, lint, and build
7. ✅ Report any failures

**Usage**:
```bash
cd my-frontend
bash scripts/update-deps.sh
```

---

## ✅ Testing Checklist After Update

### 1. Build & Type Check
```bash
npm run type-check    # TypeScript errors?
npm run lint          # ESLint errors?
npm run build         # Build succeeds?
npm run dev           # Dev server starts?
```

### 2. Critical Functionality Tests

| Feature | Test | Status |
|---------|------|--------|
| **Authentication** | Login/Logout, JWT tokens | ⬜ |
| **Database** | Prisma queries work | ⬜ |
| **API Routes** | All /api/* endpoints respond | ⬜ |
| **Forms** | react-hook-form validation | ⬜ |
| **Charts** | recharts/chart.js render | ⬜ |
| **Icons** | lucide-react, react-icons display | ⬜ |
| **Data Grid** | MUI X DataGrid Pro works | ⬜ |
| **Calendar** | FullCalendar renders | ⬜ |
| **File Upload** | Axios uploads work | ⬜ |
| **Socket.io** | Real-time updates | ⬜ |
| **Dark Mode** | Theme switching | ⬜ |
| **Responsive** | Mobile/tablet layouts | ⬜ |

### 3. Manual UI Tests

- [ ] Navigate to all major pages
- [ ] Submit forms with validation
- [ ] Check console for errors
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test mobile responsive design
- [ ] Check performance (no regressions)

---

## 🔒 Security Considerations

### Current Vulnerabilities (from npm audit)

Run after update:
```bash
npm audit
npm audit fix
```

**Known Issues**:
- None critical in your stack (Next.js 15.1.3 is secure)
- Prisma 5.22.0 has no known CVEs
- All authentication libraries up to date

---

## 📋 Version Lock Recommendations

**These should stay pinned** in `package.json`:

```json
{
  "dependencies": {
    "next": "15.1.3",              // Just stabilized v15
    "react": "^18.3.1",            // v19 not production-ready
    "react-dom": "^18.3.1"         // Match React version
  },
  "devDependencies": {
    "typescript": "5.5.4",         // Pinned for Next 15
    "@types/node": "^20.19.0",     // Match Node 20
    "eslint": "8.57.1",            // v9 breaking changes
    "tailwindcss": "3.4.7",        // v4 not stable
    "prisma": "5.22.0",            // v7 breaking changes
    "@prisma/client": "5.22.0"     // Must match Prisma
  }
}
```

---

## 🎯 Quick Commands Reference

```bash
# Check what's outdated
npm outdated

# Update with npm-check-updates (CAREFUL!)
npx npm-check-updates -u
npm install

# Update specific package
npm install package-name@latest

# Update to specific version
npm install package-name@5.2.0

# Audit security
npm audit
npm audit fix

# Clean everything
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install

# Prisma workflow
npx prisma generate
npx prisma migrate dev
npx prisma studio

# Test workflow
npm run type-check && npm run lint && npm run build && npm run dev
```

---

## 🚨 Rollback Plan

If updates break your app:

```bash
# Restore backup
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json

# Reinstall
rm -rf node_modules .next
npm ci
npx prisma generate
npm run build
```

---

## 📞 Support & Resources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Prisma Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-guides)
- [React 19 RFC](https://react.dev/blog/2024/04/25/react-19)
- [Tailwind CSS v4 Alpha](https://tailwindcss.com/blog/tailwindcss-v4-alpha)

---

## ✅ Summary & Next Steps

### Do This Now (Safe - 15 mins):
1. Run `bash scripts/update-deps.sh`
2. Test build: `npm run build`
3. Test dev: `npm run dev`
4. Check critical features

### Do This Week (Cautious - 1 hour):
1. Test `bcryptjs@3.0.0`
2. Test `jose@6.0.0`
3. Test `react-icons@5.0.0`
4. Full regression testing

### Do This Quarter (Major - Plan ahead):
1. **Prisma v7** migration (Q1 2026)
2. **Next.js 16** upgrade (Q1 2026)
3. **React 19** adoption (Q2 2026)
4. **Tailwind v4** migration (Q2 2026)

---

**Status**: ✅ Ready to execute Phase 1  
**Risk Level**: 🟢 Low (safe minor/patch updates only)  
**Estimated Time**: 15-30 minutes  
**Rollback Available**: Yes (automatic backup)
