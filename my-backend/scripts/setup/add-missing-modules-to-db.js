const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingModules() {
  try {
    console.log('\n🔄 Adding missing modules to database...\n');

    // 1. Add super-admin module
    const superAdminModule = await prisma.module.upsert({
      where: { module_name: 'super-admin' },
      update: {},
      create: {
        module_name: 'super-admin',
        display_name: 'Super Admin',
        description: 'Super Admin specific functionality',
        route: '/super-admin',
        icon: 'shield',
        productType: 'BUSINESS_ERP',
        is_active: true,
        sort_order: 18,
      },
    });
    console.log('✅ Added/Updated: super-admin (ID:', superAdminModule.id + ')');

    // 2. Add task-management module
    const taskModule = await prisma.module.upsert({
      where: { module_name: 'task-management' },
      update: {},
      create: {
        module_name: 'task-management',
        display_name: 'Task Management',
        description: 'Task and workflow management system',
        route: '/tasks',
        icon: 'tasks',
        productType: 'BUSINESS_ERP',
        is_active: true,
        sort_order: 19,
      },
    });
    console.log('✅ Added/Updated: task-management (ID:', taskModule.id + ')');

    console.log('\n✅ All missing modules added successfully!\n');

    // Verify by listing all modules
    const allModules = await prisma.module.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        module_name: true,
        display_name: true,
        productType: true,
      },
    });

    console.log('📋 Current database modules (' + allModules.length + '):');
    allModules.forEach(m => {
      console.log(`   ${m.id}. ${m.module_name} (${m.display_name}) - ${m.productType}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingModules();
