const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check enterprise admin
  try {
    const ea = await prisma.enterprise_admins.findFirst({ select: { id: true, email: true, name: true } });
    console.log('Enterprise Admin:', JSON.stringify(ea));
  } catch (e) {
    console.log('Error with enterprise_admins:', e.message);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
