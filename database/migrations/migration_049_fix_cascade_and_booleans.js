/* eslint-env node */
/**
 * Migration 049: Fix CASCADE DELETE Rules & Nullable Booleans
 * =============================================================
 * 
 * PURPOSE:
 * 1. Change CASCADE DELETE to RESTRICT for critical tables
 * 2. Add NOT NULL DEFAULT false to boolean columns
 * 3. Mark role_page_access as LEGACY
 * 
 * @migration 049
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 049: Fixing CASCADE Rules & Nullable Booleans...\n');
  
  try {
    // =========================================================================
    // STEP 1: Fix Critical CASCADE DELETE Rules
    // =========================================================================
    console.log('STEP 1: Reviewing CASCADE DELETE rules...');
    
    // Get all CASCADE DELETE foreign keys
    const cascadeRules = await pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND rc.delete_rule = 'CASCADE'
      ORDER BY tc.table_name
    `);
    
    console.log(`   Found ${cascadeRules.rows.length} CASCADE DELETE rules`);
    
    // Critical tables that should NOT have CASCADE DELETE
    const criticalTables = [
      'audit_logs', 'security_access_log', 'security_events',
      'subscription_invoices', 'payment_activity_logs',
      'approval_audit_log', 'workflow_audit',
      'admin_page_assignments', 'role_page_access'
    ];
    
    let fixed = 0;
    for (const rule of cascadeRules.rows) {
      if (criticalTables.includes(rule.table_name) || 
          rule.table_name.includes('audit') || 
          rule.table_name.includes('invoice') ||
          rule.table_name.includes('payment')) {
        
        try {
          // Drop and recreate with RESTRICT
          await pool.query(`
            ALTER TABLE ${rule.table_name} 
            DROP CONSTRAINT IF EXISTS ${rule.constraint_name}
          `);
          
          await pool.query(`
            ALTER TABLE ${rule.table_name}
            ADD CONSTRAINT ${rule.constraint_name}
            FOREIGN KEY (${rule.column_name})
            REFERENCES ${rule.foreign_table_name}(id)
            ON DELETE RESTRICT
          `);
          
          console.log(`   ✅ Changed ${rule.table_name}.${rule.column_name} to RESTRICT`);
          fixed++;
        } catch (e) {
          // May fail if structure is different - that's OK
          console.log(`   ⚠️  Could not fix ${rule.table_name}: ${e.message.slice(0, 50)}`);
        }
      }
    }
    
    console.log(`   Fixed ${fixed} CASCADE rules to RESTRICT`);
    
    // =========================================================================
    // STEP 2: Fix Nullable Boolean Columns
    // =========================================================================
    console.log('\nSTEP 2: Fixing nullable boolean columns...');
    
    // Get nullable boolean columns
    const nullableBooleans = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE data_type = 'boolean' 
        AND is_nullable = 'YES'
        AND table_schema = 'public'
        AND column_name IN ('is_active', 'is_deleted', 'approved', 'enabled', 
                           'is_default', 'is_mandatory', 'is_compulsory',
                           'show_in_sidebar', 'can_view', 'can_edit', 'can_delete')
      ORDER BY table_name
    `);
    
    console.log(`   Found ${nullableBooleans.rows.length} security-relevant nullable booleans`);
    
    let boolFixed = 0;
    for (const col of nullableBooleans.rows) {
      try {
        // First update NULLs to false
        await pool.query(`
          UPDATE ${col.table_name} 
          SET ${col.column_name} = false 
          WHERE ${col.column_name} IS NULL
        `);
        
        // Then set NOT NULL with default
        await pool.query(`
          ALTER TABLE ${col.table_name}
          ALTER COLUMN ${col.column_name} SET DEFAULT false
        `);
        
        await pool.query(`
          ALTER TABLE ${col.table_name}
          ALTER COLUMN ${col.column_name} SET NOT NULL
        `);
        
        console.log(`   ✅ Fixed ${col.table_name}.${col.column_name}`);
        boolFixed++;
      } catch (e) {
        console.log(`   ⚠️  Could not fix ${col.table_name}.${col.column_name}: ${e.message.slice(0, 50)}`);
      }
    }
    
    console.log(`   Fixed ${boolFixed} boolean columns`);
    
    // =========================================================================
    // STEP 3: Mark role_page_access as LEGACY
    // =========================================================================
    console.log('\nSTEP 3: Marking role_page_access as LEGACY...');
    
    await pool.query(`
      COMMENT ON TABLE role_page_access IS 
      'LEGACY TABLE — DO NOT USE FOR AUTHORIZATION. Use admin_page_assignments instead. This table is READ-ONLY for backward compatibility.'
    `);
    
    // Add legacy flag column if not exists
    const hasLegacyFlag = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'role_page_access' AND column_name = 'is_legacy'
    `);
    
    if (hasLegacyFlag.rows.length === 0) {
      await pool.query(`
        ALTER TABLE role_page_access 
        ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT true
      `);
    }
    
    console.log('   ✅ role_page_access marked as LEGACY');
    
    // =========================================================================
    // STEP 4: Create trigger to prevent writes to legacy table
    // =========================================================================
    console.log('\nSTEP 4: Creating write prevention trigger...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION prevent_legacy_table_write()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Allow if explicitly bypassed (for migration scripts)
        IF current_setting('app.allow_legacy_write', true) = 'true' THEN
          RETURN NEW;
        END IF;
        
        RAISE EXCEPTION 'role_page_access is LEGACY. Use admin_page_assignments instead.';
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if trigger exists
    const triggerExists = await pool.query(`
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'tr_prevent_role_page_access_write'
    `);
    
    if (triggerExists.rows.length === 0) {
      await pool.query(`
        CREATE TRIGGER tr_prevent_role_page_access_write
        BEFORE INSERT OR UPDATE ON role_page_access
        FOR EACH ROW
        EXECUTE FUNCTION prevent_legacy_table_write()
      `);
      console.log('   ✅ Write prevention trigger created');
    } else {
      console.log('   ℹ️  Write prevention trigger already exists');
    }
    
    // =========================================================================
    // STEP 5: Verification
    // =========================================================================
    console.log('\nSTEP 5: Verification...');
    
    // Check remaining CASCADE rules on critical tables
    const remainingCascade = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
      WHERE rc.delete_rule = 'CASCADE'
        AND (tc.table_name LIKE '%audit%' 
             OR tc.table_name LIKE '%invoice%' 
             OR tc.table_name LIKE '%payment%')
    `);
    console.log(`   ⚠️  Remaining CASCADE on critical tables: ${remainingCascade.rows[0].count}`);
    
    // Check nullable booleans
    const remainingNullable = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE data_type = 'boolean' 
        AND is_nullable = 'YES'
        AND column_name IN ('is_active', 'is_deleted', 'approved', 'enabled')
    `);
    console.log(`   ⚠️  Remaining nullable security booleans: ${remainingNullable.rows[0].count}`);
    
    console.log('\n✅ Migration 049 completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
