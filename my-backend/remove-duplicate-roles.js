/**
 * Script to remove duplicate admin roles from rbac_roles table
 * This will keep the original roles (ID 1: ADMIN, ID 7: SUPER_ADMIN) 
 * and remove the duplicates (ID 9: Admin, ID 8: Super Admin)
 */

const { getPrisma } = require('./lib/prisma');

async function removeDuplicateRoles() {
  const prisma = getPrisma();
  
  try {
    console.log('\n========================================');
    console.log('REMOVING DUPLICATE ADMIN ROLES');
    console.log('========================================\n');
    
    // These are the duplicate roles that normalize to the same value as existing roles
    const duplicateRoleIds = [
      8,  // "Super Admin" (duplicate of ID 7: "SUPER_ADMIN")
      9,  // "Admin" (duplicate of ID 1: "ADMIN")
    ];
    
    console.log('Roles to be removed:');
    console.log('--------------------');
    
    // Show what will be deleted
    const rolesToDelete = await prisma.rbac_roles.findMany({
      where: {
        id: { in: duplicateRoleIds }
      }
    });
    
    rolesToDelete.forEach(role => {
      console.log(`  ID: ${role.id} | Name: "${role.name}" | Display: "${role.display_name}"`);
    });
    
    console.log('\n⚠️  Are you sure you want to delete these roles?');
    console.log('This action cannot be undone!');
    console.log('\nTo proceed, run this script with --confirm flag:');
    console.log('  node remove-duplicate-roles.js --confirm\n');
    
    // Check if --confirm flag is present
    if (process.argv.includes('--confirm')) {
      console.log('Deleting duplicate roles...\n');
      
      const deleteResult = await prisma.rbac_roles.deleteMany({
        where: {
          id: { in: duplicateRoleIds }
        }
      });
      
      console.log(`✅ Successfully deleted ${deleteResult.count} duplicate roles!`);
      
      // Show remaining roles
      console.log('\nRemaining admin-related roles:');
      console.log('------------------------------');
      const remainingRoles = await prisma.rbac_roles.findMany({
        where: {
          OR: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { display_name: { contains: 'admin', mode: 'insensitive' } }
          ]
        },
        orderBy: { id: 'asc' }
      });
      
      remainingRoles.forEach(role => {
        console.log(`  ID: ${role.id} | Name: "${role.name}" | Display: "${role.display_name}"`);
      });
      
      console.log('\n✅ Cleanup complete! The report will no longer show duplicates.');
    } else {
      console.log('❌ Aborted. No changes made.');
    }
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error removing duplicate roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeDuplicateRoles();
