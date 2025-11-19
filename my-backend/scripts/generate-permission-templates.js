#!/usr/bin/env node
/**
 * Generates basic action templates per HTTP method and ensures rbac_actions entries.
 * Then creates rbac_permissions placeholders for each route-method pair (if absent) linking to SUPER_ADMIN role only (as baseline).
 * Non-destructive.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const METHOD_ACTION_MAP = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete'
};

async function getRoleId(name) {
  const role = await prisma.rbac_roles.findFirst({ where: { name } });
  return role ? role.id : null;
}

async function ensureAction(name, display) {
  const existing = await prisma.rbac_actions.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.rbac_actions.create({ data: { name, display_name: display || name, description: `Auto action ${name}` } });
  return created.id;
}

async function main() {
  // Verify RBAC tables
  try { await prisma.rbac_routes.count(); } catch { console.log('RBAC tables missing; aborting'); return; }
  const superAdminRoleId = await getRoleId('SUPER_ADMIN');
  if (!superAdminRoleId) { console.log('SUPER_ADMIN role missing; aborting.'); return; }
  const routes = await prisma.rbac_routes.findMany({ where: { is_active: true } });
  let permCreated = 0;
  for (const rt of routes) {
    const actionBase = METHOD_ACTION_MAP[rt.method] || 'execute';
    const actionName = `${actionBase}:${rt.method}`.toUpperCase();
    const actionId = await ensureAction(actionName, `${actionBase.toUpperCase()} ${rt.method}`);
    // Unique triple (role_id, action_id, route_id)
    try {
      await prisma.rbac_permissions.create({ data: {
        role_id: superAdminRoleId,
        action_id: actionId,
        route_id: rt.id,
        granted: true,
        name: `${actionBase}_${rt.path}_${rt.method}`.replace(/[^A-Za-z0-9_]/g,'_').slice(0,180),
        display_name: `${rt.method} ${rt.path}`,
        is_active: true,
      }});
      permCreated++;
    } catch (e) {
      if (!/unique/i.test(e.message)) console.warn('perm warn:', e.message);
    }
  }
  console.log(`Permission template generation complete. permissions created=${permCreated}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
