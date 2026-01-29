/* eslint-env node */
// Test from my-backend directory!
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
    }
  }
});

async function testMasterModulesAPI() {
  console.log('=== SIMULATING master-modules API ===\n');
  
  try {
    // Simulate Enterprise Admin (sees all modules)
    const dbModules = await prisma.modules.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log('1. Prisma returned:', dbModules.length, 'modules from database');
    
    // Load config
    const { MASTER_MODULES } = require('./config/master-modules');
    console.log('2. Config has:', MASTER_MODULES.length, 'modules');
    
    // Merge - exactly like the API does
    const modulesWithPages = dbModules.map(dbModule => {
      let configModule = MASTER_MODULES.find(m => m.id === dbModule.module_name);
      return {
        id: dbModule.id,
        module_name: dbModule.module_name,
        display_name: dbModule.display_name,
        name: dbModule.display_name,
        productType: dbModule.productType,
        businessCategory: configModule?.businessCategory || 'All',
        hideFromAssignment: configModule?.hideFromAssignment || false,
        pages: configModule?.pages || []
      };
    }).filter(m => !m.hideFromAssignment);
    
    console.log('3. After hideFromAssignment filter:', modulesWithPages.length, 'modules');
    console.log('\n4. API Response would be:');
    console.log(JSON.stringify({ 
      ok: true, 
      modules: modulesWithPages.slice(0, 3), // Just first 3 for brevity
      total: modulesWithPages.length 
    }, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  await prisma.$disconnect();
}

async function testRolesUsersAPI() {
  console.log('\n=== SIMULATING roles-users API ===\n');
  
  try {
    const roles = await prisma.rbac_roles.findMany();
    console.log('1. Prisma returned:', roles.length, 'roles');
    
    // Format like API does
    const report = roles.slice(0, 5).map(role => ({
      roleId: role.id,
      roleName: role.name,
      roleDisplayName: role.display_name || role.name,
      roleLevel: role.level,
      userCount: 0
    }));
    
    console.log('\n2. API Response would be:');
    console.log(JSON.stringify({
      success: true,
      summary: { totalRoles: roles.length },
      data: report
    }, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  await prisma.$disconnect();
}

(async () => {
  await testMasterModulesAPI();
  await testRolesUsersAPI();
})();
