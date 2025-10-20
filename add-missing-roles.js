const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function addMissingRoles() {
  try {
    // Get unique roles from users
    const users = await prisma.user.findMany({
      select: { role: true },
      distinct: ['role']
    });
    
    console.log('=== UNIQUE ROLES IN USERS TABLE ===');
    const userRoles = [...new Set(users.map(u => u.role))];
    userRoles.forEach(r => console.log(`  - ${r}`));
    
    // Get existing roles
    const existingRoles = await prisma.role.findMany({
      select: { name: true }
    });
    const existingRoleNames = existingRoles.map(r => r.name);
    
    console.log('\n=== EXISTING ROLES IN ROLES TABLE ===');
    existingRoleNames.forEach(r => console.log(`  - ${r}`));
    
    // Find missing roles
    const missingRoles = userRoles.filter(r => !existingRoleNames.includes(r));
    
    console.log('\n=== MISSING ROLES TO BE ADDED ===');
    if (missingRoles.length === 0) {
      console.log('  (none - all roles already exist)');
    } else {
      missingRoles.forEach(r => console.log(`  - ${r}`));
      
      console.log('\n=== ADDING MISSING ROLES ===');
      for (const roleName of missingRoles) {
        try {
          const created = await prisma.role.create({
            data: {
              name: roleName
            }
          });
          console.log(`✅ Created role: ${created.name} (ID: ${created.id})`);
        } catch (e) {
          console.error(`❌ Failed to create role ${roleName}:`, e.message);
        }
      }
    }
    
    console.log('\n=== FINAL ROLES COUNT ===');
    const finalRoles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`Total roles: ${finalRoles.length}`);
    finalRoles.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.name}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingRoles();
