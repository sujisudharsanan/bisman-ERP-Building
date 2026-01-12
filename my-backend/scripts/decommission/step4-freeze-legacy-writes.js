/**
 * STEP 4 — Freeze Legacy Writes
 * 
 * Purpose: Prevent any further writes to the legacy `users` table
 *          to ensure no more divergence between tables.
 * 
 * This script:
 * 1. Creates a trigger to log and block INSERT/UPDATE/DELETE on users table
 * 2. Can be run in dry-run mode to see what would happen
 * 
 * Run with: node scripts/decommission/step4-freeze-legacy-writes.js
 * Dry run:  node scripts/decommission/step4-freeze-legacy-writes.js --dry-run
 * Rollback: node scripts/decommission/step4-freeze-legacy-writes.js --rollback
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');

async function freezeWrites() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 4 — FREEZE LEGACY WRITES                       ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (ROLLBACK) {
    console.log('Mode: 🔄 ROLLBACK (removing freeze)');
    console.log('');
    
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_users_write_freeze ON users;
      DROP FUNCTION IF EXISTS fn_users_write_freeze();
    `);
    
    console.log('  ✅ Freeze removed - legacy users table is now writable');
    console.log('');
    await prisma.$disconnect();
    return;
  }

  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE FREEZE'}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Create the freeze function and trigger
  // ─────────────────────────────────────────────────────────────────
  console.log('Creating write-freeze trigger on legacy users table...');
  console.log('');

  const freezeFunctionSQL = `
    CREATE OR REPLACE FUNCTION fn_users_write_freeze()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Log the blocked write attempt
      RAISE WARNING 'BLOCKED: Attempt to % legacy users table. Use users_enhanced instead. Email: %, Operation: %', 
        TG_OP, 
        COALESCE(NEW.email, OLD.email, 'unknown'),
        TG_OP;
      
      -- Block the write
      RAISE EXCEPTION 'WRITE BLOCKED: Legacy users table is frozen. All user operations must use users_enhanced table. See docs/CANONICAL_USER_RESOLUTION.md';
      
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const freezeTriggerSQL = `
    DROP TRIGGER IF EXISTS trg_users_write_freeze ON users;
    CREATE TRIGGER trg_users_write_freeze
    BEFORE INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_users_write_freeze();
  `;

  if (DRY_RUN) {
    console.log('  Would execute:');
    console.log('  ─────────────────────────────────────────');
    console.log(freezeFunctionSQL);
    console.log('  ─────────────────────────────────────────');
    console.log(freezeTriggerSQL);
    console.log('  ─────────────────────────────────────────');
    console.log('');
    console.log('  🔍 DRY RUN complete - no changes made');
  } else {
    try {
      await prisma.$executeRawUnsafe(freezeFunctionSQL);
      await prisma.$executeRawUnsafe(freezeTriggerSQL);
      console.log('  ✅ Freeze trigger created successfully');
      console.log('');
      
      // Verify
      console.log('Verifying trigger exists...');
      const triggers = await prisma.$queryRaw`
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
          AND trigger_name = 'trg_users_write_freeze'
      `;
      
      if (triggers.length > 0) {
        console.log('  ✅ Trigger verified: trg_users_write_freeze is active');
      } else {
        console.log('  ⚠️  WARNING: Trigger may not be active');
      }
    } catch (e) {
      console.log(`  ❌ Failed: ${e.message}`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    NEXT STEPS                                 ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  1. Update all code that writes to `users` table');
  console.log('  2. Run step5-refactor-auth.js to remove fallback');
  console.log('  3. Test login thoroughly');
  console.log('');
  console.log('  To rollback: node step4-freeze-legacy-writes.js --rollback');
  console.log('');

  await prisma.$disconnect();
}

freezeWrites().catch(e => {
  console.error('Freeze failed:', e);
  process.exit(1);
});
