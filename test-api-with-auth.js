const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  try {
    console.log('=== TESTING API DATA (SIMULATING BACKEND RESPONSE) ===\n');
    
    // 1. Get all roles (what /api/privileges/roles should return)
    console.log('1. GET /api/privileges/roles:');
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await prisma.user.count({
          where: { role: role.name }
        });
        return {
          id: role.id,
          name: role.name,
          user_count: userCount
        };
      })
    );
    
    console.log(JSON.stringify(rolesWithCounts, null, 2));
    
    // 2. Test each role's users (what /api/privileges/users?roleId=X should return)
    console.log('\n\n2. Testing user queries for each role:');
    for (const role of roles) {
      console.log(`\n   GET /api/privileges/users?roleId=${role.id} (${role.name}):`);
      
      const users = await prisma.user.findMany({
        where: { role: role.name },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        }
      });
      
      console.log(`   Found ${users.length} users:`);
      users.forEach(u => {
        console.log(`     - ${u.username} (${u.email})`);
      });
    }
    
    console.log('\n\n=== TEST COMPLETE ===');
    console.log('If your frontend shows "No users", the issue is in the frontend or API routing.');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
