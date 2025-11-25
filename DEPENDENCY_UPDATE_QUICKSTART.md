# 🚀 Quick Start - Update Dependencies

**For the impatient developer who wants to update NOW** ⚡

---

## Option 1: Automated Script (Recommended) ✅

```bash
cd my-frontend
bash scripts/update-deps.sh
```

**What it does**:
- ✅ Backs up your package.json automatically
- ✅ Updates 18+ safe packages
- ✅ Keeps Next.js 15.1.3, TypeScript 5.5.4, Prisma 5.22.0 pinned
- ✅ Runs type-check, lint, and build
- ✅ Shows rollback instructions if anything fails

**Time**: 5-10 minutes

---

## Option 2: Manual Commands ⚙️

```bash
cd my-frontend

# Backup first
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Clean everything
rm -rf node_modules package-lock.json .next
npm cache clean --force

# Update safe packages
npm install \
  @mui/icons-material@latest \
  @mui/material@latest \
  @mui/x-data-grid-pro@latest \
  axios@latest \
  next-auth@latest \
  react-hook-form@latest \
  zod@latest \
  vitest@latest \
  --save

# Keep critical packages pinned
npm install next@15.1.3 typescript@5.5.4 prisma@5.22.0 @prisma/client@5.22.0 --save-exact

# Regenerate Prisma
npx prisma generate

# Test
npm run type-check
npm run build
npm run dev
```

---

## Option 3: Check First (Dry Run) 👀

```bash
cd my-frontend

# See what's outdated
npm outdated

# Dry run the script
bash scripts/update-deps.sh --dry-run
```

---

## ❌ DO NOT Update These (Yet)

```bash
# ❌ Next.js 16 - too new, just fixed v15
next@16.x

# ❌ React 19 - ecosystem not ready
react@19.x

# ❌ Prisma 7 - major breaking changes
prisma@7.x

# ❌ Tailwind 4 - complete rewrite
tailwindcss@4.x

# ❌ ESLint 9 - config breaking changes
eslint@9.x

# ❌ TypeScript 5.9 - keep pinned for stability
typescript@5.9.x
```

---

## 🔄 Rollback If Things Break

```bash
cd my-frontend

# Restore backup
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json

# Reinstall
rm -rf node_modules .next
npm install
npx prisma generate
npm run build
```

---

## ✅ After Update - Test These

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Dev server
npm run dev

# 5. Manual tests
- Login/Logout
- Database queries
- Forms submission
- Charts rendering
- Data grid interaction
```

---

## 📊 What Gets Updated

| Package | Before | After | Type |
|---------|--------|-------|------|
| @mui/material | 7.3.2 | 7.3.5 | Patch |
| @mui/x-data-grid-pro | 8.12.1 | 8.19.0 | Minor |
| axios | 1.12.2 | 1.13.2 | Minor |
| next-auth | 4.24.11 | 4.24.13 | Patch |
| react-hook-form | 7.63.0 | 7.66.1 | Patch |
| zod | 4.1.11 | 4.1.13 | Patch |
| vitest | 4.0.3 | 4.0.13 | Patch |
| + 11 more packages | ... | ... | Safe |

**Total**: ~18 safe updates

---

## 🎯 Expected Results

✅ **Build time**: Same or faster  
✅ **Bundle size**: ~0-2% smaller  
✅ **Type errors**: None  
✅ **Breaking changes**: None  
✅ **Security fixes**: Latest patches  

---

## 🚨 Red Flags to Watch For

If you see these after update, rollback immediately:

- ❌ TypeScript errors in API routes
- ❌ Prisma client not found
- ❌ Next.js build fails with "Module not found"
- ❌ React hydration errors
- ❌ Authentication stops working
- ❌ Forms don't validate

---

## 📞 Need Help?

1. **Check logs**: Read full error message
2. **Run audit**: `npm audit`
3. **Check outdated**: `npm outdated`
4. **Rollback**: Use backup files
5. **Read plan**: See `DEPENDENCY_UPDATE_PLAN.md` for details

---

## ⏱️ Time Investment

| Task | Time |
|------|------|
| Automated script | 5-10 min |
| Manual update | 10-15 min |
| Testing | 15-20 min |
| **Total** | **30-45 min** |

---

## ✅ Success Checklist

- [ ] Ran update script or manual commands
- [ ] `npm run type-check` passed
- [ ] `npm run build` succeeded
- [ ] `npm run dev` starts without errors
- [ ] Tested login/logout
- [ ] Tested database queries
- [ ] Tested forms
- [ ] Checked console for errors
- [ ] Tested on mobile
- [ ] Committed changes
- [ ] Deployed to staging

---

**Ready?** Run this now:

```bash
cd my-frontend && bash scripts/update-deps.sh
```

🎉 **You're done!**
