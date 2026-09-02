import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances of Prisma Client in development (hot reload)
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.globalPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}

export default prisma;
