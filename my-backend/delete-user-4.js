/**
 * Script to delete user with ID 4
 * This will remove the user from the database
 */

const { getPrisma } = require('./lib/prisma');

async function deleteUser() {
  const prisma = getPrisma();
  
  try {
    console.log('\n========================================');
    console.log('DELETE USER ID: 4');
    console.log('========================================\n');
    
    // First, check if user exists and show their details
    const user = await prisma.User.findUnique({
      where: { id: 4 }
    });
    
    if (!user) {
      console.log('❌ User with ID 4 not found in database');
      console.log('\n========================================\n');
      await prisma.$disconnect();
      return;
    }
    
    console.log('User to be deleted:');
    console.log('-------------------');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log('');
    
    // Check if --confirm flag is present
    if (!process.argv.includes('--confirm')) {
      console.log('⚠️  This action will permanently delete this user!');
      console.log('To proceed, run this script with --confirm flag:');
      console.log('  node delete-user-4.js --confirm\n');
      console.log('❌ Aborted. No changes made.');
      console.log('\n========================================\n');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Proceeding with deletion...\n');
    
    // Delete related records first (if any)
    // Check for user permissions
    const userPermissions = await prisma.rbac_user_permissions.findMany({
      where: { user_id: user.id }
    });
    
    if (userPermissions.length > 0) {
      console.log(`Deleting ${userPermissions.length} user permission(s)...`);
      await prisma.rbac_user_permissions.deleteMany({
        where: { user_id: user.id }
      });
      console.log('✅ User permissions deleted');
    }
    
    // Delete the user
    console.log('Deleting user...');
    await prisma.User.delete({
      where: { id: 4 }
    });
    
    console.log('\n✅ Successfully deleted user ID 4!');
    
    // Show remaining users
    console.log('\nRemaining users:');
    console.log('----------------');
    const remainingUsers = await prisma.User.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });
    
    console.log(`Total users: ${remainingUsers.length}\n`);
    remainingUsers.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.username} (${u.role}) | ${u.email}`);
    });
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    if (error.code === 'P2003') {
      console.error('\n⚠️  Cannot delete user due to foreign key constraint.');
      console.error('This user may be referenced in other tables.');
      console.error('Please check for related records first.\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteUser();
