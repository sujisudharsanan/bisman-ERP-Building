const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Restoring demo users...');

  // Hash password: Demo@123
  const hashedPassword = await bcrypt.hash('Demo@123', 10);

  // Create demo users with proper username field
  const users = [
    {
      email: 'demo_super_admin@bisman.demo',
      username: 'demo_super_admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      is_active: true,
    },
    {
      email: 'enterprise@bisman.erp',
      username: 'enterprise_admin',
      password: await bcrypt.hash('enterprise123', 10),
      role: 'ENTERPRISE_ADMIN',
      is_active: true,
    },
    {
      email: 'rajesh@petrolpump.com',
      username: 'rajesh_kumar',
      password: await bcrypt.hash('petrol123', 10),
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
      const created = await prisma.user.upsert({
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
  console.log('\n📝 Login credentials:');
  console.log('   Email: demo_super_admin@bisman.demo');
  console.log('   Password: Demo@123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
