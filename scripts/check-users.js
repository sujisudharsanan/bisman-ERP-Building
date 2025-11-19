const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({ 
      select: { id: true, username: true, email: true, role: true }, 
      take: 20 
    });
    console.log('=== USERS IN DATABASE ===');
    console.log(JSON.stringify(users, null, 2));
    
    const roles = await prisma.role.findMany({ 
      select: { id: true, name: true }, 
      take: 20 
    }).catch(() => []);
    console.log('\n=== ROLES IN DATABASE ===');
    console.log(JSON.stringify(roles, null, 2));
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
