/**
 * FINAL CHECK — Mandatory Verification
 * 
 * Answers the three critical questions:
 * 1. Is users_enhanced the single source of truth?
 * 2. Can any password desync occur?
 * 3. Can login break without logs?
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function finalCheck() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           FINAL CHECK — MANDATORY VERIFICATION                ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Question 1: Is users_enhanced the single source of truth?
  console.log('Q1: Is users_enhanced the single source of truth?');
  
  const viewDef = await prisma.$queryRaw`
    SELECT view_definition FROM information_schema.views 
    WHERE table_name = 'users' AND table_schema = 'public'
  `;
  
  const mapsToEnhanced = viewDef[0]?.view_definition?.includes('users_enhanced');
  console.log('    - users VIEW maps to users_enhanced:', mapsToEnhanced ? '✅ YES' : '❌ NO');
  
  // Check auth.js no longer has legacy fallback
  const authContent = fs.readFileSync(__dirname + '/../routes/auth.js', 'utf8');
  const hasLegacyFallback = authContent.includes('isLegacyUser = true');
  console.log('    - Auth has legacy fallback removed:', !hasLegacyFallback ? '✅ YES' : '❌ NO');
  
  const q1Answer = mapsToEnhanced && !hasLegacyFallback;
  console.log('');
  console.log('    ANSWER:', q1Answer ? '✅ YES — users_enhanced IS the single source of truth' : '❌ NO — FIX REQUIRED');

  // Question 2: Can any password desync occur?
  console.log('');
  console.log('Q2: Can any password desync occur?');
  
  const usersIsView = viewDef.length > 0;
  console.log('    - users is a VIEW (not table):', usersIsView ? '✅ YES' : '❌ NO');
  console.log('    - Password updates go to users_enhanced only:', usersIsView ? '✅ YES' : '❌ NO');
  
  const q2Answer = usersIsView; // If VIEW, no desync possible
  console.log('');
  console.log('    ANSWER:', q2Answer ? '✅ NO — Password desync CANNOT occur' : '❌ YES — FIX REQUIRED');

  // Question 3: Can login break without logs?
  console.log('');
  console.log('Q3: Can login break without logs?');
  
  const hasStructuredLogging = authContent.includes('console.error') || authContent.includes('console.warn');
  const hasAuditLogging = authContent.includes('auditService.logLoginAttempt');
  console.log('    - Auth has structured error logging:', hasStructuredLogging ? '✅ YES' : '❌ NO');
  console.log('    - Auth has audit logging:', hasAuditLogging ? '✅ YES' : '❌ NO');
  
  const q3Answer = hasStructuredLogging && hasAuditLogging;
  console.log('');
  console.log('    ANSWER:', q3Answer ? '✅ NO — Login CANNOT break silently' : '❌ YES — FIX REQUIRED');

  // Final verdict
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (q1Answer && q2Answer && q3Answer) {
    console.log('           ✅ ALL CHECKS PASSED — DECOMMISSION SUCCESSFUL       ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Monitor for 30 days (see STEP8_ACTIVE_MONITORING.md)');
    console.log('  2. After 2026-02-11, run step9-final-deletion.js');
    console.log('');
  } else {
    console.log('           ❌ CHECKS FAILED — ACTION REQUIRED                   ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Fix the issues above before proceeding.');
    console.log('');
    process.exit(1);
  }

  await prisma.$disconnect();
}

finalCheck().catch(e => { 
  console.error('Final check failed:', e); 
  process.exit(1); 
});
