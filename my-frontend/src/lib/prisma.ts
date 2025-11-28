// Runtime-safe Prisma singleton (avoid type-only import issues in Next build)
import type { PrismaClient as PrismaClientType } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');

const globalForPrisma = global as unknown as { prisma?: PrismaClientType };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
