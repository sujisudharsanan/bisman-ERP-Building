import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.internal' },
    update: {},
    create: { email: 'alice@example.internal', username: 'alice', password: 'password123', role: 'admin' },
  })
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.internal' },
    update: {},
    create: { email: 'bob@example.internal', username: 'bob', password: 'password123', role: 'member' },
  })

  const threadId = 'thread-demo-1'
  const exists = await prisma.thread.findUnique({ where: { id: threadId } })
  const thread = exists || await prisma.thread.create({ data: { id: threadId, title: 'Demo Thread', createdById: alice.id } })

  await prisma.threadMember.upsert({
    where: { threadId_userId: { threadId, userId: alice.id } },
    update: { role: 'moderator', isActive: true },
    create: { threadId, userId: alice.id, role: 'moderator' },
  })
  await prisma.threadMember.upsert({
    where: { threadId_userId: { threadId, userId: bob.id } },
    update: { role: 'member', isActive: true },
    create: { threadId, userId: bob.id, role: 'member' },
  })

  console.log('Seed complete:', { alice: alice.id, bob: bob.id, thread: thread.id })
}

main().catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
