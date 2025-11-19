#!/usr/bin/env node
/**
 * Idempotent setup for Enterprise Admin and Super Admin modules
 * - Upserts modules (enterprise-admin, super-admin)
 * - Grants baseline permissions to roles (SUPER_ADMIN, ENTERPRISE_ADMIN)
 * - Ensures ModuleAssignment exists for existing SuperAdmins
 * - NEVER deletes existing modules/pages/assignments
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MODULES = [
  { module_name: 'enterprise-admin', display_name: 'Enterprise Admin', route: '/enterprise-admin', icon: 'building', productType: 'ALL', is_active: true, sort_order: 90 },
  { module_name: 'super-admin', display_name: 'Super Admin', route: '/super-admin', icon: 'shield', productType: 'ALL', is_active: true, sort_order: 99 },
];

const ROLE_PERMS = [
  { role: 'SUPER_ADMIN', module_slug: 'super-admin', all: true },
  { role: 'SUPER_ADMIN', module_slug: 'enterprise-admin', all: true },
  { role: 'ENTERPRISE_ADMIN', module_slug: 'enterprise-admin', all: true },
];

async function upsertModules() {
  const results = [];
  for (const m of MODULES) {
    const existing = await prisma.module.findUnique({ where: { module_name: m.module_name } });
    if (!existing) {
      const created = await prisma.module.create({ data: m });
      results.push({ action: 'insert', m: created });
    } else {
      const updated = await prisma.module.update({ where: { id: existing.id }, data: {
        display_name: m.display_name,
        route: m.route,
        icon: m.icon,
        productType: m.productType,
        is_active: m.is_active,
        sort_order: m.sort_order,
      }});
      results.push({ action: 'update', m: updated });
    }
  }
  return results;
}

async function ensurePermissions() {
  const mods = await prisma.module.findMany({ where: { module_name: { in: MODULES.map(x=>x.module_name) } } });
  const modBySlug = new Map(mods.map(m => [m.module_name, m]));
  let created = 0, updated = 0;
  for (const rp of ROLE_PERMS) {
    const mod = modBySlug.get(rp.module_slug);
    if (!mod) continue;
    const existing = await prisma.permission.findUnique({ where: { role_module_id: { role: rp.role, module_id: mod.id } } });
    if (!existing) {
      await prisma.permission.create({ data: {
        role: rp.role,
        module_id: mod.id,
        can_view: true,
        can_create: rp.all,
        can_edit: rp.all,
        can_delete: rp.all,
      }});
      created++;
    } else {
      await prisma.permission.update({ where: { id: existing.id }, data: {
        can_view: true,
        can_create: existing.can_create || rp.all,
        can_edit: existing.can_edit || rp.all,
        can_delete: existing.can_delete || rp.all,
      }});
      updated++;
    }
  }
  return { created, updated };
}

async function ensureAssignments() {
  // For each SuperAdmin, ensure assignment of both modules
  const superAdmins = await prisma.superAdmin.findMany({ select: { id: true } });
  const mods = await prisma.module.findMany({ where: { module_name: { in: MODULES.map(x=>x.module_name) } } });
  const modBySlug = new Map(mods.map(m => [m.module_name, m]));
  let created = 0;
  for (const sa of superAdmins) {
    for (const slug of MODULES.map(x=>x.module_name)) {
      const mod = modBySlug.get(slug);
      if (!mod) continue;
      const exists = await prisma.moduleAssignment.findUnique({ where: { super_admin_id_module_id: { super_admin_id: sa.id, module_id: mod.id } } });
      if (!exists) {
        await prisma.moduleAssignment.create({ data: { super_admin_id: sa.id, module_id: mod.id } });
        created++;
      }
    }
  }
  return { created };
}

async function report() {
  const modules = await prisma.module.findMany({ where: { module_name: { in: MODULES.map(m=>m.module_name) } }, orderBy: { module_name: 'asc' } });
  const perms = await prisma.permission.findMany({ where: { module_id: { in: modules.map(m=>m.id) } } });
  const assignments = await prisma.moduleAssignment.count({ where: { module_id: { in: modules.map(m=>m.id) } } });
  return { modules, perms: perms.length, assignments };
}

async function main() {
  const modRes = await upsertModules();
  const permRes = await ensurePermissions();
  const assignRes = await ensureAssignments();
  const summary = await report();

  console.log('Modules upserted:', modRes.map(r=>`${r.action}:${r.m.module_name}`).join(', '));
  console.log('Permissions - created:', permRes.created, 'updated:', permRes.updated);
  console.log('Assignments created:', assignRes.created);
  console.log('Summary:', summary);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
