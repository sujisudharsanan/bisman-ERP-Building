const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHubInchargePermissions() {
  try {
    // Find the Hub Incharge role
    const role = await prisma.rbac_roles.findFirst({
      where: { role_name: { contains: 'Hub Incharge', mode: 'insensitive' } }
    });
    
    console.log('Hub Incharge Role:', role);
    
    if (!role) {
      console.log('❌ Hub Incharge role not found');
      return;
    }
    
    // Find Hub Incharge users
    const users = await prisma.user.findMany({
      where: { role_id: role.id },
      select: { id: true, username: true, email: true }
    });
    
    console.log(`\n✅ Found ${users.length} Hub Incharge user(s):\n`, users);
    
    // Check role default permissions
    const rolePerms = await prisma.rbac_role_permissions.findMany({
      where: { role_id: role.id },
      select: { page_key: true }
    });
    
    console.log(`\n📋 Role Default Permissions (${rolePerms.length}):`);
    rolePerms.forEach(p => console.log('  -', p.page_key));
    
    // Check each user's custom permissions
    for (const user of users) {
      const userPerms = await prisma.rbac_user_permissions.findMany({
        where: { user_id: user.id },
        select: { page_key: true }
      });
      
      console.log(`\n👤 User: ${user.username} (ID: ${user.id})`);
      console.log(`   Custom Overrides (${userPerms.length}):`);
      userPerms.forEach(p => console.log('     +', p.page_key));
      
      // Total access = role defaults + user overrides
      const allPages = new Set([...rolePerms.map(p => p.page_key), ...userPerms.map(p => p.page_key)]);
      console.log(`   📊 TOTAL ACCESS: ${allPages.size} pages`);
      console.log('   Full list:', Array.from(allPages));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHubInchargePermissions();
