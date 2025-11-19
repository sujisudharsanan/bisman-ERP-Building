#!/usr/bin/env node
/**
 * Migration: Move legacy SUPER_ADMIN permissions to ADMIN and SYSTEM_ADMIN.
 * Date: 2025-11-16
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting SUPER_ADMIN permissions migration...');

  const superPerms = await prisma.permission.findMany({ where: { role: 'SUPER_ADMIN' } });
  console.log(`Found ${superPerms.length} SUPER_ADMIN permission rows.`);

  if (superPerms.length === 0) {
    console.log('No SUPER_ADMIN permissions found; nothing to migrate.');
    return;
  }

  let adminCreated = 0;
  let systemCreated = 0;
  for (const perm of superPerms) {
    // Ensure ADMIN row
    await prisma.permission.upsert({
      where: { role_module_id: { role: 'ADMIN', module_id: perm.module_id } },
      update: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      create: { role: 'ADMIN', module_id: perm.module_id, can_view: true, can_create: true, can_edit: true, can_delete: true },
    });
    adminCreated++;
    // Ensure SYSTEM_ADMIN row
    await prisma.permission.upsert({
      where: { role_module_id: { role: 'SYSTEM_ADMIN', module_id: perm.module_id } },
      update: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      create: { role: 'SYSTEM_ADMIN', module_id: perm.module_id, can_view: true, can_create: true, can_edit: true, can_delete: true },
    });
    systemCreated++;
  }

  const deleted = await prisma.permission.deleteMany({ where: { role: 'SUPER_ADMIN' } });
  console.log(`🗑️ Deleted ${deleted.count} legacy SUPER_ADMIN permission rows.`);
  console.log(`✅ Upserted ADMIN rows: ${adminCreated}`);
  console.log(`✅ Upserted SYSTEM_ADMIN rows: ${systemCreated}`);
  console.log('🎉 Permission migration complete.');
}

main().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});