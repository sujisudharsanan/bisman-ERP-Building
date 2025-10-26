const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        assignedModules: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });
    
    console.log('\n📋 Total Users:', users.length);
    console.log('\n' + '='.repeat(100));
    
    // Group by role
    const roleGroups = {};
    users.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user);
    });
    
    // Display by role
    Object.keys(roleGroups).sort().forEach(role => {
      console.log('\n🔷 ' + role + ' (' + roleGroups[role].length + ' users)');
      console.log('-'.repeat(100));
      
      roleGroups[role].forEach((user, index) => {
        const modules = Array.isArray(user.assignedModules) ? user.assignedModules : [];
        console.log(`  ${index + 1}. Email: ${user.email}`);
        console.log(`     Username: ${user.username || 'N/A'}`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Assigned Modules: ${modules.length > 0 ? modules.join(', ') : 'None'}`);
        console.log(`     Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log('');
      });
    });
    
    console.log('='.repeat(100));
    
    // Summary by role
    console.log('\n📊 Summary by Role:');
    Object.keys(roleGroups).sort().forEach(role => {
      console.log(`   • ${role}: ${roleGroups[role].length} users`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers();
