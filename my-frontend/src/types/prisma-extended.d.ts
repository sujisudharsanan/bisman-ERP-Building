import '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    embedding: any;
    ragSource: any;
    allowedModule: any;
  }
}
