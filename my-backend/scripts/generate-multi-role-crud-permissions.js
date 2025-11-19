#!/usr/bin/env node
/**
 * Multi-role CRUD permission generator.
 * For each active role and each module, ensure VIEW/CREATE/UPDATE/DELETE template permissions exist.
 * Non-destructive: skips existing. Logs counts.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACTION_MAP = [
  { key: 'VIEW', fields: { can_view: true } },
  { key: 'CREATE', fields: { can_create: true } },
  { key: 'EDIT', fields: { can_edit: true } },
  { key: 'DELETE', fields: { can_delete: true } }
];

async function main() {
  // Roles: pull distinct roles from users + super_admin + enterprise_admin literal roles
  const userRoles = await prisma.user.findMany({ select: { role: true }, distinct: ['role'] });
  const roles = new Set(userRoles.map(r => r.role).filter(Boolean));
  roles.add('SUPER_ADMIN');
  roles.add('ENTERPRISE_ADMIN');

  const modules = await prisma.module.findMany({ select: { id: true } });
  let created = 0, skipped = 0;

  for (const role of roles) {
    for (const mod of modules) {
      for (const action of ACTION_MAP) {
        const existing = await prisma.permission.findFirst({
          where: {
            role: role,
            module_id: mod.id,
            OR: [
              { can_view: action.fields.can_view || false },
              { can_create: action.fields.can_create || false },
              { can_edit: action.fields.can_edit || false },
              { can_delete: action.fields.can_delete || false }
            ]
          }
        });
        if (existing) { skipped++; continue; }
        try {
          await prisma.permission.create({
            data: {
              role,
              module_id: mod.id,
              can_view: !!action.fields.can_view,
              can_create: !!action.fields.can_create,
              can_edit: !!action.fields.can_edit,
              can_delete: !!action.fields.can_delete,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
          created++;
        } catch (e) {
          if (/unique/i.test(e.message)) skipped++; else console.warn('perm warn', e.message);
        }
      }
    }
  }
  console.log(`Multi-role CRUD generation complete. created=${created} skipped=${skipped}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
