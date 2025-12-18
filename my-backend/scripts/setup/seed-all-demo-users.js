const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get passwords from environment variables (required for security)
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  // Validate required environment variables
  if (!ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - Password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - Password for super admins');
    console.error('\nExample:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx node seed-all-demo-users.js');
    process.exit(1);
  }

  console.log('🔄 Creating admin users...');

  const adminUsers = [
    { email: 'enterprise@bisman.erp', username: 'enterprise_admin', password: ENTERPRISE_PASSWORD, role: 'ENTERPRISE_ADMIN' },
    { email: 'business_superadmin@bisman.demo', username: 'business_superadmin', password: SUPER_ADMIN_PASSWORD, role: 'SUPER_ADMIN' },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const user of adminUsers) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          password: hashedPassword,
          role: user.role,
          is_active: true,
        },
        create: {
          email: user.email,
          username: user.username,
          password: hashedPassword,
          role: user.role,
          is_active: true,
        },
      });
      
      console.log(`✅ ${user.email} (${user.role})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✨ Admin users seed complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('\n📝 Users created - passwords provided via environment variables');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
