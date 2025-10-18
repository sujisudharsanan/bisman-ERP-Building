#!/usr/bin/env node
// Seed RBAC using Prisma (avoids TLS issues with pg Pool)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ACTIONS = [
  { name: 'VIEW', description: 'Read access' },
  { name: 'CREATE', description: 'Create resource' },
  { name: 'EDIT', description: 'Edit resource' },
  { name: 'DELETE', description: 'Delete resource' },
]

const ROLES = [
  { name: 'Super Admin', description: 'Full system access', level: 10 },
  { name: 'Admin', description: 'Administrative access', level: 9 },
  { name: 'Manager', description: 'Managerial access', level: 6 },
  { name: 'Staff', description: 'Standard user access', level: 1 },
]

const ROUTES = [
  { path: '/api/users', name: 'Users list', description: 'List users', method: 'GET', module: 'User Management', is_protected: true },
  { path: '/api/privileges/roles', name: 'Roles', description: 'List roles', method: 'GET', module: 'Privileges', is_protected: true },
  { path: '/api/health/database', name: 'DB Health', description: 'Database health', method: 'GET', module: 'System', is_protected: false },
]

async function main() {
  console.log('🌱 Seeding RBAC (Prisma)...')

  // Upsert actions
  for (const a of ACTIONS) {
    await prisma.rbac_actions.upsert({
      where: { name: a.name },
      update: { description: a.description },
      create: { name: a.name, description: a.description },
    })
  }

  // Upsert roles
  for (const r of ROLES) {
    await prisma.rbac_roles.upsert({
      where: { name: r.name },
      update: { description: r.description, level: r.level },
      create: { name: r.name, description: r.description, level: r.level },
    })
  }

  // Upsert routes
  for (const rt of ROUTES) {
    await prisma.rbac_routes.upsert({
      where: { path_method: { path: rt.path, method: rt.method } },
      update: { name: rt.name, description: rt.description, module: rt.module, is_protected: rt.is_protected },
      create: rt,
    })
  }

  // Grant ALL actions on all routes to Super Admin
  const superRole = await prisma.rbac_roles.findUnique({ where: { name: 'Super Admin' } })
  if (superRole) {
    const actions = await prisma.rbac_actions.findMany()
    const routes = await prisma.rbac_routes.findMany()
    for (const rt of routes) {
      for (const a of actions) {
        await prisma.rbac_permissions.upsert({
          where: {
            role_id_action_id_route_id: { role_id: superRole.id, action_id: a.id, route_id: rt.id },
          },
          update: { granted: true },
          create: { role_id: superRole.id, action_id: a.id, route_id: rt.id, granted: true },
        })
      }
    }
  }

  // Map seeded Super Admin user (if any) to Super Admin role
  const superUser = await prisma.user.findUnique({ where: { email: 'super@bisman.local' } })
  if (superUser && superRole) {
    await prisma.rbac_user_roles.upsert({
      where: { user_id_role_id: { user_id: superUser.id, role_id: superRole.id } },
      update: {},
      create: { user_id: superUser.id, role_id: superRole.id },
    })
  }

  const [rolesCount, actionsCount, routesCount, permsCount, mapsCount] = await Promise.all([
    prisma.rbac_roles.count(),
    prisma.rbac_actions.count(),
    prisma.rbac_routes.count(),
    prisma.rbac_permissions.count(),
    prisma.rbac_user_roles.count(),
  ])

  console.log('✅ RBAC seeded:', { rolesCount, actionsCount, routesCount, permsCount, mapsCount })
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('RBAC seed (Prisma) failed:', e.message); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
