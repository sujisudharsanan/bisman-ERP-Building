const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnmappedPages() {
  try {
    console.log('🔍 Checking for unmapped pages...\n');

    // Get all modules from config
    const { MASTER_MODULES } = require('./config/master-modules');
    
    // Get all modules from database
    const dbModules = await prisma.module.findMany({
      select: {
        id: true,
        module_name: true,
        display_name: true,
        productType: true
      }
    });

    console.log('📊 SUMMARY:');
    console.log(`   Modules in config: ${MASTER_MODULES.length}`);
    console.log(`   Modules in database: ${dbModules.length}`);
    console.log('');

    // Find modules in config but not in database
    const configModuleNames = MASTER_MODULES.map(m => m.id);
    const dbModuleNames = dbModules.map(m => m.module_name);
    
    const missingModules = configModuleNames.filter(name => !dbModuleNames.includes(name));
    
    if (missingModules.length > 0) {
      console.log('⚠️  MODULES IN CONFIG BUT NOT IN DATABASE:\n');
      missingModules.forEach(moduleName => {
        const configModule = MASTER_MODULES.find(m => m.id === moduleName);
        console.log(`   ❌ ${configModule.name} (${moduleName})`);
        console.log(`      Category: ${configModule.businessCategory}`);
        console.log(`      Pages: ${configModule.pages?.length || 0}`);
        console.log('');
      });
    } else {
      console.log('✅ All config modules exist in database!\n');
    }

    // Show all modules with page counts
    console.log('📋 ALL MODULES WITH PAGE COUNTS:\n');
    
    const allModuleData = [];
    
    MASTER_MODULES.forEach(configModule => {
      const dbModule = dbModules.find(m => m.module_name === configModule.id);
      const inDb = !!dbModule;
      const pageCount = configModule.pages?.length || 0;
      
      allModuleData.push({
        name: configModule.name,
        moduleName: configModule.id,
        category: configModule.businessCategory,
        pages: pageCount,
        inDatabase: inDb,
        dbId: dbModule?.id || 'N/A',
        productType: dbModule?.productType || configModule.businessCategory
      });
    });

    // Group by Business/Pump
    const businessErp = allModuleData.filter(m => 
      m.category === 'Business ERP' || m.category === 'All'
    );
    const pumpErp = allModuleData.filter(m => 
      m.category === 'Pump Management'
    );

    console.log('🔷 BUSINESS ERP MODULES:');
    businessErp.forEach(m => {
      const status = m.inDatabase ? '✅' : '❌';
      console.log(`   ${status} ${m.name} (${m.moduleName})`);
      console.log(`      DB ID: ${m.dbId} | Pages: ${m.pages} | Category: ${m.category}`);
    });

    console.log('\n🔶 PUMP MANAGEMENT MODULES:');
    pumpErp.forEach(m => {
      const status = m.inDatabase ? '✅' : '❌';
      console.log(`   ${status} ${m.name} (${m.moduleName})`);
      console.log(`      DB ID: ${m.dbId} | Pages: ${m.pages} | Category: ${m.category}`);
    });

    console.log('\n📈 STATISTICS:');
    console.log(`   Total modules in config: ${allModuleData.length}`);
    console.log(`   Modules in database: ${allModuleData.filter(m => m.inDatabase).length}`);
    console.log(`   Missing from database: ${allModuleData.filter(m => !m.inDatabase).length}`);
    console.log(`   Total pages across all modules: ${allModuleData.reduce((sum, m) => sum + m.pages, 0)}`);

    // Show which modules are missing
    if (missingModules.length > 0) {
      console.log('\n🔧 TO ADD MISSING MODULES:');
      console.log('   Run this SQL or create a script:');
      console.log('');
      missingModules.forEach(moduleName => {
        const configModule = MASTER_MODULES.find(m => m.id === moduleName);
        const productType = configModule.businessCategory === 'Pump Management' ? 'PUMP_ERP' : 'BUSINESS_ERP';
        console.log(`   INSERT INTO modules (module_name, display_name, description, route, "productType", is_active)`);
        console.log(`   VALUES ('${moduleName}', '${configModule.name}', '${configModule.description}', '/${moduleName}', '${productType}', true);`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnmappedPages();
