const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function fixSuperAdminDuplicate() {
  try {
    console.log('=== FIXING SUPER_ADMIN DUPLICATE ===\n');
    
    // Find users with lowercase "super_admin" role
    const usersWithLowercaseRole = await prisma.user.findMany({
      where: { role: 'super_admin' },
      select: { id: true, username: true, email: true, role: true }
    });
    
    console.log('Users with lowercase "super_admin" role:');
    usersWithLowercaseRole.forEach(u => {
      console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}`);
    });
    
    if (usersWithLowercaseRole.length > 0) {
      console.log('\n=== UPDATING USERS TO USE "SUPER_ADMIN" ===');
      for (const user of usersWithLowercaseRole) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'SUPER_ADMIN' }
        });
        console.log(`✅ Updated user "${user.username}" (ID: ${user.id}) from "super_admin" to "SUPER_ADMIN"`);
      }
    }
    
    // Find the lowercase super_admin role in roles table
    const lowercaseRole = await prisma.role.findFirst({
      where: { name: 'super_admin' }
    });
    
    if (lowercaseRole) {
      console.log(`\n=== DELETING LOWERCASE ROLE ===`);
      console.log(`Found role: ID ${lowercaseRole.id}, Name: "${lowercaseRole.name}"`);
      
      await prisma.role.delete({
        where: { id: lowercaseRole.id }
      });
      console.log(`✅ Deleted lowercase "super_admin" role (ID: ${lowercaseRole.id})`);
    } else {
      console.log('\n✅ No lowercase "super_admin" role found in roles table');
    }
    
    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const allRoles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    console.log('Remaining roles:');
    allRoles.forEach(r => console.log(`  - ID: ${r.id}, Name: ${r.name}`));
    
    const users = await prisma.user.findMany({
      select: { role: true },
      distinct: ['role'],
      orderBy: { role: 'asc' }
    });
    console.log('\nUnique user roles:');
    users.forEach(u => console.log(`  - ${u.role}`));
    
    const superAdminUsers = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, username: true, email: true }
    });
    console.log(`\nSUPER_ADMIN users (${superAdminUsers.length}):`);
    superAdminUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdminDuplicate();
