const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUsers() {
  try {
    // Users to keep (from login page)
    const keepEmails = [
      'enterprise@bisman.erp',
      'demo_it_admin@bisman.demo',
      'demo_cfo@bisman.demo',
      'demo_finance_controller@bisman.demo',
      'demo_treasury@bisman.demo',
      'demo_accounts@bisman.demo'
    ];
    
    console.log('🔍 Finding users to delete...\n');
    
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    console.log(`📋 Total users in database: ${allUsers.length}`);
    console.log(`✅ Users to keep: ${keepEmails.length}\n`);
    
    // Find users to delete
    const usersToDelete = allUsers.filter(user => !keepEmails.includes(user.email));
    
    console.log(`🗑️  Users to delete: ${usersToDelete.length}\n`);
    
    if (usersToDelete.length === 0) {
      console.log('✨ No users to delete. Database is already clean!');
      return;
    }
    
    // Delete users
    console.log('🧹 Deleting users...\n');
    for (const user of usersToDelete) {
      try {
        await prisma.user.delete({
          where: { id: user.id }
        });
        console.log(`  ❌ Deleted: ${user.email} (${user.role})`);
      } catch (err) {
        console.log(`  ⚠️  Error deleting ${user.email}:`, err.message);
      }
    }
    
    // Verify final count
    const remainingUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true
      },
      orderBy: {
        email: 'asc'
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Cleanup Complete!\n');
    console.log(`📊 Remaining users: ${remainingUsers.length}\n`);
    
    remainingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUsers();
