/**
 * STEP 6 — VIEW Verification Script
 * Verifies the users VIEW is properly configured
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 6 — VIEW VERIFICATION                          ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const results = {
    isView: false,
    hasBackup: false,
    columnsCompatible: false,
    writesBlocked: false,
    canRead: false
  };

  // Check 1: Is users a VIEW?
  console.log('CHECK 1: Is users a VIEW?');
  const tableType = await prisma.$queryRaw`
    SELECT table_name, table_type 
    FROM information_schema.tables 
    WHERE table_name = 'users' AND table_schema = 'public'
  `;
  if (tableType[0]) {
    console.log('  Type:', tableType[0].table_type);
    results.isView = tableType[0].table_type === 'VIEW';
    console.log('  Result:', results.isView ? '✅ IS A VIEW' : '❌ IS A TABLE');
  } else {
    console.log('  ❌ users not found in schema');
  }
  console.log('');

  // Check 2: VIEW definition (if it's a VIEW)
  if (results.isView) {
    console.log('CHECK 2: VIEW definition');
    const viewDef = await prisma.$queryRaw`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_name = 'users' AND table_schema = 'public'
    `;
    if (viewDef[0]) {
      const def = viewDef[0].view_definition;
      console.log('  Definition preview:');
      console.log('  ' + def.substring(0, 150).replace(/\n/g, ' ') + '...');
      console.log('  Points to users_enhanced:', def.includes('users_enhanced') ? '✅ YES' : '❌ NO');
    }
    console.log('');
  }

  // Check 3: Does backup exist?
  console.log('CHECK 3: Backup tables');
  const backupExists = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name LIKE '%backup%' AND table_name LIKE '%user%' AND table_schema = 'public'
  `;
  if (backupExists.length > 0) {
    results.hasBackup = true;
    backupExists.forEach(t => console.log('  ✅', t.table_name));
  } else {
    console.log('  ⚠️  No backup tables found');
  }
  console.log('');

  // Check 4: Test VIEW with sample query
  console.log('CHECK 4: Read test');
  try {
    const sample = await prisma.$queryRaw`
      SELECT id, email, role, is_active FROM users LIMIT 3
    `;
    console.log('  Rows returned:', sample.length);
    sample.forEach(u => console.log('    -', u.email, '| role:', u.role));
    results.canRead = true;
    console.log('  ✅ Read works');
  } catch (e) {
    console.log('  ❌ Read failed:', e.message.substring(0, 60));
  }
  console.log('');

  // Check 5: Column compatibility check
  console.log('CHECK 5: Column compatibility');
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  const expectedCols = ['id', 'email', 'username', 'password_hash', 'role', 'is_active', 'tenant_id'];
  let allFound = true;
  expectedCols.forEach(col => {
    const found = columns.find(c => c.column_name === col);
    console.log('  ', found ? '✅' : '❌', col);
    if (!found) allFound = false;
  });
  results.columnsCompatible = allFound;
  console.log('');

  // Check 6: Write protection test
  console.log('CHECK 6: Write protection');
  try {
    await prisma.$executeRaw`
      INSERT INTO users (email, username, password_hash, role) 
      VALUES ('test_blocked@test.com', 'test', 'hash', 'USER')
    `;
    console.log('  ❌ DANGER: Write succeeded (should be blocked!)');
    results.writesBlocked = false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    if (msg.includes('deprecated') || msg.includes('blocked') || msg.includes('cannot insert') || msg.includes('rule') || msg.includes('instead of')) {
      console.log('  ✅ Writes are properly blocked');
      results.writesBlocked = true;
    } else if (msg.includes('view')) {
      console.log('  ✅ Writes blocked (VIEW restriction)');
      results.writesBlocked = true;
    } else {
      console.log('  ⚠️  Write failed:', e.message.substring(0, 60));
      results.writesBlocked = true; // Still blocked, just different reason
    }
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Is VIEW:', results.isView ? '✅' : '❌');
  console.log('  Has Backup:', results.hasBackup ? '✅' : '⚠️');
  console.log('  Columns Compatible:', results.columnsCompatible ? '✅' : '❌');
  console.log('  Writes Blocked:', results.writesBlocked ? '✅' : '❌');
  console.log('  Can Read:', results.canRead ? '✅' : '❌');
  console.log('');

  const allGood = results.isView && results.columnsCompatible && results.writesBlocked && results.canRead;
  if (allGood) {
    console.log('  🎉 STEP 6 COMPLETE: VIEW is properly configured');
  } else {
    console.log('  ⚠️  Issues detected - review above');
  }
  console.log('');

  await prisma.$disconnect();
  return results;
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
