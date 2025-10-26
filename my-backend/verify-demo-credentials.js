#!/usr/bin/env node
/**
 * Verify Demo Credentials in Database
 * 
 * This script checks if all demo users exist in the database
 * and reports their status.
 * 
 * Usage: node verify-demo-credentials.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying demo credentials in database...\n');

  const demoUsers = [
    { email: 'enterprise@bisman.erp', role: 'ENTERPRISE_ADMIN', name: 'Enterprise Admin' },
    { email: 'rajesh@petrolpump.com', role: 'SUPER_ADMIN', name: 'Petrol Pump Super Admin' },
    { email: 'amit@abclogistics.com', role: 'SUPER_ADMIN', name: 'Logistics Super Admin' },
    { email: 'manager@petrolpump.com', role: 'MANAGER', name: 'Petrol Pump Manager' },
    { email: 'staff@petrolpump.com', role: 'STAFF', name: 'Petrol Pump Staff' },
    { email: 'manager@abclogistics.com', role: 'MANAGER', name: 'Logistics Manager' },
    { email: 'staff@abclogistics.com', role: 'STAFF', name: 'Logistics Staff' },
  ];

  let foundCount = 0;
  let missingCount = 0;

  for (const demoUser of demoUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: demoUser.email },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          is_active: true,
        },
      });

      if (user) {
        console.log(`✅ ${demoUser.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log('');
        foundCount++;
      } else {
        console.log(`❌ ${demoUser.name}`);
        console.log(`   Email: ${demoUser.email} - NOT FOUND`);
        console.log('');
        missingCount++;
      }
    } catch (error) {
      console.log(`⚠️  Error checking ${demoUser.name}: ${error.message}`);
      console.log('');
      missingCount++;
    }
  }

  console.log('========================================');
  console.log(`Found: ${foundCount} / ${demoUsers.length}`);
  console.log(`Missing: ${missingCount} / ${demoUsers.length}`);
  console.log('========================================\n');

  if (missingCount > 0) {
    console.log('⚠️  Some demo users are missing!');
    console.log('Run the seed script to create them:');
    console.log('  node seed-demo-data.js');
    console.log('\nOr run the setup script:');
    console.log('  ./setup-demo-credentials.sh');
    process.exit(1);
  } else {
    console.log('✅ All demo credentials are present in the database!');
    console.log('\nYou can now login at /auth/login with:');
    console.log('  - enterprise@bisman.erp / enterprise123');
    console.log('  - rajesh@petrolpump.com / petrol123');
    console.log('  - amit@abclogistics.com / logistics123');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Database is running');
    console.error('2. DATABASE_URL is set in .env');
    console.error('3. Prisma schema is up to date (npx prisma generate)');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
