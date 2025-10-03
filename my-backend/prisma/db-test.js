const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const now = await prisma.$queryRaw`select now()`
  console.log('DB now:', now)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
