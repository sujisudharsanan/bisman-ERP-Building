// Lazy Prisma loader that safely returns null when the client isn't generated yet
let prismaInstance = null;

function getPrisma() {
  if (prismaInstance !== null) return prismaInstance;
  try {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  } catch (e) {
    // Prisma client not generated or package not installed; operate without DB
    prismaInstance = null;
  }
  return prismaInstance;
}

module.exports = { getPrisma };
