/**
 * Clean up deleted roles completely
 * - Update users with deleted roles
 * - Remove remaining deleted role entries
 * - Clean up orphaned data
 */

const { getPrisma } = require('./lib/prisma');

async function cleanupDeletedRoles() {
  const prisma = getPrisma();
  
  try {
    console.log('\n========================================');
    console.log('CLEANUP DELETED ROLES');
    console.log('========================================\n');
    
    // Roles to remove
    const rolesToDelete = ['STAFF', 'USER', 'Staff', 'Demo User'];
    
    // Step 1: Find users with deleted roles
    console.log('Step 1: Finding users with deleted roles...');
    const usersWithDeletedRoles = await prisma.User.findMany({
      where: {
        OR: rolesToDelete.map(role => ({ role }))
      }
    });
    
    console.log(`Found ${usersWithDeletedRoles.length} users with deleted roles:`);
    usersWithDeletedRoles.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.username} (${u.role}) | ${u.email}`);
    });
    
    if (!process.argv.includes('--confirm')) {
      console.log('\n⚠️  To proceed with cleanup, run with --confirm flag');
      console.log('  node cleanup-deleted-roles.js --confirm\n');
      await prisma.$disconnect();
      return;
    }
    
    // Step 2: Update users to ADMIN role (or delete them)
    console.log('\nStep 2: Updating users...');
    for (const user of usersWithDeletedRoles) {
      // Option 1: Update to ADMIN role
      await prisma.User.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      console.log(`✅ Updated user ${user.username} from ${user.role} to ADMIN`);
      
      // Option 2: Uncomment to delete users instead
      // await prisma.User.delete({ where: { id: user.id } });
      // console.log(`✅ Deleted user ${user.username}`);
    }
    
    // Step 3: Remove roles from rbac_roles
    console.log('\nStep 3: Removing roles from rbac_roles...');
    const rolesToRemove = await prisma.rbac_roles.findMany({
      where: {
        OR: [
          { name: { in: rolesToDelete } },
          { display_name: { in: rolesToDelete } }
        ]
      }
    });
    
    console.log(`Found ${rolesToRemove.length} role entries to remove:`);
    rolesToRemove.forEach(r => {
      console.log(`  ID: ${r.id} | ${r.name}`);
    });
    
    for (const role of rolesToRemove) {
      // Delete related user-role assignments
      await prisma.rbac_user_roles.deleteMany({
        where: { role_id: role.id }
      });
      
      // Delete related permissions
      await prisma.rbac_permissions.deleteMany({
        where: { role_id: role.id }
      });
      
      // Delete the role
      await prisma.rbac_roles.delete({
        where: { id: role.id }
      });
      
      console.log(`✅ Deleted role: ${role.name} (ID: ${role.id})`);
    }
    
    // Step 4: Verify cleanup
    console.log('\nStep 4: Verification...');
    
    const remainingUsers = await prisma.User.findMany({
      where: {
        OR: rolesToDelete.map(role => ({ role }))
      }
    });
    
    const remainingRoles = await prisma.rbac_roles.findMany({
      where: {
        OR: [
          { name: { in: rolesToDelete } },
          { display_name: { in: rolesToDelete } }
        ]
      }
    });
    
    if (remainingUsers.length === 0 && remainingRoles.length === 0) {
      console.log('✅ All deleted roles cleaned up successfully!');
    } else {
      console.log('⚠️  Some items still remain:');
      console.log(`   Users: ${remainingUsers.length}`);
      console.log(`   Roles: ${remainingRoles.length}`);
    }
    
    // Show current state
    console.log('\nCurrent state:');
    const allUsers = await prisma.User.findMany({
      select: { id: true, username: true, role: true }
    });
    console.log(`Total users: ${allUsers.length}`);
    
    const allRoles = await prisma.rbac_roles.findMany({
      select: { id: true, name: true }
    });
    console.log(`Total roles: ${allRoles.length}`);
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDeletedRoles();
