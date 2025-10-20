const { PrismaClient } = require('./my-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    console.log('=== ROLES IN DATABASE ===');
    roles.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}`));
    
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true },
      orderBy: { role: 'asc' }
    });
    console.log('\n=== USERS AND THEIR ROLES ===');
    
    const byRole = {};
    users.forEach(u => {
      if (!byRole[u.role]) byRole[u.role] = [];
      byRole[u.role].push(u.username);
    });
    
    console.log('\n=== USERS GROUPED BY ROLE ===');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`${role}: ${byRole[role].join(', ')} (${byRole[role].length} users)`);
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
