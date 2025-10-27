# ERP Admin Module (Scaffold)

This scaffold adds a multi-tenant admin layer with Prisma (Postgres), Next.js App Router, Tailwind, a theme provider, RBAC helpers, API routes, and seeds.

## Setup

1. Copy .env.example to .env and set:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/erp
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=supersecret
```

2. Install & generate

```
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

3. Login

- SUPER_ADMIN: super@erp.local / Password@123
- ENTERPRISE_ADMIN: enterprise@erp.local / Password@123

## Scripts
- prisma:generate, prisma:migrate, prisma:seed
- dev, build, start, test, e2e

## Structure
- prisma/schema.prisma, prisma/seed.ts
- src/lib/db.ts, src/lib/auth.ts, src/lib/permissions.ts
- src/components/ThemeProvider.tsx, src/components/AdminSidebar.tsx
- app/(admin)/layout.tsx and pages under app/(admin)
- app/api/admin/* endpoints

## Notes & TODOs
- TODO: Add billing webhooks, API key management UI, audit log UI, shadcn/ui integration, server validations, and stricter middleware authorization.
- Security: Add rate limiting, helmet headers, CSRF where needed, and hashed API keys.
