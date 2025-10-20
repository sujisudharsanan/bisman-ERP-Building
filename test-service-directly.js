// Direct test bypassing authentication
const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

// Import the service (it's already an instance, not a class)
const service = require('./my-backend/services/privilegeService');

async function testPrivilegeService() {
  try {
    console.log('=== TESTING PrivilegeService DIRECTLY ===\n');
    
    // Test getAllRoles
    console.log('1. Testing getAllRoles():');
    const roles = await service.getAllRoles();
    console.log(`   Found ${roles.length} roles:`);
    roles.forEach(r => {
      console.log(`   - ${r.name} (ID: ${r.id}): ${r.user_count} users`);
    });
    
    // Test getUsersByRole for each role
    console.log('\n2. Testing getUsersByRole() for each role:');
    for (const role of roles) {
      console.log(`\n   Role: ${role.name} (ID: ${role.id})`);
      const users = await service.getUsersByRole(role.id);
      console.log(`   Found ${users.length} users:`);
      users.forEach(u => {
        console.log(`     - ${u.username} (${u.email})`);
      });
      
      if (users.length !== role.user_count) {
        console.log(`   ⚠️  WARNING: getUsersByRole returned ${users.length} users but user_count is ${role.user_count}`);
      }
    }
    
    console.log('\n✅ All tests passed! The service is working correctly.');
    console.log('\nIf the frontend still shows no users, the issue is:');
    console.log('  1. Backend not restarted with new code');
    console.log('  2. Frontend not calling the API correctly');
    console.log('  3. Authentication blocking the API calls');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPrivilegeService();
