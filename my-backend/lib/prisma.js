// Lazy Prisma loader that safely returns a shared singleton and connects once
let prismaInstance = null;
let connecting = null;

function getPrisma() {
  if (prismaInstance) return prismaInstance;
  try {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
    // Connect once; ignore errors here, callers handle availability
    if (!connecting) {
      connecting = prismaInstance.$connect().catch(() => {});
    }
    // Ensure graceful shutdown
    if (!process.listenerCount('beforeExit')) {
      process.on('beforeExit', () => {
        try { prismaInstance?.$disconnect(); } catch {}
      });
    }
  } catch (e) {
    // Prisma client not generated or package not installed; operate without DB
    prismaInstance = null;
  }
  return prismaInstance;
}

module.exports = { getPrisma };
