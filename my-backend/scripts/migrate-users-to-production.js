#!/usr/bin/env node
/**
 * Migrate Local Users to Production Database
 * 
 * Usage:
 *   PRODUCTION_DATABASE_URL="your_railway_db_url" node scripts/migrate-users-to-production.js
 * 
 * Or set in .env.production file and run:
 *   node scripts/migrate-users-to-production.js --production
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Default password for migrated users (they should change it)
const DEFAULT_PASSWORD = 'Demo@123';

// Users to migrate (from local database)
const usersToMigrate = [
  { email: 'rajesh.verma@bisman.demo', username: 'rajesh_verma', role: 'CFO', name: 'Rajesh Verma' },
  { email: 'meera.singh@bisman.demo', username: 'meera_singh', role: 'FINANCE_CONTROLLER', name: 'Meera Singh' },
  { email: 'vikram.reddy@bisman.demo', username: 'vikram_reddy', role: 'OPERATIONS_MANAGER', name: 'Vikram Reddy' },
  { email: 'arun.kumar@bisman.demo', username: 'arun_kumar', role: 'HUB_INCHARGE', name: 'Arun Kumar' },
  { email: 'priya.sharma@bisman.demo', username: 'priya_sharma', role: 'HR_MANAGER', name: 'Priya Sharma' },
  { email: 'amit.patel@bisman.demo', username: 'amit_patel', role: 'PROCUREMENT_OFFICER', name: 'Amit Patel' },
  { email: 'suresh.yadav@bisman.demo', username: 'suresh_yadav', role: 'STORE_INCHARGE', name: 'Suresh Yadav' },
  { email: 'kavita.iyer@bisman.demo', username: 'kavita_iyer', role: 'COMPLIANCE_OFFICER', name: 'Kavita Iyer' },
  { email: 'deepak.mishra@bisman.demo', username: 'deepak_mishra', role: 'LEGAL_HEAD', name: 'Deepak Mishra' },
  { email: 'rohit.desai@bisman.demo', username: 'rohit_desai', role: 'ACCOUNTS_PAYABLE', name: 'Rohit Desai' },
  { email: 'admin@eazymiles.com', username: 'eazymiles_admin', role: 'ADMIN', name: 'EazyMiles Admin' },
  { email: 'finance@eazymiles.com', username: 'eazy_finance', role: 'FINANCE_CONTROLLER', name: 'EazyMiles Finance' },
  { email: 'hr@eazymiles.com', username: 'eazy_hr', role: 'HR_MANAGER', name: 'EazyMiles HR' },
  { email: 'operations@eazymiles.com', username: 'eazy_ops', role: 'OPERATIONS_MANAGER', name: 'EazyMiles Operations' },
  { email: 'staff1@eazymiles.com', username: 'eazy_staff1', role: 'STAFF', name: 'EazyMiles Staff 1' },
  { email: 'staff2@eazymiles.com', username: 'eazy_staff2', role: 'STAFF', name: 'EazyMiles Staff 2' },
];

// Enterprise Admin to migrate
const enterpriseAdmin = {
  email: 'enterprise@bisman.erp',
  name: 'Enterprise Admin',
  password: 'enterprise123', // Keep original password
};

async function migrateUsers() {
  // Get production database URL
  const prodDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!prodDbUrl) {
    console.error('❌ ERROR: No database URL provided!');
    console.log('\nUsage:');
    console.log('  PRODUCTION_DATABASE_URL="postgresql://..." node scripts/migrate-users-to-production.js');
    process.exit(1);
  }

  console.log('🚀 Migrating users to production database...');
  console.log('📍 Database URL:', prodDbUrl.replace(/:[^:@]+@/, ':****@')); // Hide password

  const prisma = new PrismaClient({
    datasources: {
      db: { url: prodDbUrl }
    }
  });

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to production database\n');

    // Hash default password
    const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    // Migrate users
    console.log('📦 Migrating users table...');
    let usersCreated = 0;
    let usersSkipped = 0;

    for (const user of usersToMigrate) {
      try {
        await prisma.$executeRaw`
          INSERT INTO users (email, username, password_hash, role, name, is_active, created_at, updated_at)
          VALUES (${user.email}, ${user.username}, ${defaultHash}, ${user.role}, ${user.name}, true, NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET 
            username = ${user.username},
            role = ${user.role},
            name = ${user.name},
            is_active = true,
            updated_at = NOW()
        `;
        console.log(`  ✅ ${user.email} (${user.role})`);
        usersCreated++;
      } catch (e) {
        console.log(`  ⚠️ ${user.email}: ${e.message}`);
        usersSkipped++;
      }
    }

    // Migrate Enterprise Admin
    console.log('\n📦 Migrating enterprise_admins table...');
    try {
      const adminHash = await bcrypt.hash(enterpriseAdmin.password, 10);
      await prisma.$executeRaw`
        INSERT INTO enterprise_admins (email, name, password_hash, is_active, created_at, updated_at)
        VALUES (${enterpriseAdmin.email}, ${enterpriseAdmin.name}, ${adminHash}, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET 
          name = ${enterpriseAdmin.name},
          password_hash = ${adminHash},
          is_active = true,
          updated_at = NOW()
      `;
      console.log(`  ✅ ${enterpriseAdmin.email} (Enterprise Admin)`);
    } catch (e) {
      console.log(`  ⚠️ Enterprise Admin: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   Users Created/Updated: ${usersCreated}`);
    console.log(`   Users Skipped: ${usersSkipped}`);
    console.log(`   Enterprise Admins: 1`);
    console.log('='.repeat(50));
    console.log('\n🔑 Default password for all users: Demo@123');
    console.log('🔑 Enterprise Admin password: enterprise123');
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUsers();
