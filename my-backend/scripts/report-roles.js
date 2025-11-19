#!/usr/bin/env node
/**
 * Role Report Script
 * Aggregates distinct roles from users and permissions tables.
 * Outputs counts of users per role and modules with permissions per role.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userRoles = await prisma.user.findMany({ select: { role: true }, distinct: ['role'] });
  const roles = userRoles.map(r => r.role).filter(Boolean);
  // Include Enterprise & Super Admin explicit roles if not present
  if (!roles.includes('ENTERPRISE_ADMIN')) roles.push('ENTERPRISE_ADMIN');
  if (!roles.includes('SUPER_ADMIN')) roles.push('SUPER_ADMIN');

  const rows = [];
  for (const role of roles) {
    const userCount = await prisma.user.count({ where: { role } });
    const permModules = await prisma.permission.findMany({
      where: { role },
      select: { module_id: true, can_view: true, can_create: true, can_edit: true, can_delete: true }
    });
    const moduleCount = new Set(permModules.map(p => p.module_id)).size;
    const crudCoverage = permModules.reduce((acc, p) => {
      acc.view += p.can_view ? 1 : 0;
      acc.create += p.can_create ? 1 : 0;
      acc.edit += p.can_edit ? 1 : 0;
      acc.delete += p.can_delete ? 1 : 0;
      return acc;
    }, { view:0, create:0, edit:0, delete:0 });
    rows.push({ role, users: userCount, modulesWithPermissions: moduleCount, crudFlags: crudCoverage });
  }

  // Sort by users desc
  rows.sort((a,b) => b.users - a.users);
  console.table(rows);
  console.log('Total distinct roles:', rows.length);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
