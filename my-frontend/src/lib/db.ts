// Ensure runtime value import under Next.js strict settings
// Runtime-safe Prisma singleton using require to avoid TS marking import as type-only
// Declare global cache (Next.js hot reload friendly)
declare global { // eslint-disable-line no-var
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var prisma: any | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

const prismaInstance = global.prisma || new PrismaClient({
  log: ['error', 'warn']
});
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaInstance;
}

export const prisma = prismaInstance;
