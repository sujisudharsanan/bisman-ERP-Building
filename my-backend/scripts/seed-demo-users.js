const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Get passwords from environment variables
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.DEFAULT_USER_PASSWORD
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || process.env.DEFAULT_USER_PASSWORD

async function seedDemoUsers() {
  // Validate required environment variables
  if (!DEFAULT_PASSWORD) {
    console.error('❌ Missing required environment variable: DEFAULT_USER_PASSWORD')
    console.error('\nExample:')
    console.error('   DEFAULT_USER_PASSWORD=xxx node seed-demo-users.js')
    process.exit(1)
  }

  console.log('🌱 Seeding demo users...')
  
  try {
    // Hash passwords from environment variables
    const demoPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)
    const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const superAdminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)
    
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
        password: demoPassword,
        role: 'MANAGER'
      },
      {
        username: 'staff_user',
        email: 'staff@business.com',
        password: demoPassword, 
        role: 'STAFF'
      },
      {
        username: 'super_admin',
        email: 'super@bisman.local',
        password: superAdminPassword,
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
    
    console.log('\n📋 Demo users created - passwords provided via environment variables')
    console.log('===============================')
    
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
