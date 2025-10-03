// my-backend/scripts/list-users.js
// One-off script to list users via Prisma Client.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

(async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, roleId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error listing users:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
