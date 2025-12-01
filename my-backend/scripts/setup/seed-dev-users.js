#!/usr/bin/env node
/**
 * Seed Development Users to Database
 * 
 * This script creates all devUsers as real database users with proper bcrypt hashing.
 * After running this, devUsers will exist in the database and work with normal authentication.
 * 
 * Usage:
 *   node seed-dev-users.js
 * 
 * Requirements:
 *   - DATABASE_URL must be set in environment
 *   - Prisma client must be generated
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// All development users to seed
const devUsers = [
  // Super Admin
  { id: 1, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN', username: 'super_admin' },
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN', username: 'super_admin_alt' },
  
  // Admin
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN', username: 'admin_business' },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN', username: 'admin_local' },
  
  // Manager
  { id: 3, email: 'manager@business.com', password: 'password', role: 'MANAGER', username: 'manager_business' },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER', username: 'manager_local' },
  
  // Staff / Hub Incharge
  { id: 4, email: 'staff@business.com', password: 'staff123', role: 'STAFF', username: 'staff_business' },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF', username: 'hub_incharge' },
  
  // Demo credentials for production testing (bisman.demo domain)
  { id: 300, email: 'demo_hub_incharge@bisman.demo', password: 'changeme', role: 'HUB_INCHARGE', username: 'demo_hub_incharge' },
  { id: 301, email: 'demo_admin@bisman.demo', password: 'changeme', role: 'ADMIN', username: 'demo_admin' },
  { id: 302, email: 'demo_manager@bisman.demo', password: 'changeme', role: 'MANAGER', username: 'demo_manager' },
  { id: 303, email: 'demo_super@bisman.demo', password: 'changeme', role: 'SUPER_ADMIN', username: 'demo_super' },

  // Finance & Operations demo users
  { id: 201, email: 'it@bisman.local', password: 'changeme', role: 'IT_ADMIN', username: 'it_admin' },
  { id: 202, email: 'cfo@bisman.local', password: 'changeme', role: 'CFO', username: 'cfo' },
  { id: 203, email: 'controller@bisman.local', password: 'changeme', role: 'FINANCE_CONTROLLER', username: 'finance_controller' },
  { id: 204, email: 'treasury@bisman.local', password: 'changeme', role: 'TREASURY', username: 'treasury' },
  { id: 205, email: 'accounts@bisman.local', password: 'changeme', role: 'ACCOUNTS', username: 'accounts' },
  { id: 206, email: 'ap@bisman.local', password: 'changeme', role: 'ACCOUNTS_PAYABLE', username: 'accounts_payable' },
  { id: 207, email: 'banker@bisman.local', password: 'changeme', role: 'BANKER', username: 'banker' },
  { id: 208, email: 'procurement@bisman.local', password: 'changeme', role: 'PROCUREMENT_OFFICER', username: 'procurement' },
  { id: 209, email: 'store@bisman.local', password: 'changeme', role: 'STORE_INCHARGE', username: 'store_incharge' },
  { id: 210, email: 'compliance@bisman.local', password: 'changeme', role: 'COMPLIANCE', username: 'compliance' },
  { id: 211, email: 'legal@bisman.local', password: 'changeme', role: 'LEGAL', username: 'legal' },
];

async function seedDevUsers() {
  console.log('🌱 Starting to seed development users...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const devUser of devUsers) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: devUser.email },
      });

      // Hash the password
      const hashedPassword = await bcrypt.hash(devUser.password, 10);

      if (existing) {
        // Update existing user
        await prisma.user.update({
          where: { email: devUser.email },
          data: {
            password: hashedPassword,
            role: devUser.role,
            username: devUser.username,
            updated_at: new Date(),
          },
        });
        console.log(`✅ Updated: ${devUser.email} (${devUser.role})`);
        updated++;
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            email: devUser.email,
            password: hashedPassword,
            role: devUser.role,
            username: devUser.username,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true,
          },
        });
        console.log(`✨ Created: ${devUser.email} (${devUser.role})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${devUser.email}:`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Created: ${created} users`);
  console.log(`   Updated: ${updated} users`);
  console.log(`   Skipped: ${skipped} users`);
  console.log(`   Errors: ${errors} users`);
  console.log(`   Total: ${devUsers.length} users processed\n`);

  if (errors === 0) {
    console.log('✅ All development users seeded successfully!\n');
    console.log('📋 You can now login with any of these credentials:');
    console.log('   • demo_hub_incharge@bisman.demo / changeme');
    console.log('   • admin@bisman.local / changeme');
    console.log('   • manager@bisman.local / changeme');
    console.log('   • super@bisman.local / changeme');
    console.log('   ... and more!\n');
  } else {
    console.log('⚠️  Some errors occurred. Check the logs above.\n');
  }
}

// Main execution
async function main() {
  console.log('🔒 Development Users Database Seeder\n');
  console.log('This will add all devUsers to your database as real users.');
  console.log('Passwords will be properly hashed with bcrypt.\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL before running this script.\n');
    console.error('Example:');
    console.error('  export DATABASE_URL="postgresql://user:pass@host:5432/db"');
    console.error('  node seed-dev-users.js\n');
    process.exit(1);
  }

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Run seeding
    await seedDevUsers();

    // Verify
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users in database: ${totalUsers}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
