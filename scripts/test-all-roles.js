const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testAllRoles() {
  try {
    console.log('=== TESTING ALL ROLES - COMPLETE VERIFICATION ===\n');
    
    // Get all roles from roles table
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${roles.length} roles in roles table:\n`);
    
    // Test each role
    for (const role of roles) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`TESTING ROLE: ${role.name} (ID: ${role.id})`);
      console.log('='.repeat(60));
      
      // Count users with this role
      const userCount = await prisma.user.count({
        where: { role: role.name }
      });
      
      console.log(`\n1. User Count: ${userCount} users have role "${role.name}"`);
      
      // Get actual users
      const users = await prisma.user.findMany({
        where: { role: role.name },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        },
        orderBy: { username: 'asc' }
      });
      
      console.log(`\n2. User List:`);
      if (users.length === 0) {
        console.log('   ❌ NO USERS FOUND');
      } else {
        users.forEach((u, idx) => {
          console.log(`   ${idx + 1}. ${u.username} (${u.email}) - role field: "${u.role}"`);
        });
      }
      
      // Simulate what backend API should return
      console.log(`\n3. What /api/privileges/users?roleId=${role.id} should return:`);
      console.log(`   Role ID: ${role.id} → Role Name: ${role.name} → Query: users.role = "${role.name}"`);
      console.log(`   Expected result: ${users.length} users`);
      
      if (users.length !== userCount) {
        console.log('   ⚠️  WARNING: Count mismatch!');
      } else {
        console.log('   ✅ Count matches!');
      }
    }
    
    console.log('\n\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    const summary = await Promise.all(
      roles.map(async (role) => {
        const count = await prisma.user.count({ where: { role: role.name } });
        return { id: role.id, name: role.name, userCount: count };
      })
    );
    
    console.log('\nRole → User Mapping:');
    summary.forEach(s => {
      const status = s.userCount > 0 ? '✅' : '⚠️';
      console.log(`  ${status} ${s.name} (ID: ${s.id}): ${s.userCount} users`);
    });
    
    const totalUsers = await prisma.user.count();
    const totalRoles = roles.length;
    
    console.log(`\nTotal: ${totalRoles} roles, ${totalUsers} users`);
    
    // Check for orphaned users (users with roles not in roles table)
    const allUsers = await prisma.user.findMany({
      select: { role: true },
      distinct: ['role']
    });
    const userRoles = allUsers.map(u => u.role).filter(r => r);
    const roleNames = roles.map(r => r.name);
    const orphanedRoles = userRoles.filter(ur => !roleNames.includes(ur));
    
    if (orphanedRoles.length > 0) {
      console.log('\n⚠️  WARNING: Found users with roles not in roles table:');
      orphanedRoles.forEach(r => console.log(`   - ${r}`));
    } else {
      console.log('\n✅ All user roles match roles in roles table');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAllRoles();
