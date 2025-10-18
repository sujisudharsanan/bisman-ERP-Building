// Prisma global singleton (prevents multiple clients across reloads)
let prismaInstance = globalThis.prisma || null;
let connecting = null;

function getPrisma() {
  if (prismaInstance) return prismaInstance;
  try {
    const { PrismaClient } = require('@prisma/client');
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
    // Connect once; ignore errors here, callers handle availability
    if (!connecting) {
      connecting = client.$connect().catch(() => {});
    }
    prismaInstance = client;
    // Expose globally to avoid duplicate clients in dev/HMR
    globalThis.prisma = prismaInstance;

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
