import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Guard: prevent accidental execution in production unless explicitly allowed
  const allowProdSeed = process.env.ALLOW_DEMO_SEED === 'true'
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && !allowProdSeed) {
    console.log('[seed] Skipping demo seed in production. Set ALLOW_DEMO_SEED=true to override.')
    return
  }

  // Use environment overrides when provided, fallback to deterministic demo values
  const aliceEmail = process.env.DEMO_ADMIN_EMAIL || 'alice@example.internal'
  const bobEmail = process.env.DEMO_MEMBER_EMAIL || 'bob@example.internal'
  const demoPasswordRaw = process.env.DEMO_USER_PASSWORD || 'changeMe!Demo123'
  const passwordHash = await bcrypt.hash(demoPasswordRaw, 10)

  await prisma.threadMembers.upsert({
    where: { threadId_userId: { threadId, userId: alice.id } },
    update: { role: 'moderator', isActive: true },
    create: { threadId, userId: alice.id, role: 'moderator' },
  })
  await prisma.threadMembers.upsert({
    where: { threadId_userId: { threadId, userId: bob.id } },
    update: { role: 'member', isActive: true },
    create: { threadId, userId: bob.id, role: 'member' },
  })
  })

  const threadId = process.env.DEMO_THREAD_ID || 'thread-demo-1'
  const exists = await prisma.thread.findUnique({ where: { id: threadId } })
  const thread = exists || await prisma.thread.create({ data: { id: threadId, title: 'Demo Thread', createdById: alice.id } })

  // Assign roles within the thread
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
  console.log('[seed] Demo credentials (hashed):', { aliceEmail, bobEmail })
}

main().catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
