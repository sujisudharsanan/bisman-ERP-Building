const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Checking for Enterprise Admin in database...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'enterprise@bisman.erp' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log('✅ Enterprise Admin FOUND in database:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ Enterprise Admin NOT FOUND in database');
      console.log('Need to run seed script: node seed-demo-data.js');
    }
    
    // Also count total users
    const totalUsers = await prisma.user.count();
    console.log(`\nTotal users in database: ${totalUsers}`);
    
    // List all users
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true
      }
    });
    
    console.log('\n📋 All users in database:');
    allUsers.forEach((u, idx) => {
      console.log(`${idx + 1}. ${u.email} (${u.role})`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
