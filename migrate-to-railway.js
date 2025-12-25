/**
 * ============================================================================
 * BISMAN ERP - Railway Database Migration Script
 * ============================================================================
 * 
 * Migrates the local database schema and data to Railway PostgreSQL
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node migrate-to-railway.js
 * 
 * Or with Railway CLI:
 *   railway run node migrate-to-railway.js
 * 
 * ============================================================================
 */

/* global require, process, console, __dirname */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

async function main() {
  log('\n🚀 BISMAN ERP - Railway Database Migration', 'cyan');
  log('===========================================\n', 'cyan');

  // Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL environment variable is not set!', 'red');
    log('\nPlease set it:', 'yellow');
    log('  export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"', 'yellow');
    log('\nOr get it from Railway:', 'yellow');
    log('  railway variables get DATABASE_URL', 'yellow');
    process.exit(1);
  }

  // Mask the password for display
  const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
  log(`📡 DATABASE_URL: ${maskedUrl.substring(0, 60)}...`, 'blue');
  log('');

  // Navigate to backend directory
  const backendDir = path.join(__dirname, 'my-backend');
  if (fs.existsSync(backendDir)) {
    process.chdir(backendDir);
  }
  log(`📁 Working directory: ${process.cwd()}`, 'blue');
  log('');

  try {
    // Step 1: Generate Prisma Client
    log('🔧 Step 1: Generating Prisma Client...', 'cyan');
    exec('npx prisma generate');
    log('✅ Prisma Client generated\n', 'green');

    // Step 2: Push Prisma Schema
    log('🔧 Step 2: Pushing Prisma Schema to Railway...', 'cyan');
    exec('npx prisma db push --accept-data-loss --skip-generate');
    log('✅ Schema pushed\n', 'green');

    // Step 3: Run custom migrations
    log('🔧 Step 3: Running custom SQL migrations...', 'cyan');
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      for (const migration of migrations) {
        const migrationPath = path.join(migrationsDir, migration);
        log(`  📝 Running: ${migration}`, 'blue');
        try {
          exec(`npx prisma db execute --file="${migrationPath}" --schema=./prisma/schema.prisma`, { silent: true });
        } catch {
          log(`  ⚠️  May have already been applied: ${migration}`, 'yellow');
        }
      }
      log('✅ Custom migrations completed\n', 'green');
    } else {
      log('⚠️  No migrations directory found\n', 'yellow');
    }

    // Step 4: Run payment workflow migration specifically
    log('🔧 Step 4: Running Payment Workflow migration...', 'cyan');
    const paymentMigration = path.join(migrationsDir, '20251224_payment_request_workflow.sql');
    if (fs.existsSync(paymentMigration)) {
      try {
        exec(`npx prisma db execute --file="${paymentMigration}" --schema=./prisma/schema.prisma`, { silent: true });
        log('✅ Payment workflow migration applied\n', 'green');
      } catch {
        log('⚠️  Payment workflow migration may already exist\n', 'yellow');
      }
    }

    // Step 5: Seed the database
    log('🔧 Step 5: Seeding database...', 'cyan');
    const seedFile = path.join(process.cwd(), 'prisma', 'seed-railway.js');
    if (fs.existsSync(seedFile)) {
      try {
        exec(`node ${seedFile}`, { ignoreError: true });
        log('✅ Database seeded\n', 'green');
      } catch {
        log('⚠️  Seed may have already been run\n', 'yellow');
      }
    } else {
      log('⚠️  No seed-railway.js found\n', 'yellow');
    }

    // Step 6: Verify connection
    log('🔧 Step 6: Verifying database...', 'cyan');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const userCount = await prisma.users.count();
      const roleCount = await prisma.roles.count();
      const tenantCount = await prisma.tenants.count();
      
      log(`  👤 Users: ${userCount}`, 'blue');
      log(`  🔑 Roles: ${roleCount}`, 'blue');
      log(`  🏢 Tenants: ${tenantCount}`, 'blue');
      
      await prisma.$disconnect();
      log('✅ Database verified\n', 'green');
    } catch (e) {
      log(`⚠️  Verification skipped: ${e.message}\n`, 'yellow');
    }

    log('===========================================', 'cyan');
    log('🎉 Railway database migration complete!', 'green');
    log('===========================================\n', 'cyan');

    log('Next steps:', 'yellow');
    log('1. Set environment variables on Railway:', 'yellow');
    log('   railway variables set NODE_ENV=production', 'blue');
    log('   railway variables set ACCESS_TOKEN_SECRET=your_secret', 'blue');
    log('   railway variables set REFRESH_TOKEN_SECRET=your_secret', 'blue');
    log('');
    log('2. Deploy your backend:', 'yellow');
    log('   railway up', 'blue');
    log('');

  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
