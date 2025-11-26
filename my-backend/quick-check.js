const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  const count = await prisma.user.count({
    where: { email: { contains: '@bisman.demo' } }
  });
  console.log(`Total users with @bisman.demo: ${count}`);
  
  if (count > 0) {
    const users = await prisma.user.findMany({
      where: { email: { contains: '@bisman.demo' } },
      select: { email: true, role: true }
    });
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  }
  
  await prisma.$disconnect();
}

quickCheck();
