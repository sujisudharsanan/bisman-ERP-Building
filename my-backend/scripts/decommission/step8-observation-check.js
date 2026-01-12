/**
 * STEP 8 — Observation Monitoring Script
 * 
 * Run this periodically during the 30-day observation window
 * to check for any issues with the decommissioned users table.
 * 
 * Usage: node step8-observation-check.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function runObservationCheck() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 8 — OBSERVATION WINDOW CHECK                   ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Calculate days elapsed
  const startFile = path.join(__dirname, 'OBSERVATION_STARTED.txt');
  let daysElapsed = 0;
  if (fs.existsSync(startFile)) {
    const startDate = new Date(fs.readFileSync(startFile, 'utf8').trim());
    const now = new Date();
    daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    console.log(`Observation Day: ${daysElapsed} of 30`);
    console.log(`Started: ${startDate.toISOString().split('T')[0]}`);
    console.log(`Target End: ${new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);
  } else {
    console.log('⚠️  No observation start marker found');
  }
  console.log('');

  const checks = [];

  // ─────────────────────────────────────────────────────────────────
  // CHECK 1: Auth still working (users_enhanced accessible)
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 1: Auth system health...');
  try {
    const userCount = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM users_enhanced WHERE is_active = true
    `;
    console.log('  Active users in users_enhanced:', userCount[0].count);
    checks.push({ check: 'Auth System', status: 'OK', activeUsers: userCount[0].count });
  } catch (e) {
    console.log('  ❌ CRITICAL:', e.message.substring(0, 60));
    checks.push({ check: 'Auth System', status: 'CRITICAL', error: e.message });
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // CHECK 2: VIEW still functional
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 2: Users VIEW health...');
  try {
    const viewCount = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM users WHERE is_active = true
    `;
    console.log('  Rows via VIEW:', viewCount[0].count);
    checks.push({ check: 'Users VIEW', status: 'OK', rowCount: viewCount[0].count });
  } catch (e) {
    console.log('  ❌ CRITICAL:', e.message.substring(0, 60));
    checks.push({ check: 'Users VIEW', status: 'CRITICAL', error: e.message });
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // CHECK 3: No password mismatches
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 3: Password consistency...');
  try {
    // Compare VIEW to enhanced (should be identical since VIEW reads from enhanced)
    const mismatchCheck = await prisma.$queryRaw`
      SELECT v.email
      FROM users v
      JOIN users_enhanced ue ON v.email = ue.email
      WHERE v.password_hash != ue.password_hash
      LIMIT 5
    `;
    if (mismatchCheck.length === 0) {
      console.log('  ✅ No password mismatches detected');
      checks.push({ check: 'Password Consistency', status: 'OK' });
    } else {
      console.log('  ❌ CRITICAL: Mismatches found:', mismatchCheck.length);
      checks.push({ check: 'Password Consistency', status: 'CRITICAL', count: mismatchCheck.length });
    }
  } catch (e) {
    console.log('  Error:', e.message.substring(0, 60));
    checks.push({ check: 'Password Consistency', status: 'ERROR', error: e.message });
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // CHECK 4: Backup table still exists
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 4: Backup integrity...');
  try {
    const backup = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name LIKE '%legacy%backup%' OR table_name LIKE '%backup%user%'
    `;
    if (backup.length > 0) {
      console.log('  ✅ Backup exists:', backup[0].table_name);
      checks.push({ check: 'Backup Integrity', status: 'OK', table: backup[0].table_name });
    } else {
      console.log('  ⚠️  No backup table found');
      checks.push({ check: 'Backup Integrity', status: 'WARNING' });
    }
  } catch (e) {
    console.log('  Error:', e.message.substring(0, 60));
    checks.push({ check: 'Backup Integrity', status: 'ERROR', error: e.message });
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // CHECK 5: Recent logins (optional - check if table exists)
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 5: Recent auth activity...');
  try {
    const recentLogins = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM users_enhanced 
      WHERE last_login > NOW() - INTERVAL '24 hours'
    `;
    console.log('  Users logged in last 24h:', recentLogins[0].count);
    checks.push({ check: 'Recent Activity', status: 'OK', last24h: recentLogins[0].count });
  } catch (e) {
    console.log('  Info: last_login column may not exist');
    checks.push({ check: 'Recent Activity', status: 'SKIP' });
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  const critical = checks.filter(c => c.status === 'CRITICAL').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;
  const ok = checks.filter(c => c.status === 'OK').length;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Day ${daysElapsed} of 30`);
  console.log(`  Critical: ${critical}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`  OK: ${ok}`);
  console.log('');

  if (critical > 0) {
    console.log('  🚨 CRITICAL ISSUES DETECTED - INVESTIGATE IMMEDIATELY');
  } else if (daysElapsed >= 30) {
    console.log('  ✅ Observation period complete - ready for Step 9');
  } else {
    console.log(`  ✅ System healthy - ${30 - daysElapsed} days remaining`);
  }
  console.log('');

  // Save log
  const logFile = path.join(__dirname, 'OBSERVATION_LOGS.json');
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  logs.push({
    timestamp: new Date().toISOString(),
    day: daysElapsed,
    checks,
    critical,
    warnings,
    ok
  });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`  Log saved to: ${logFile}`);
  console.log('');

  await prisma.$disconnect();
}

runObservationCheck().catch(e => {
  console.error('Observation check failed:', e);
  process.exit(1);
});
