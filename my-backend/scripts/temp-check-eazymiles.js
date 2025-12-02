const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get Eazymiles client
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'Eazymiles', mode: 'insensitive' } },
    include: { users: { select: { id: true, username: true, email: true, role: true } } }
  });
  console.log('\n=== EAZYMILES CLIENT ===');
  console.log(JSON.stringify(client, null, 2));
  
  // Get Admin role
  const adminRole = await prisma.role.findFirst({
    where: { name: { contains: 'Admin', mode: 'insensitive' } }
  });
  console.log('\n=== ADMIN ROLE ===');
  console.log(JSON.stringify(adminRole, null, 2));
  
  // Get all roles
  const roles = await prisma.role.findMany();
  console.log('\n=== ALL ROLES ===');
  console.log(JSON.stringify(roles, null, 2));
  
  // Get users with their roles
  const users = await prisma.user.findMany({
    where: { tenant_id: client?.id },
    select: { id: true, username: true, email: true, role: true }
  });
  console.log('\n=== USERS IN EAZYMILES TENANT ===');
  console.log(JSON.stringify(users, null, 2));
  
  await prisma.$disconnect();
}
check().catch(console.error);
