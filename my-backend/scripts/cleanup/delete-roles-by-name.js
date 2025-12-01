/**
 * Script to delete roles by name from rbac_roles table
 * Usage: node delete-roles-by-name.js --confirm
 */

const { getPrisma } = require('./lib/prisma');

// List of role names to delete
const rolesToDelete = ['STAFF', 'USER'];

async function deleteRoles() {
  const prisma = getPrisma();
  try {
    console.log('\n========================================');
    console.log('DELETE ROLES BY NAME');
    console.log('========================================\n');

    // Find roles to delete
    const roles = await prisma.rbac_roles.findMany({
      where: { name: { in: rolesToDelete } },
    });

    if (roles.length === 0) {
      console.log('❌ No roles found for the given names.');
      await prisma.$disconnect();
      return;
    }

    console.log('Roles to be deleted:');
    roles.forEach(r => {
      console.log(`  ID: ${r.id} | ${r.name}`);
    });
    console.log('');

    if (!process.argv.includes('--confirm')) {
      console.log('⚠️  This action will permanently delete these roles and all related assignments!');
      console.log('To proceed, run this script with --confirm flag:');
      console.log('  node delete-roles-by-name.js --confirm\n');
      console.log('❌ Aborted. No changes made.');
      await prisma.$disconnect();
      return;
    }

    for (const role of roles) {
      // Delete related user-role assignments
      const userRoles = await prisma.rbac_user_roles.findMany({
        where: { role_id: role.id },
      });
      if (userRoles.length > 0) {
        await prisma.rbac_user_roles.deleteMany({
          where: { role_id: role.id },
        });
  console.log(`✅ Deleted ${userRoles.length} user-role assignments for role ${role.name}`);
      }
      // Delete the role
      await prisma.rbac_roles.delete({ where: { id: role.id } });
  console.log(`✅ Deleted role: ${role.name}`);
    }

    // Show remaining roles
    const remainingRoles = await prisma.rbac_roles.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
    console.log(`\nRemaining roles: ${remainingRoles.length}`);
    remainingRoles.forEach(r => {
      console.log(`  ID: ${r.id} | ${r.name}`);
    });
    console.log('\n========================================\n');
  } catch (error) {
    console.error('❌ Error deleting roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteRoles();
