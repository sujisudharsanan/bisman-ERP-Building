#!/usr/bin/env node
/**
 * Migration: Refactor SUPER_ADMIN role to ADMIN; introduce SYSTEM_ADMIN root user;
 * seed client module permissions defaults.
 * Date: 2025-11-16
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting SUPER_ADMIN refactor migration...');

  // 1. Update roles SUPER_ADMIN -> ADMIN (only for User.role)
  const updateResult = await prisma.user.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { role: 'ADMIN' }
  });
  console.log(`✅ Updated ${updateResult.count} user(s) role SUPER_ADMIN -> ADMIN`);

  // 2. Ensure SYSTEM_ADMIN root user exists
  const systemAdminEmail = 'platform@bisman.system';
  const existingSystemAdmin = await prisma.user.findUnique({ where: { email: systemAdminEmail } });
  if (!existingSystemAdmin) {
    const passwordHash = await bcrypt.hash('ChangeMe123!@', 10);
    const created = await prisma.user.create({
      data: {
        username: 'platform_root',
        email: systemAdminEmail,
        password: passwordHash,
        role: 'SYSTEM_ADMIN',
        productType: 'ALL'
      }
    });
    console.log(`✅ Created SYSTEM_ADMIN root user id=${created.id}`);
  } else {
    console.log('ℹ️ SYSTEM_ADMIN root user already exists');
  }

  // 3. Seed client module permissions defaults (full access for now)
  const clients = await prisma.client.findMany();
  const modules = await prisma.module.findMany({ where: { is_active: true } });
  let inserted = 0;
  for (const c of clients) {
    for (const m of modules) {
      await prisma.clientModulePermission.upsert({
        where: { client_id_module_id: { client_id: c.id, module_id: m.id } },
        update: {},
        create: {
          client_id: c.id,
          module_id: m.id,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true
        }
      });
      inserted++;
    }
  }
  console.log(`✅ Upserted ${inserted} client_module_permissions rows`);

  console.log('🎉 Migration completed successfully');
}

main()
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
