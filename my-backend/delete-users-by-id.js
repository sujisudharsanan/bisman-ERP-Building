/**
 * Script to delete users by ID
 * Usage: node delete-users-by-id.js --confirm
 */

const { getPrisma } = require('./lib/prisma');

// List of user IDs to delete
const idsToDelete = [4, 14];

async function deleteUsers() {
  const prisma = getPrisma();
  try {
    console.log('\n========================================');
    console.log('DELETE USERS BY ID');
    console.log('========================================\n');

    // Find users to delete
    const users = await prisma.User.findMany({
      where: { id: { in: idsToDelete } },
    });

    if (users.length === 0) {
      console.log('❌ No users found for the given IDs.');
      await prisma.$disconnect();
      return;
    }

    console.log('Users to be deleted:');
    users.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.username} (${u.role}) | ${u.email}`);
    });
    console.log('');

    if (!process.argv.includes('--confirm')) {
      console.log('⚠️  This action will permanently delete these users!');
      console.log('To proceed, run this script with --confirm flag:');
      console.log('  node delete-users-by-id.js --confirm\n');
      console.log('❌ Aborted. No changes made.');
      await prisma.$disconnect();
      return;
    }

    for (const user of users) {
      // Delete related user permissions
      const userPermissions = await prisma.rbac_user_permissions.findMany({
        where: { user_id: user.id },
      });
      if (userPermissions.length > 0) {
        await prisma.rbac_user_permissions.deleteMany({
          where: { user_id: user.id },
        });
        console.log(`✅ Deleted ${userPermissions.length} permissions for user ID ${user.id}`);
      }
      // Delete the user
      await prisma.User.delete({ where: { id: user.id } });
      console.log(`✅ Deleted user ID: ${user.id}`);
    }

    // Show remaining users
    const remainingUsers = await prisma.User.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, username: true, email: true, role: true },
    });
    console.log(`\nRemaining users: ${remainingUsers.length}`);
    remainingUsers.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.username} (${u.role}) | ${u.email}`);
    });
    console.log('\n========================================\n');
  } catch (error) {
    console.error('❌ Error deleting users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUsers();
