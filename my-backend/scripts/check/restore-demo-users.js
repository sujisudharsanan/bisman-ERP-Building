const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get passwords from environment variables
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD;
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  // Validate required environment variables
  if (!DEFAULT_PASSWORD || !ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - Password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - Password for super admins');
    console.error('   DEFAULT_USER_PASSWORD - Password for other demo users');
    console.error('\nExample:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx DEFAULT_USER_PASSWORD=xxx node restore-demo-users.js');
    process.exit(1);
  }

  console.log('🔄 Restoring demo users...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const enterpriseHash = await bcrypt.hash(ENTERPRISE_PASSWORD, 10);
  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  // Create demo users with proper username field
  const users = [
    {
      email: 'demo_super_admin@bisman.demo',
      username: 'demo_super_admin',
      password: superAdminHash,
      role: 'SUPER_ADMIN',
      is_active: true,
    },
    {
      email: 'enterprise@bisman.erp',
      username: 'enterprise_admin',
      password: enterpriseHash,
      role: 'ENTERPRISE_ADMIN',
      is_active: true,
    },
    {
      email: 'rajesh@petrolpump.com',
      username: 'rajesh_kumar',
      password: superAdminHash,
      role: 'SUPER_ADMIN',
      is_active: true,
    },
    {
      email: 'demo_hr@bisman.demo',
      username: 'demo_hr',
      password: hashedPassword,
      role: 'HR',
      is_active: true,
    },
    {
      email: 'demo_hub_incharge@bisman.demo',
      username: 'demo_hub_incharge',
      password: hashedPassword,
      role: 'HUB_INCHARGE',
      is_active: true,
    },
  ];

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
      console.log(`✅ Created/Updated: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error.message);
    }
  }

  console.log('\n✨ Demo users restored!');
  console.log('\n📝 Passwords provided via environment variables');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
