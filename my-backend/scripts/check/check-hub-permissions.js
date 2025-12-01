const { getPrisma } = require('./lib/prisma');

const prisma = getPrisma();

async function checkHubInchargePermissions() {
  try {
    const role = await prisma.rbac_roles.findFirst({
      where: { name: { contains: 'Hub Incharge', mode: 'insensitive' } }
    });
    
    console.log('\n=== Hub Incharge Role ===');
    console.log('ID:', role?.id, 'Name:', role?.name);
    
    if (!role) {
      console.log('❌ Hub Incharge role not found');
      return;
    }
    
    const users = await prisma.user.findMany({
      where: { role: { contains: 'Hub Incharge', mode: 'insensitive' } },
      select: { id: true, username: true, email: true, role: true }
    });
    
    console.log(`\n✅ Found ${users.length} Hub Incharge user(s):`);
    users.forEach(u => console.log(`  - ${u.username} (ID: ${u.id}, email: ${u.email})`));
    
    for (const user of users) {
      const userPerms = await prisma.rbac_user_permissions.findMany({
        where: { user_id: user.id },
        select: { page_key: true, created_at: true }
      });
      
      console.log(`\n\n👤 User: ${user.username} (ID: ${user.id})`);
      console.log(`   📊 TOTAL PERMISSIONS: ${userPerms.length} pages`);
      console.log('   ========================================');
      
      if (userPerms.length === 0) {
        console.log('   ❌ NO PERMISSIONS ASSIGNED!');
      } else {
        userPerms.forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.page_key}`);
        });
      }
    }
    
    console.log('\n\n💡 DIAGNOSIS:');
    console.log('   - The Permission Manager UI shows 6 pages (2 defaults + 4 overrides)');
    console.log('   - But sidebar should only show pages from rbac_user_permissions table');
    console.log('   - If sidebar shows more pages, check DynamicSidebar component');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHubInchargePermissions();
