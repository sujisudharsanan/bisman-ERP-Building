const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSystemAdministrationModule() {
  try {
    console.log('🔍 Checking if System Administration module exists...\n');

    // Check if it already exists
    const existing = await prisma.module.findFirst({
      where: {
        module_name: 'system'
      }
    });

    if (existing) {
      console.log('✅ System Administration module already exists:');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.display_name}`);
      console.log(`   Product Type: ${existing.productType}`);
      return;
    }

    console.log('➕ Creating System Administration module...\n');

    // Create the module
    const newModule = await prisma.module.create({
      data: {
        module_name: 'system',
        display_name: 'System Administration',
        description: 'System settings, users, and configuration',
        route: '/system',
        productType: 'BUSINESS_ERP',
        is_active: true
      }
    });

    console.log('✅ System Administration module created successfully!');
    console.log(`   ID: ${newModule.id}`);
    console.log(`   Name: ${newModule.display_name}`);
    console.log(`   Module Name: ${newModule.module_name}`);
    console.log(`   Product Type: ${newModule.productType}`);
    console.log('');

    console.log('📋 Module has 19 pages defined in config:');
    const { MASTER_MODULES } = require('./config/master-modules');
    const configModule = MASTER_MODULES.find(m => m.id === 'system');
    if (configModule) {
      configModule.pages.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page.name} (${page.id})`);
      });
    }

    console.log('\n🎉 Setup Complete!');
    console.log('\nNext Steps:');
    console.log('1. Go to Enterprise Admin → Module Management');
    console.log('2. Select a Super Admin');
    console.log('3. Assign the "System Administration" module');
    console.log('4. Select which pages to grant access to');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSystemAdministrationModule();
