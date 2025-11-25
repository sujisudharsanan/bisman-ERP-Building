# 🔗 Version Compatibility Matrix

**Next.js 15.1.3 Project - Safe Version Ranges**

---

## 🎯 Core Stack Compatibility

| Package | Current | Safe Range | Latest | Upgrade? |
|---------|---------|------------|--------|----------|
| **Next.js** | 15.1.3 | 15.1.x | 16.0.4 | ❌ Stay on 15.1.x |
| **React** | 18.3.1 | 18.3.x | 19.2.0 | ❌ Stay on 18.x |
| **React DOM** | 18.3.1 | 18.3.x | 19.2.0 | ❌ Must match React |
| **TypeScript** | 5.5.4 | 5.5.x | 5.9.3 | ❌ Pinned for Next 15 |
| **Node.js** | 20.x | 20.x - 22.x | 23.x | ✅ Stay on 20 LTS |

### Why These Versions?

**Next.js 15.1.3**:
- ✅ Just fixed async APIs (cookies, headers, params)
- ✅ Stable and production-ready
- ✅ Supports React 18 & 19
- ❌ v16 too new (early November 2025 release)

**React 18.3.1**:
- ✅ Mature and battle-tested
- ✅ Full Next.js 15 support
- ✅ Ecosystem fully compatible
- ❌ React 19 not production-ready (RC phase)

**TypeScript 5.5.4**:
- ✅ Pinned for Next.js 15 compatibility
- ✅ All @types packages compatible
- ❌ 5.9.x has breaking changes in type inference

---

## 📦 UI Libraries Compatibility

### Material-UI (MUI)

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| @mui/material | 7.3.2 | 7.x | 7.3.5 | ✅ Update to 7.3.5 |
| @mui/icons-material | 7.3.2 | 7.x | 7.3.5 | ✅ Update to 7.3.5 |
| @mui/x-data-grid-pro | 8.12.1 | 8.x | 8.19.0 | ✅ Update to 8.19.0 |

**Breaking Change Alert**:
- MUI v7 requires React 18.3+
- MUI X v8 requires MUI v7
- All versions compatible with Next.js 15

### Styling & Animation

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| tailwindcss | 3.4.7 | 3.4.x | 4.1.17 | ❌ v4 major rewrite |
| autoprefixer | 10.4.14 | 10.x | 10.4.22 | ✅ Update to 10.4.22 |
| postcss | 8.5.6 | 8.x | 8.5.6 | ✅ Already latest 8.x |
| framer-motion | 12.23.24 | 12.x | 12.23.24 | ✅ Already latest |
| clsx | 2.1.1 | 2.x | 2.1.1 | ✅ Already latest |
| tailwind-merge | 3.3.1 | 3.x | 3.4.0 | ✅ Update to 3.4.0 |

---

## 🔐 Authentication & Security

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| next-auth | 4.24.11 | 4.24.x | 4.24.13 | ✅ Update to 4.24.13 |
| jose | 5.10.0 | 5.x or 6.x | 6.1.2 | ⚠️ Test v6 carefully |
| bcryptjs | 2.4.3 | 2.x or 3.x | 3.0.3 | ⚠️ Test v3 hashes |

**Compatibility Notes**:
- next-auth v5 requires Next.js 14+, compatible with 15
- jose v6 has JWT API changes, test thoroughly
- bcryptjs v3 maintains backward compatibility for hashes

---

## 🗄️ Database & ORM

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| prisma | 5.22.0 | 5.22.x | 7.0.0 | ❌ v7 has breaking changes |
| @prisma/client | 5.22.0 | 5.22.x | 7.0.0 | ❌ Must match Prisma |

**Critical**: Always keep `prisma` and `@prisma/client` on the **same version**.

**Prisma v7 Breaking Changes** (Do NOT upgrade yet):
- New query engine
- Changed migration format
- Updated schema syntax
- Requires extensive testing

---

## 📝 Forms & Validation

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| react-hook-form | 7.63.0 | 7.x | 7.66.1 | ✅ Update to 7.66.1 |
| zod | 4.1.11 | 4.x | 4.1.13 | ✅ Update to 4.1.13 |
| @hookform/resolvers | 5.2.2 | 5.x | 5.2.2 | ✅ Already latest |

**All compatible** with React 18 and Next.js 15.

---

## 📊 Data Visualization

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| chart.js | 4.5.1 | 4.x | 4.5.1 | ✅ Already latest |
| react-chartjs-2 | 5.3.0 | 5.x | 5.3.1 | ✅ Update to 5.3.1 |
| recharts | 2.15.4 | 2.x | 3.5.0 | ❌ v3 has breaking changes |

**Recharts v3 Breaking Changes** (Do NOT upgrade):
- New component APIs
- Changed prop names
- Different responsive behavior
- Wait for ecosystem adoption

---

## 🔌 Data Fetching & State

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| @tanstack/react-query | 5.90.2 | 5.x | 5.90.10 | ✅ Update to 5.90.10 |
| axios | 1.12.2 | 1.x | 1.13.2 | ✅ Update to 1.13.2 |
| zustand | 5.0.8 | 5.x | 5.0.8 | ✅ Already latest |
| socket.io-client | 4.8.1 | 4.x | 4.8.1 | ✅ Already latest |

**All compatible** with React 18 Server Components.

---

## 🎨 Icons & UI Components

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| lucide-react | 0.544.0 | 0.x | 0.554.0 | ✅ Update to 0.554.0 |
| react-icons | 4.12.0 | 4.x or 5.x | 5.5.0 | ⚠️ Test v5 icon names |
| emoji-picker-react | 4.15.0 | 4.x | 4.15.2 | ✅ Update to 4.15.2 |

**React Icons v5** may have changed icon names or exports.

---

## 🧪 Testing & Development

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| vitest | 4.0.3 | 4.x | 4.0.13 | ✅ Update to 4.0.13 |
| @playwright/test | 1.56.0 | 1.x | 1.56.1 | ✅ Update to 1.56.1 |
| @testing-library/react | 14.3.1 | 14.x | 16.3.0 | ❌ v16 for React 19 only |
| @testing-library/jest-dom | 6.8.0 | 6.x | 6.9.1 | ✅ Update to 6.9.1 |
| jsdom | 27.0.0 | 27.x | 27.0.0 | ✅ Already latest |

---

## 🔧 Linting & Formatting

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| eslint | 8.57.1 | 8.57.x | 9.39.1 | ❌ v9 has config breaking changes |
| eslint-config-next | 15.5.4 | 15.x | 16.0.4 | ❌ Tied to Next.js version |
| @typescript-eslint/parser | 8.45.0 | 8.x | 8.48.0 | ✅ Update to 8.48.0 |
| @typescript-eslint/eslint-plugin | 8.45.0 | 8.x | 8.48.0 | ✅ Update to 8.48.0 |
| prettier | 3.4.2 | 3.x | 3.4.2 | ✅ Already latest |

**ESLint v9 Breaking Changes** (Do NOT upgrade):
- New flat config format (eslint.config.js)
- Deprecated .eslintrc.json
- Changed plugin loading
- Wait for ecosystem adoption

---

## 📅 Calendar & Date

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| @fullcalendar/react | 6.1.19 | 6.x | 6.1.19 | ✅ Already latest |
| @fullcalendar/daygrid | 6.1.19 | 6.x | 6.1.19 | ✅ Already latest |
| @fullcalendar/timegrid | 6.1.19 | 6.x | 6.1.19 | ✅ Already latest |
| @fullcalendar/interaction | 6.1.19 | 6.x | 6.1.19 | ✅ Already latest |
| dayjs | 1.11.19 | 1.x | 1.11.19 | ✅ Already latest |
| rrule | 2.8.1 | 2.x | 2.8.1 | ✅ Already latest |

---

## 🎨 Type Definitions

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| @types/node | 20.11.30 | ^20.19.0 | 24.10.1 | ⚠️ Update to 20.19.x (Node 20 LTS) |
| @types/react | 18.3.24 | 18.3.x | 19.2.7 | ❌ Stay on v18 types |
| @types/react-dom | 18.3.7 | 18.3.x | 19.2.3 | ❌ Stay on v18 types |
| @types/react-grid-layout | 1.3.5 | 1.x | 1.3.6 | ✅ Update to 1.3.6 |

---

## 🚀 Build & Deployment

| Package | Current | Safe | Latest | Notes |
|---------|---------|------|--------|-------|
| ts-node | 10.9.2 | 10.x | 10.9.2 | ✅ Already latest |
| concurrently | 9.2.1 | 9.x | 9.2.1 | ✅ Already latest |
| husky | 9.1.7 | 9.x | 9.1.7 | ✅ Already latest |
| lint-staged | 15.5.2 | 15.x | 16.2.7 | ⚠️ Test v16 config changes |

---

## ✅ Recommended Version Lock

**Copy this to your `package.json`** to prevent accidental major upgrades:

```json
{
  "dependencies": {
    "next": "15.1.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@prisma/client": "5.22.0"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "^20.19.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint": "8.57.1",
    "eslint-config-next": "15.5.4",
    "tailwindcss": "3.4.7",
    "prisma": "5.22.0"
  },
  "engines": {
    "node": ">=20.0.0 <23.0.0",
    "npm": ">=10.0.0"
  }
}
```

---

## 🔄 Update Schedule

| Frequency | Type | Examples |
|-----------|------|----------|
| **Weekly** | Patch updates | Security patches, bug fixes |
| **Monthly** | Minor updates | New features, safe upgrades |
| **Quarterly** | Review majors | Evaluate breaking changes |
| **Yearly** | Major stack | Next.js, React, TypeScript major versions |

---

## 🚨 Version Conflicts to Watch For

### ❌ Bad Combinations

```json
// Don't do this:
{
  "next": "16.0.0",          // ❌ Too new
  "react": "18.3.1",         // ❌ Next 16 prefers React 19
  "eslint-config-next": "15.5.4"  // ❌ Mismatched versions
}
```

```json
// Or this:
{
  "prisma": "5.22.0",        // ❌ Mismatch
  "@prisma/client": "7.0.0"  // ❌ Must be same version
}
```

### ✅ Good Combinations

```json
{
  "next": "15.1.3",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "eslint-config-next": "15.5.4",
  "prisma": "5.22.0",
  "@prisma/client": "5.22.0"
}
```

---

## 📚 Resources

- [Next.js Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Prisma Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-guides)
- [Can I Use React?](https://react.dev/)
- [TypeScript Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)

---

**Last Updated**: 2025-11-25  
**Next Review**: 2025-12-25 (monthly)
