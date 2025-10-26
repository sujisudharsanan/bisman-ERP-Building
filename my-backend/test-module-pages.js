const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const dbModules = await prisma.module.findMany({
      where: {
        id: { in: [3, 8, 16] }
      },
      orderBy: {
        id: 'asc'
      }
    });

    const { MASTER_MODULES } = require('./config/master-modules');

    console.log('\n=== Testing Module/Page Matching ===\n');

    dbModules.forEach(dbModule => {
      const configModule = MASTER_MODULES.find(m => m.id === dbModule.module_name);
      
      console.log(`\nDB Module ID: ${dbModule.id}`);
      console.log(`Module Name: ${dbModule.module_name}`);
      console.log(`Display Name: ${dbModule.display_name}`);
      console.log(`Config Module Found: ${configModule ? 'YES' : 'NO'}`);
      if (configModule) {
        console.log(`Pages in Config: ${configModule.pages?.length || 0}`);
        console.log(`Pages:`, configModule.pages);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
