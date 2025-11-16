#!/usr/bin/env node
/**
 * Idempotent module upsert from registry/modules.json
 * - Never deletes or deactivates
 * - Inserts missing, updates display fields only
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const file = path.join(__dirname, '..', 'registry', 'modules.json');
  const items = JSON.parse(fs.readFileSync(file, 'utf-8'));

  for (const m of items) {
    const existing = await prisma.module.findUnique({ where: { module_name: m.module_name } });
    if (!existing) {
      await prisma.module.create({ data: {
        module_name: m.module_name,
        display_name: m.display_name,
        description: m.description || null,
        route: m.route || `/${m.module_name}`,
        icon: m.icon || null,
        productType: m.productType || 'ALL',
        is_active: m.is_active !== false,
        sort_order: m.sort_order ?? 0,
      }});
      console.log(`+ module inserted: ${m.module_name}`);
    } else {
      // Update only presentation fields to avoid breaking assignments
      await prisma.module.update({ where: { id: existing.id }, data: {
        display_name: m.display_name,
        description: m.description || existing.description,
        route: m.route || existing.route,
        icon: m.icon || existing.icon,
        productType: m.productType || existing.productType,
        is_active: m.is_active !== false,
        sort_order: m.sort_order ?? existing.sort_order,
      }});
      console.log(`~ module updated: ${m.module_name}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); return prisma.$disconnect().then(() => process.exit(1)); });
