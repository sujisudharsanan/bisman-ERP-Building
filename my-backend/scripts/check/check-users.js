const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('\n📊 Current Users in Database:\n');
    console.log(`Total: ${users.length} users\n`);
    
    users.forEach(user => {
      console.log(`${user.id}. ${user.email.padEnd(40)} | ${user.role.padEnd(25)} | Active: ${user.is_active}`);
    });
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
