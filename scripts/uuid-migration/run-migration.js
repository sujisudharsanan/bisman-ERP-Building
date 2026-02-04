#!/usr/bin/env node

/**
 * UUID Migration Runner
 * 
 * Master script to run the complete UUID migration.
 * 
 * Usage:
 *   node scripts/uuid-migration/run-migration.js [--phase <1|2|3|all>] [--execute]
 * 
 * Phases:
 *   1 - Analyze dependencies (read-only)
 *   2 - Migrate schema (converts INTEGER columns to TEXT)
 *   3 - Migrate data (converts integer values to UUIDs)
 *   all - Run all phases
 */

const { analyzeDependencies } = require('./001_analyze_dependencies');
const { migrateSchema } = require('./002_migrate_schema');
const { migrateData } = require('./003_migrate_data');

async function runMigration(phase, execute) {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         UUID STANDARDIZATION MIGRATION TOOL                    ║');
  console.log('║                                                                ║');
  console.log('║  Converting all integer user IDs to UUID format               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Phase: ${phase}`);
  console.log(`Mode: ${execute ? 'EXECUTE (changes will be applied)' : 'DRY RUN (no changes)'}\n`);

  const results = {};

  try {
    // Phase 1: Analysis
    if (phase === '1' || phase === 'all') {
      console.log('\n📊 PHASE 1: Dependency Analysis\n');
      results.phase1 = await analyzeDependencies();
    }

    // Phase 2: Schema Migration
    if (phase === '2' || phase === 'all') {
      console.log('\n🔧 PHASE 2: Schema Migration\n');
      results.phase2 = await migrateSchema(!execute);
    }

    // Phase 3: Data Migration
    if (phase === '3' || phase === 'all') {
      console.log('\n📦 PHASE 3: Data Migration\n');
      results.phase3 = await migrateData(!execute);
    }

    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRATION COMPLETE                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    if (results.phase1) {
      console.log('Phase 1 (Analysis):');
      console.log(`  Tables: ${results.phase1.summary?.totalTables || 'N/A'}`);
      console.log(`  Columns: ${results.phase1.summary?.totalColumns || 'N/A'}`);
    }
    
    if (results.phase2) {
      console.log('Phase 2 (Schema):');
      console.log(`  Successes: ${results.phase2.successes?.length || 0}`);
      console.log(`  Errors: ${results.phase2.errors?.length || 0}`);
    }
    
    if (results.phase3) {
      console.log('Phase 3 (Data):');
      console.log(`  Updated: ${results.phase3.updated || 0}`);
      console.log(`  Errors: ${results.phase3.errors || 0}`);
    }

    // Next steps
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('NEXT STEPS:');
    console.log('─────────────────────────────────────────────────────────────────\n');
    
    if (!execute) {
      console.log('1. Review the output above');
      console.log('2. Create a database backup');
      console.log('3. Run with --execute to apply changes:');
      console.log('   node scripts/uuid-migration/run-migration.js --phase all --execute\n');
    } else {
      console.log('1. Run Prisma schema introspection:');
      console.log('   cd my-backend && npx prisma db pull\n');
      console.log('2. Regenerate Prisma client:');
      console.log('   cd my-backend && npx prisma generate\n');
      console.log('3. Update backend code to remove legacy_id references');
      console.log('4. Run UUID audit scanner:');
      console.log('   node scripts/uuid-migration/uuid-audit-scanner.js --fix-suggestions\n');
      console.log('5. Test all authentication flows');
      console.log('6. Deploy to staging for validation\n');
    }

    return results;

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  let phase = 'all';
  let execute = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) {
      phase = args[i + 1];
      i++;
    }
    if (args[i] === '--execute') {
      execute = true;
    }
  }
  
  if (!['1', '2', '3', 'all'].includes(phase)) {
    console.error('Invalid phase. Use: 1, 2, 3, or all');
    process.exit(1);
  }
  
  runMigration(phase, execute)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
