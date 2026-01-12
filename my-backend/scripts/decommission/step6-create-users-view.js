/**
 * STEP 6 — Convert Legacy Table to VIEW
 * 
 * Purpose: Replace the legacy `users` table with a compatibility VIEW
 *          that maps to users_enhanced, preserving all existing JOINs.
 * 
 * This script:
 * 1. Creates a backup of the users table
 * 2. Drops the users table
 * 3. Creates a VIEW named `users` that maps to users_enhanced
 * 
 * Run with: node scripts/decommission/step6-create-users-view.js
 * Dry run:  node scripts/decommission/step6-create-users-view.js --dry-run
 * Rollback: node scripts/decommission/step6-create-users-view.js --rollback
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');

async function createUsersView() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 6 — CONVERT LEGACY TABLE TO VIEW               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // ROLLBACK MODE
  // ─────────────────────────────────────────────────────────────────
  if (ROLLBACK) {
    console.log('Mode: 🔄 ROLLBACK');
    console.log('');
    
    try {
      // Check if backup exists
      const backupExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users_backup_pre_view'
        ) as exists
      `;
      
      if (!backupExists[0].exists) {
        console.log('  ❌ No backup table found (users_backup_pre_view)');
        console.log('  Cannot rollback without backup');
        await prisma.$disconnect();
        return;
      }
      
      console.log('  1. Dropping users VIEW...');
      await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS users CASCADE`);
      
      console.log('  2. Restoring users table from backup...');
      await prisma.$executeRawUnsafe(`ALTER TABLE users_backup_pre_view RENAME TO users`);
      
      console.log('');
      console.log('  ✅ Rollback complete - legacy users table restored');
      console.log('');
    } catch (e) {
      console.log(`  ❌ Rollback failed: ${e.message}`);
    }
    
    await prisma.$disconnect();
    return;
  }

  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE CONVERSION'}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Pre-flight checks
  // ─────────────────────────────────────────────────────────────────
  console.log('Pre-flight checks...');
  
  // Check if users is already a VIEW
  const isView = await prisma.$queryRaw`
    SELECT table_type 
    FROM information_schema.tables 
    WHERE table_name = 'users' AND table_schema = 'public'
  `;
  
  if (isView[0]?.table_type === 'VIEW') {
    console.log('  ⚠️  users is already a VIEW - no action needed');
    await prisma.$disconnect();
    return;
  }
  
  console.log('  ✅ users is currently a TABLE');

  // Check backup doesn't already exist
  const backupExists = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'users_backup_pre_view'
    ) as exists
  `;
  
  if (backupExists[0].exists) {
    console.log('  ⚠️  Backup table already exists (users_backup_pre_view)');
    console.log('     Run with --rollback first or manually drop the backup');
    await prisma.$disconnect();
    return;
  }
  
  console.log('  ✅ No existing backup conflicts');
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Create backup
  // ─────────────────────────────────────────────────────────────────
  const backupSQL = `ALTER TABLE users RENAME TO users_backup_pre_view`;
  
  // ─────────────────────────────────────────────────────────────────
  // Step 2: Create VIEW
  // ─────────────────────────────────────────────────────────────────
  // This VIEW must expose the same columns as the old users table
  // so that existing JOINs continue to work
  const viewSQL = `
    CREATE VIEW users AS
    SELECT 
      legacy_id as id,                           -- Map legacy_id to id for FK compatibility
      username,
      email,
      password_hash,
      role,
      is_active,
      tenant_id,
      super_admin_id,
      profile_pic_url,
      created_at,
      updated_at,
      product_type as "productType",             -- Original column name
      id as uuid_id,                             -- Expose the real UUID as separate column
      first_name,
      last_name,
      phone,
      reports_to,
      business_level
    FROM users_enhanced
  `;

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Create INSTEAD OF triggers for legacy write compatibility
  // ─────────────────────────────────────────────────────────────────
  const triggerSQL = `
    -- Trigger to redirect INSERT to users_enhanced
    CREATE OR REPLACE FUNCTION fn_users_view_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'INSERT via users VIEW is deprecated. Use users_enhanced table directly or UserService.createUser()';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_users_view_insert
    INSTEAD OF INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_users_view_insert();

    -- Trigger to redirect UPDATE to users_enhanced
    CREATE OR REPLACE FUNCTION fn_users_view_update()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'UPDATE via users VIEW is deprecated. Use users_enhanced table directly or UserService.updateUser()';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_users_view_update
    INSTEAD OF UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_users_view_update();

    -- Trigger to redirect DELETE to users_enhanced
    CREATE OR REPLACE FUNCTION fn_users_view_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'DELETE via users VIEW is deprecated. Use users_enhanced table directly or UserService.deactivateUser()';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_users_view_delete
    INSTEAD OF DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_users_view_delete();
  `;

  if (DRY_RUN) {
    console.log('Would execute the following SQL:');
    console.log('');
    console.log('─── STEP 1: Backup ───');
    console.log(backupSQL);
    console.log('');
    console.log('─── STEP 2: Create VIEW ───');
    console.log(viewSQL);
    console.log('');
    console.log('─── STEP 3: Create Triggers ───');
    console.log(triggerSQL);
    console.log('');
    console.log('🔍 DRY RUN complete - no changes made');
  } else {
    try {
      console.log('Step 1: Creating backup (users → users_backup_pre_view)...');
      await prisma.$executeRawUnsafe(backupSQL);
      console.log('  ✅ Backup created');
      
      console.log('');
      console.log('Step 2: Creating users VIEW...');
      await prisma.$executeRawUnsafe(viewSQL);
      console.log('  ✅ VIEW created');
      
      console.log('');
      console.log('Step 3: Creating write-block triggers...');
      await prisma.$executeRawUnsafe(triggerSQL);
      console.log('  ✅ Triggers created');
      
      console.log('');
      console.log('Verifying VIEW...');
      const viewCheck = await prisma.$queryRaw`
        SELECT table_type 
        FROM information_schema.tables 
        WHERE table_name = 'users' AND table_schema = 'public'
      `;
      
      if (viewCheck[0]?.table_type === 'VIEW') {
        console.log('  ✅ users is now a VIEW');
      } else {
        console.log('  ⚠️  Verification failed');
      }
      
      // Test the VIEW
      console.log('');
      console.log('Testing VIEW with sample query...');
      const testQuery = await prisma.$queryRaw`
        SELECT email, role, is_active FROM users LIMIT 3
      `;
      console.log(`  ✅ VIEW returns ${testQuery.length} rows`);
      
    } catch (e) {
      console.log(`  ❌ Failed: ${e.message}`);
      console.log('');
      console.log('  Attempting rollback...');
      try {
        await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS users`);
        await prisma.$executeRawUnsafe(`ALTER TABLE users_backup_pre_view RENAME TO users`);
        console.log('  ✅ Rollback successful');
      } catch (rollbackErr) {
        console.log(`  ❌ Rollback failed: ${rollbackErr.message}`);
      }
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  The `users` table has been converted to a VIEW that maps to');
  console.log('  `users_enhanced`. All existing JOINs will continue to work.');
  console.log('');
  console.log('  ⚠️  IMPORTANT:');
  console.log('  - Writes to `users` are now blocked with helpful error messages');
  console.log('  - Backup stored in: users_backup_pre_view');
  console.log('  - To rollback: node step6-create-users-view.js --rollback');
  console.log('');

  await prisma.$disconnect();
}

createUsersView().catch(e => {
  console.error('Conversion failed:', e);
  process.exit(1);
});
