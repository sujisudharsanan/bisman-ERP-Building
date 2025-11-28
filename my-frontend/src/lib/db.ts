// Use a namespace import so PrismaClient is available as a runtime value
import * as PrismaPkg from '@prisma/client';

type PrismaClient = PrismaPkg.PrismaClient;
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaPkg.PrismaClient({
  log: ['error', 'warn']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
