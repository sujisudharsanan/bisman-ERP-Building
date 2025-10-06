const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedDemoUsers() {
  console.log('🌱 Seeding demo users...')
  
  try {
    // Hash passwords
    const demoPassword = await bcrypt.hash('Demo@123', 10)
    const adminPassword = await bcrypt.hash('changeme', 10)
    const managerPassword = await bcrypt.hash('manager123', 10)
    const staffPassword = await bcrypt.hash('staff123', 10)
    
    // Demo users to create
    const demoUsers = [
      {
        username: 'demo_user',
        email: 'demo@bisman.local',
        password: demoPassword,
        role: 'USER'
      },
      {
        username: 'admin_user', 
        email: 'admin@bisman.local',
        password: adminPassword,
        role: 'ADMIN'
      },
      {
        username: 'manager_user',
        email: 'manager@business.com', 
        password: managerPassword,
        role: 'MANAGER'
      },
      {
        username: 'staff_user',
        email: 'staff@business.com',
        password: staffPassword, 
        role: 'STAFF'
      },
      {
        username: 'super_admin',
        email: 'super@bisman.local',
        password: adminPassword,
        role: 'SUPER_ADMIN'
      }
    ]
    
    // Create users (upsert to avoid duplicates)
    for (const userData of demoUsers) {
      try {
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {
            password: userData.password,
            role: userData.role,
            updatedAt: new Date()
          },
          create: userData
        })
        console.log(`✅ Created/Updated user: ${user.email} (${user.role})`)
      } catch (userError) {
        console.log(`⚠️ User ${userData.email} already exists or error:`, userError.message)
      }
    }
    
    console.log('\n📋 Demo Credentials Available:')
    console.log('===============================')
    console.log('🔑 Demo User:')
    console.log('   Email: demo@bisman.local')
    console.log('   Password: Demo@123')
    console.log('')
    console.log('🔑 Admin User:')
    console.log('   Email: admin@bisman.local')
    console.log('   Password: changeme')
    console.log('')
    console.log('🔑 Manager User:')
    console.log('   Email: manager@business.com')
    console.log('   Password: manager123')
    console.log('')
    console.log('🔑 Staff User:')
    console.log('   Email: staff@business.com')
    console.log('   Password: staff123')
    console.log('')
    console.log('🔑 Super Admin:')
    console.log('   Email: super@bisman.local')
    console.log('   Password: changeme')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error seeding demo users:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      console.log('✅ Demo users seeded successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Failed to seed demo users:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { seedDemoUsers }
