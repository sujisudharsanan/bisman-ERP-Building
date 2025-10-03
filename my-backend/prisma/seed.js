const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function main() {
  // Ensure roles exist
  // requested roles: admin, manager, supervisors, hub incharge, accounts, banker
  const roleNames = ['ADMIN', 'MANAGER', 'SUPERVISORS', 'HUB_INCHARGE', 'ACCOUNTS', 'BANKER', 'USER']
  for (const rn of roleNames) {
    await prisma.role.upsert({
      where: { name: rn },
      update: {},
      create: { name: rn }
    })
  }

  const users = [
    { email: 'admin@bisman.local', name: 'Admin User', password: 'changeme', role: 'ADMIN' },
    { email: 'manager@bisman.local', name: 'Manager User', password: 'changeme', role: 'MANAGER' },
    { email: 'supervisor@bisman.local', name: 'Supervisor', password: 'changeme', role: 'SUPERVISORS' },
    { email: 'hub@bisman.local', name: 'Hub Incharge', password: 'changeme', role: 'HUB_INCHARGE' },
    { email: 'accounts@bisman.local', name: 'Accounts', password: 'changeme', role: 'ACCOUNTS' },
    { email: 'banker@bisman.local', name: 'Banker', password: 'changeme', role: 'BANKER' },
    { email: 'demo@bisman.local', name: 'Demo Account', password: 'Demo@123', role: 'USER' }
  ]

  const prepared = await Promise.all(users.map(async (u) => {
    const hashed = await bcrypt.hash(u.password, 10)
    const roleRecord = await prisma.role.findUnique({ where: { name: u.role } })
    return { email: u.email, name: u.name, password: hashed, roleId: roleRecord.id }
  }))

  // Use createMany with mapped roleId; skip duplicates by unique email
  await prisma.user.createMany({
    data: prepared,
    skipDuplicates: true
  })

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
