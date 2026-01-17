/**
 * Sync MASTER_MODULES config to database
 * 
 * This script ensures all modules defined in master-modules.js exist in the database.
 * Run this after updating master-modules.js to sync new modules.
 */

const { PrismaClient } = require('@prisma/client');
const { MASTER_MODULES } = require('../config/master-modules');

const prisma = new PrismaClient();

async function syncModules() {
  console.log('=== Syncing MASTER_MODULES to Database ===\n');
  console.log(`Config has ${MASTER_MODULES.length} modules`);

  // Get existing modules from database
  const existingModules = await prisma.modules.findMany();
  const existingNames = new Set(existingModules.map(m => m.module_name));
  
  console.log(`Database has ${existingModules.length} modules\n`);

  // Find modules to add
  const modulesToAdd = MASTER_MODULES.filter(m => !existingNames.has(m.id));
  
  if (modulesToAdd.length === 0) {
    console.log('✓ All modules are already in the database!');
    await prisma.$disconnect();
    return;
  }

  console.log(`Adding ${modulesToAdd.length} missing modules:\n`);

  for (const module of modulesToAdd) {
    try {
      // Determine if module should be always accessible
      const alwaysAccessible = module.alwaysAccessible || 
        ['common', 'dashboard'].includes(module.id);
      
      // Determine product type based on category
      let productType = 'business_erp';
      if (module.businessCategory === 'Pump' || module.id === 'pump-management') {
        productType = 'pump_management';
      }

      // Determine the route - pages[0] is an object with path property
      let route = `/${module.id}`;
      if (module.pages && module.pages.length > 0 && module.pages[0].path) {
        route = module.pages[0].path;
      }

      const created = await prisma.modules.create({
        data: {
          module_name: module.id,
          display_name: module.name,
          description: module.description || '',
          is_always_accessible: alwaysAccessible,
          productType: productType,
          icon: module.icon || 'FiBox',
          route: route
        }
      });

      console.log(`  ✓ Added: ${module.id} (${module.name}) - ${module.pages?.length || 0} pages`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`  - Skipped: ${module.id} (already exists)`);
      } else {
        console.error(`  ✗ Error adding ${module.id}:`, error.message);
      }
    }
  }

  // Final count
  const finalCount = await prisma.modules.count();
  console.log(`\n=== Done! Database now has ${finalCount} modules ===`);

  await prisma.$disconnect();
}

syncModules().catch(e => {
  console.error('Sync failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
